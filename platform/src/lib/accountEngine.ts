import { accountRows, type AccountRows } from './accountApi'
import { useAccountStore } from './accountStore'
import { useSyncStore } from './syncStore'
import { supabase } from './supabaseClient'
import { isSupabaseConfigured } from './supabaseConfig'

// La sesión: entrar, salir, y mantener la web al día de quién está dentro.
//
// Es un módulo y no un hook porque la puerta, el menú de usuario y el perfil de
// administrador necesitan lo mismo, y tres hooks serían tres relojes.
//
// Dos cosas que no son obvias:
//
//   · **Al cambiar de cuenta se olvida lo que se recordaba de la
//     sincronización.** La referencia de la fila, la versión ya fusionada y la
//     huella hablan de la fila de otro; conservarlas haría que la web creyera
//     haber subido un progreso que en la fila nueva no existe, y se quedaría
//     sin subirlo. Es la misma regla que ya regía al salir, aplicada ahora al
//     único sitio que sabe cuándo cambia la identidad.
//   · **La cuenta se vuelve a leer en cada cambio de sesión**, nunca se
//     cachea. Un «aprobado» guardado sobreviviría a una revocación.

export type SignInResult = { ok: true } | { ok: false; message: string }

/** El acceso a la tabla. Se puede sustituir en los tests. */
let rows: AccountRows = accountRows()

/** Sólo para los tests: cambia de dónde se leen las cuentas. */
export function useAccountRowsForTests(next: AccountRows): void {
  rows = next
}

/** Lee la cuenta del usuario que haya dentro y la deja en el almacén. */
export async function loadAccount(): Promise<void> {
  const { userId } = useAccountStore.getState()
  if (!userId) {
    useAccountStore.getState().markStarted()
    return
  }
  try {
    useAccountStore.getState().loaded(await rows.mine(userId))
  } catch (error) {
    // No se sabe si esta persona puede entrar, y eso es exactamente lo que se
    // va a decir. Ver `phaseOf`: un fallo no es una negativa.
    useAccountStore.getState().failed(message(error))
  }
}

/**
 * Apunta la sesión y, si la identidad ha cambiado, olvida lo recordado de la
 * sincronización antes de que nadie pueda usarlo.
 */
function rememberSession(user: { id: string; email: string } | null): void {
  const before = useAccountStore.getState().userId
  if (before !== (user?.id ?? null)) useSyncStore.getState().forget()
  useAccountStore.getState().session(user)
}

async function currentUser(): Promise<{ id: string; email: string } | null> {
  const { data } = await supabase().auth.getSession()
  const user = data.session?.user
  return user ? { id: user.id, email: user.email ?? '' } : null
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { error } = await supabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) return { ok: false, message: error.message }
  rememberSession(await currentUser())
  await loadAccount()
  return { ok: true }
}

/**
 * Crear la cuenta.
 *
 * Registrarse **no da acceso**: la base de datos crea la fila en `pending` y
 * hace falta que una persona la apruebe. Si el proyecto exige confirmar el
 * correo, Supabase tampoco devuelve sesión; en los dos casos lo que toca es
 * decirlo, no dejar la pantalla girando.
 */
export async function signUp(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase().auth.signUp({ email: email.trim(), password })
  if (error) return { ok: false, message: error.message }
  if (!data.session) return { ok: true }
  rememberSession(await currentUser())
  await loadAccount()
  return { ok: true }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) await supabase().auth.signOut()
  rememberSession(null)
  useAccountStore.getState().markStarted()
}

/**
 * Arranca la vigilancia de la sesión. Lo llama la raíz una sola vez.
 *
 * Mientras esto no responda, la fase es `starting` y no se enseña ni la puerta
 * ni la aplicación: enseñar la puerta en ese instante la haría parpadear en
 * cada recarga a quien ya está dentro.
 */
export function startAccountWatch(): () => void {
  if (!isSupabaseConfigured()) {
    useAccountStore.getState().markStarted()
    return () => {}
  }

  void (async () => {
    rememberSession(await currentUser())
    await loadAccount()
  })()

  const { data: watch } = supabase().auth.onAuthStateChange((_event, session) => {
    const user = session?.user
    rememberSession(user ? { id: user.id, email: user.email ?? '' } : null)
    void loadAccount()
  })

  return () => watch.subscription.unsubscribe()
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
