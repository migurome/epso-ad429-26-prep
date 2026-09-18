-- 03 — La cola de solicitudes: pedir acceso antes de tener cuenta.
--
-- Cambia el orden de las cosas. Antes había que crear la cuenta —correo y
-- contraseña— para caer en la cola. Ahora se pide acceso dejando sólo el
-- correo, sin cuenta y sin sesión, y la contraseña se pone después, cuando el
-- administrador ha dado el visto bueno.
--
-- La razón no es cómodidad: una contraseña elegida para una cuenta que quizá
-- nunca se apruebe es una contraseña reutilizada y olvidada. Y del otro lado,
-- una cuenta de acceso creada para alguien a quien se va a decir que no es
-- basura en `auth.users` que sólo se limpia a mano.
--
-- Se ejecuta DESPUÉS de `02-profiles.sql`, y se puede repetir sin romper nada.

-- ── 1. La tabla ───────────────────────────────────────────────────────────
create table if not exists public.access_requests (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users on delete set null,
  -- Cuándo esa persona usó el visto bueno para crear su cuenta. Sirve para
  -- distinguir «aprobado y todavía no ha venido» de «aprobado y ya está
  -- dentro», que son dos situaciones que un administrador atiende distinto.
  claimed_at timestamptz
);

-- Cualquiera puede escribir en esta tabla sin haberse identificado, así que la
-- forma del correo la impone la tabla y no la web: sin esto, el primer script
-- que pase deja dentro lo que quiera y del tamaño que quiera.
alter table public.access_requests drop constraint if exists access_requests_email_shape;
alter table public.access_requests add constraint access_requests_email_shape
  check (
    length(email) between 3 and 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  );

-- Un correo, una solicitud. Pedirlo dos veces no crea dos filas ni reabre una
-- ya decidida: el segundo intento choca con este índice, y la web lo trata
-- como un envío correcto para no delatar quién ha pedido acceso antes.
create unique index if not exists access_requests_email_once
  on public.access_requests (lower(trim(email)));

-- ── 2. Quién puede hacer qué ──────────────────────────────────────────────
alter table public.access_requests enable row level security;

-- Escribir sin identificarse: es el único sitio de toda la base donde se
-- permite, y por eso la política es estrecha. Sólo se puede insertar una fila
-- en espera: nadie se cuela aprobándose a sí mismo en el propio insert.
drop policy if exists "cualquiera puede pedir acceso" on public.access_requests;
create policy "cualquiera puede pedir acceso" on public.access_requests
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and decided_at is null
    and decided_by is null
    and claimed_at is null
  );

-- Leerlas es cosa del administrador, y de nadie más. Sin esto, la tabla sería
-- una lista pública de correos.
drop policy if exists "sólo el admin lee las solicitudes" on public.access_requests;
create policy "sólo el admin lee las solicitudes" on public.access_requests
  for select to authenticated using (public.is_admin());

drop policy if exists "sólo el admin decide las solicitudes" on public.access_requests;
create policy "sólo el admin decide las solicitudes" on public.access_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sólo el admin borra solicitudes" on public.access_requests;
create policy "sólo el admin borra solicitudes" on public.access_requests
  for delete to authenticated using (public.is_admin());

-- ── 3. Registrarse con el visto bueno ya dado ─────────────────────────────
-- Sustituye al disparador del paso 2 de `02-profiles.sql`. Ahora mira tres
-- cosas en vez de una:
--
--   · el administrador entra aprobado, como antes;
--   · quien tiene una solicitud aprobada entra aprobado, y se apunta quién lo
--     aprobó, que es la persona que decidió sobre la solicitud;
--   · cualquier otro cae en la cola de perfiles, como antes.
--
-- El tercer caso importa: que el registro esté abierto ya no da acceso a nadie.
-- Quien se registre sin haberlo pedido tendrá una cuenta que no puede hacer
-- nada, y el administrador la verá en la lista de cuentas.
create or replace function public.on_auth_user_created() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  correo    text := lower(trim(coalesce(new.email, '')));
  es_admin  boolean := correo = public.admin_email();
  invitacion public.access_requests%rowtype;
begin
  select * into invitacion
    from public.access_requests
    where lower(trim(email)) = correo and status = 'approved'
    limit 1;

  insert into public.profiles (user_id, email, role, status, decided_at, decided_by)
    values (
      new.id,
      coalesce(new.email, ''),
      case when es_admin then 'admin' else 'candidate' end,
      case when es_admin or invitacion.id is not null then 'approved' else 'pending' end,
      case when es_admin or invitacion.id is not null then now() end,
      invitacion.decided_by
    )
    on conflict (user_id) do nothing;

  -- Queda constancia de que la invitación se usó. No se borra: el registro de
  -- quién pidió y quién decidió es justo lo que se quiere poder mirar después.
  if invitacion.id is not null then
    update public.access_requests set claimed_at = now() where id = invitacion.id;
  end if;

  return new;
end $$;

drop trigger if exists profiles_on_signup on auth.users;
create trigger profiles_on_signup
  after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- ── Comprobar que ha quedado bien ─────────────────────────────────────────
-- 1) Esto debe fallar con «new row violates row-level security policy» si lo
--    ejecutas como `anon` intentando colarte aprobado:
--
--      insert into public.access_requests (email, status)
--        values ('prueba@ejemplo.es', 'approved');
--
-- 2) Y esto debe funcionar desde la web sin haber entrado:
--
--      insert into public.access_requests (email) values ('prueba@ejemplo.es');
--
-- 3) La cola, tal como la verás en /admin:
--
--      select email, status, created_at, claimed_at
--        from public.access_requests order by created_at;
