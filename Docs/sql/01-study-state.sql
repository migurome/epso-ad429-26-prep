-- 01 — El progreso sincronizado: una fila por cuenta.
--
-- Aplicado el 18/09/2026. Esto es lo que hace que la clave publicable pueda ir
-- a la vista en el paquete: sin sesión, esta tabla no se puede tocar.
--
-- Comprobación de que sigue siendo cierto (desde fuera, con la clave del
-- paquete y sin sesión):
--
--   curl -X POST -H "apikey: <clave>" -H "Content-Type: application/json" \
--     -d '{"user_id":"00000000-0000-4000-8000-000000000000","snapshot":{}}' \
--     https://<proyecto>.supabase.co/rest/v1/study_state
--
-- Debe responder `42501 — new row violates row-level security policy`. Si
-- llegara a funcionar, la clave del paquete dejaría de ser inofensiva.

create table public.study_state (
  user_id    uuid primary key references auth.users on delete cascade,
  snapshot   jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.study_state enable row level security;

create policy "cada cuenta, su fila" on public.study_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- `updated_at` la pone la base de datos, nunca el cliente: es la marca con la
-- que un dispositivo sabe si lo guardado es más nuevo que lo que él ya
-- fusionó, y fiarse del reloj de cada teléfono para eso es perder progreso.
create function public.touch_updated_at() returns trigger
  language plpgsql as $$
  begin new.updated_at = now(); return new; end $$;

create trigger study_state_touch before insert or update on public.study_state
  for each row execute function public.touch_updated_at();
