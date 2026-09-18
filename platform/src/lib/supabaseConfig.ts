// Dónde está la base de datos que guarda el progreso.
//
// Los dos valores van aquí, a la vista, porque **los dos son públicos**. La
// clave publicable de Supabase está diseñada para vivir en el navegador: no da
// acceso a nada por sí misma. Lo que decide qué puede leer y escribir cada uno
// son las políticas de seguridad por fila (RLS) de la propia base de datos, que
// sólo dejan tocar la fila cuyo `user_id` coincide con el de la sesión.
//
// Está comprobado, no supuesto: con esta clave y sin sesión, un intento de
// escribir en `study_state` responde `42501 — new row violates row-level
// security policy`. Quien la copie de aquí no puede leer ni escribir el
// progreso de nadie; necesitaría además la contraseña de la cuenta, y eso no
// está en el paquete.
//
// La que NO puede salir de Supabase es la clave `service_role` (o
// `sb_secret_…`): se salta el RLS entero. No aparece en este repositorio y no
// debe aparecer nunca.
//
// Es `sb_publishable_…` y no la vieja `anon` en formato JWT porque esa está en
// vía de retirada. Las dos se envían igual y las dos las frena el RLS.
export const SUPABASE_URL = 'https://yzvnewkzhcvdvwywueuf.supabase.co'

export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lq3CXNYn5VCeED8866_tRw_4DsvwdaR'

/** Sin los dos valores no hay a dónde sincronizar. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.trim() !== '' && SUPABASE_PUBLISHABLE_KEY.trim() !== ''
}
