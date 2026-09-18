import { AUTO_SAVE_MS, syncOnce, type SyncOutcome } from './remoteSync'
import { useSyncStore } from './syncStore'
import { supabase } from './supabaseClient'
import { isSupabaseConfigured } from './supabaseConfig'
import { remoteBackend, stateRows } from './supabaseState'

// El reloj de la sincronización: una pasada al abrir la sesión, otra cada cinco
// minutos y otra al dejar la pestaña.
//
// Es un módulo y no un hook de React a propósito. La tarjeta de Ajustes también
// necesita lanzar una pasada, y si las dos piezas montaran el mismo hook
// habría dos relojes corriendo y dos subidas por ciclo. Así el reloj lo arranca
// una sola pieza —el armazón— y cualquiera puede pedir una pasada.
//
// Dos cosas que no son obvias y explican la forma de esto:
//
//   · **Sin sesión no se sincroniza, y no es un error.** La primera vez, y en
//     cada navegador nuevo, hay que entrar una vez. A partir de ahí la sesión
//     se renueva sola y no vuelve a pedir nada.
//   · **Nunca hay dos pasadas a la vez.** Sin ese cerrojo, el reloj de los
//     cinco minutos podría solaparse con un guardado manual y las dos subirían
//     versiones distintas del mismo estado.

let running = false

/** ¿Hay a dónde sincronizar? Sin configuración no se carga nada de Supabase. */
export function isSyncConfigured(): boolean {
  return isSupabaseConfigured()
}

/** Texto para el candidato a partir de lo que devolvió el sincronizador. */
export function explainOutcome(outcome: Extract<SyncOutcome, { ok: false }>): string {
  switch (outcome.reason) {
    case 'unreadable':
      return 'el progreso guardado no se puede leer'
    case 'foreign':
      return 'el progreso guardado no es de esta aplicación'
    case 'newer':
      return 'el progreso guardado lo escribió una versión más nueva de la web'
    case 'read':
      return outcome.detail ?? 'no se pudo leer el progreso guardado'
    case 'write':
      return outcome.detail ?? 'no se pudo guardar el progreso'
  }
}

/** Quién está dentro ahora mismo, según el cliente de Supabase. */
async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  const { data } = await supabase().auth.getSession()
  const user = data.session?.user
  return user ? { id: user.id, email: user.email ?? null } : null
}

/**
 * Una pasada: baja lo guardado, fusiona si hay algo nuevo y sube si hace falta.
 */
export async function runSync(): Promise<void> {
  const store = useSyncStore.getState()
  if (!isSyncConfigured()) {
    store.setStatus('off')
    return
  }
  if (running) return
  running = true

  try {
    const user = await currentUser()
    if (!user) {
      // Nadie ha entrado en este navegador. No hay nada que arreglar y no hay
      // nada que avisar: lo que toca es el botón de entrar.
      useSyncStore.getState().setSession(null)
      useSyncStore.getState().setStatus('signed-out')
      return
    }

    useSyncStore.getState().setSession(user.email)
    useSyncStore.getState().setStatus('syncing')

    const outcome = await syncOnce(remoteBackend(user.id, stateRows()), useSyncStore.getState().sync)
    const after = useSyncStore.getState()
    if (outcome.ok) {
      after.remember({ sync: outcome.state, syncedAt: new Date().toISOString() })
      after.setStatus('ready')
    } else {
      after.remember({ sync: outcome.state })
      after.setStatus('error', explainOutcome(outcome))
    }
  } catch (error) {
    useSyncStore.getState().setStatus('error', message(error))
  } finally {
    running = false
  }
}

/** Entrar con una cuenta que ya existe, y sincronizar acto seguido. */
export async function signIn(email: string, password: string): Promise<void> {
  if (!isSyncConfigured()) return
  const store = useSyncStore.getState()
  store.setStatus('signing-in')
  const { data, error } = await supabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) {
    store.setStatus('error', error.message)
    return
  }
  useSyncStore.getState().setSession(data.user?.email ?? email.trim())
  await runSync()
}

/**
 * Crear la cuenta la primera vez.
 *
 * Si el proyecto exige confirmar el correo, Supabase no devuelve sesión: la
 * cuenta existe pero todavía no se puede entrar, y eso hay que decirlo en vez
 * de dejar la tarjeta girando.
 */
export async function signUp(email: string, password: string): Promise<void> {
  if (!isSyncConfigured()) return
  const store = useSyncStore.getState()
  store.setStatus('signing-in')
  const { data, error } = await supabase().auth.signUp({ email: email.trim(), password })
  if (error) {
    store.setStatus('error', error.message)
    return
  }
  if (!data.session) {
    store.setStatus('signed-out', 'Cuenta creada: confirma el correo y vuelve a entrar.')
    return
  }
  useSyncStore.getState().setSession(data.user?.email ?? email.trim())
  await runSync()
}

export async function signOut(): Promise<void> {
  if (isSyncConfigured()) await supabase().auth.signOut()
  useSyncStore.getState().signedOut()
}

/**
 * Arranca el reloj. Lo llama el armazón una sola vez; devuelve la manera de
 * pararlo para que React pueda limpiar al desmontar.
 */
export function startAutoSync(): () => void {
  if (!isSyncConfigured()) {
    useSyncStore.getState().setStatus('off')
    return () => {}
  }

  // El estado arranca en «off», que es lo correcto mientras no se sabe si hay
  // configuración. Aquí ya se sabe que sí, y saber si hay sesión cuesta un
  // viaje: sin esta línea, Ajustes diría «Sin configurar» durante ese viaje.
  useSyncStore.getState().setStatus('signing-in')

  // Al abrir la sesión: bajar lo guardado y fusionarlo, que es lo que evita
  // estudiar sobre un progreso viejo.
  void runSync()

  // Si la sesión cambia en otra pestaña —o se renueva sola—, esta se entera.
  const { data: watch } = supabase().auth.onAuthStateChange((_event, session) => {
    useSyncStore.getState().setSession(session?.user.email ?? null)
    if (!session) useSyncStore.getState().setStatus('signed-out')
  })

  const timer = setInterval(() => {
    if (useSyncStore.getState().auto) void runSync()
  }, AUTO_SAVE_MS)

  // Al irse a otra pestaña o cerrar: un último intento con lo que haya. No se
  // usa `beforeunload`, donde una petición lanzada se corta a medias.
  const onHide = () => {
    if (document.visibilityState === 'hidden' && useSyncStore.getState().auto) void runSync()
  }
  document.addEventListener('visibilitychange', onHide)

  return () => {
    clearInterval(timer)
    watch.subscription.unsubscribe()
    document.removeEventListener('visibilitychange', onHide)
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
