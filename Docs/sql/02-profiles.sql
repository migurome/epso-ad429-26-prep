-- 02 — Perfiles: quién puede entrar, y quién manda.
--
-- Registrarse deja de dar acceso. Quien se registra cae en la cola, en
-- `pending`, y sólo un administrador lo pasa a `approved`.
--
-- ANTES DE EJECUTARLO: pon tu correo en `admin_email()`, unas líneas más abajo.
-- Es lo único que hay que editar en este fichero.
--
-- Da igual el orden: se puede ejecutar antes o después de crear la cuenta en la
-- web. Si la cuenta ya existe, el paso 5 la nombra administradora; si se crea
-- después, el disparador del paso 2 la nombra al registrarse. Esa es la razón
-- de que el correo esté en una función y no repetido en dos sitios.
--
-- Y se puede volver a ejecutar entero sin romper nada.

-- ── 0. El correo del administrador ────────────────────────────────────────
-- En un solo sitio, y comparado con `lower(trim(...))` en todas partes: pegar
-- un correo con un espacio delante no da ningún error, simplemente no
-- encuentra a nadie, y eso no se nota hasta que alguien intenta aprobar a
-- alguien. Pasó en el primer intento de este fichero.
create or replace function public.admin_email() returns text
  language sql immutable as $$ select 'migurome@ucm.es' $$;

-- ── 1. La tabla ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  email      text not null default '',
  role       text not null default 'candidate' check (role in ('candidate', 'admin')),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users on delete set null
);

-- ── 2. Registrarse entra en la cola, no en la web ─────────────────────────
-- `security definer` porque el disparador corre en el momento del registro,
-- cuando todavía no hay sesión que pueda escribir en `profiles`.
--
-- La excepción es el administrador: entra ya aprobado. Sin eso no habría nadie
-- que pudiera aprobar al primero, y el sistema nacería cerrado con la llave
-- dentro.
create or replace function public.on_auth_user_created() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  es_admin boolean := lower(trim(coalesce(new.email, ''))) = public.admin_email();
begin
  insert into public.profiles (user_id, email, role, status, decided_at)
    values (
      new.id,
      coalesce(new.email, ''),
      case when es_admin then 'admin' else 'candidate' end,
      case when es_admin then 'approved' else 'pending' end,
      case when es_admin then now() end
    )
    on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists profiles_on_signup on auth.users;
create trigger profiles_on_signup
  after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- ── 3. Quién es admin y quién está aprobado ───────────────────────────────
-- `security definer` otra vez, y esta vez por una razón distinta: estas
-- funciones leen `profiles` saltándose el RLS, que es lo que evita que una
-- política SOBRE `profiles` se consulte a sí misma y recurse infinitamente.
-- `stable` para que Postgres pueda llamarlas una vez por consulta y no una vez
-- por fila.
create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

create or replace function public.is_approved() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and status = 'approved'
  );
$$;

-- ── 4. Quién ve y toca los perfiles ───────────────────────────────────────
alter table public.profiles enable row level security;

-- Cada uno ve el suyo: es lo que permite a la web saber si estás aprobado o
-- esperando. El administrador ve todos, que es su trabajo.
drop policy if exists "ver mi perfil, o todos si soy admin" on public.profiles;
create policy "ver mi perfil, o todos si soy admin" on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Aprobar, denegar y revocar: sólo el administrador. Nadie puede aprobarse a
-- sí mismo ni nombrarse admin, porque para escribir aquí ya hay que serlo.
drop policy if exists "sólo el admin decide" on public.profiles;
create policy "sólo el admin decide" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sólo el admin borra perfiles" on public.profiles;
create policy "sólo el admin borra perfiles" on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ── 5. Las cuentas que ya existen ─────────────────────────────────────────
-- Aprobadas, porque son de antes de que hubiera cola. El disparador del paso 2
-- sólo alcanza a las que se registren a partir de ahora.
insert into public.profiles (user_id, email, role, status, decided_at)
  select
    id,
    coalesce(email, ''),
    case when lower(trim(coalesce(email, ''))) = public.admin_email() then 'admin' else 'candidate' end,
    'approved',
    now()
  from auth.users
  on conflict (user_id) do nothing;

-- Y por si la cuenta del administrador ya existía con otro papel o en la cola.
update public.profiles
  set role = 'admin', status = 'approved', decided_at = coalesce(decided_at, now())
  where lower(trim(email)) = public.admin_email();

-- ── 6. El progreso: sólo si estás aprobado ────────────────────────────────
-- El administrador alcanza cualquier fila, y eso no es un descuido: es lo que
-- le permite bajar y restaurar el progreso de un usuario concreto. El precio
-- es que puede leer el de todos, y queda dicho aquí.
drop policy if exists "cada cuenta, su fila" on public.study_state;
drop policy if exists "su fila si está aprobado, o cualquiera si soy admin" on public.study_state;

create policy "su fila si está aprobado, o cualquiera si soy admin"
  on public.study_state
  for all to authenticated
  using ((user_id = auth.uid() and public.is_approved()) or public.is_admin())
  with check ((user_id = auth.uid() and public.is_approved()) or public.is_admin());

-- ── Comprobar que ha quedado bien ─────────────────────────────────────────
-- Si ya tienes cuenta, esto debe devolver tu correo con admin / approved. Si
-- todavía no la has creado, debe devolver cero filas, y tu perfil aparecerá ya
-- como admin en cuanto te registres.
--
--   select email, role, status from public.profiles order by created_at;
