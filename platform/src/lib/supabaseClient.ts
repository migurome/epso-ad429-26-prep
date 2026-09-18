import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from './supabaseConfig'

// El cliente de Supabase, uno solo y creado tarde.
//
// Tarde porque sin los dos valores de configuración `createClient` falla, y la
// web tiene que poder abrirse igual —sin sincronización, pero entera— cuando no
// están puestos. Y uno solo porque cada cliente mantiene su propio reloj de
// renovación de sesión: dos clientes son dos relojes renovando el mismo token.

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no está configurado: faltan la URL y la clave publicable.')
  }
  client ??= createClient(SUPABASE_URL.trim(), SUPABASE_PUBLISHABLE_KEY.trim(), {
    auth: {
      // La sesión se guarda y se renueva sola. Esto es la diferencia grande con
      // lo que había antes: el permiso de Google caducaba cada hora y había que
      // volver a autorizar con un clic. Aquí el token se renueva en silencio y
      // la sesión sobrevive a cerrar el navegador.
      persistSession: true,
      autoRefreshToken: true,
      // La web enruta por el fragmento (`#/ajustes`), y la vuelta de un acceso
      // por redirección también llega en el fragmento: se pisarían. Como se
      // entra con correo y contraseña, no hay redirección que detectar.
      detectSessionInUrl: false,
      storageKey: 'epso-prep-auth',
    },
  })
  return client
}

/** Sólo para los tests: deja el módulo como recién cargado. */
export function resetSupabaseClientForTests(): void {
  client = null
}
