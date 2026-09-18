import { useAccountStore } from './accountStore'
import { AUTO_SAVE_MS, syncOnce, type SyncOutcome } from './remoteSync'
import { useSyncStore } from './syncStore'
import { isSupabaseConfigured } from './supabaseConfig'
import { remoteBackend, stateRows } from './supabaseState'

// El reloj de la sincronización: una pasada al entrar, otra cada cinco minutos
// y otra al dejar la pestaña.
//
// Es un módulo y no un hook de React a propósito. El botón de la cabecera y la
// tarjeta de Ajustes también necesitan lanzar una pasada, y si cada pieza
// montara el mismo hook habría tres relojes corriendo y tres subidas por ciclo.
// Así el reloj lo arranca una sola pieza —el armazón— y cualquiera puede pedir
// una pasada.
//
// Quién está dentro no se pregunta aquí: lo sabe `accountStore`, que es el
// único que vigila la sesión. Este módulo sólo sincroniza, y sólo corre cuando
// ya hay una cuenta aprobada detrás.

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

/**
 * Una pasada: baja lo guardado, fusiona si hay algo nuevo y sube si hace falta.
 */
export async function runSync(): Promise<void> {
  const store = useSyncStore.getState()
  if (!isSyncConfigured()) {
    store.setStatus('off')
    return
  }
  const userId = useAccountStore.getState().userId
  // Sin cuenta no hay fila que sincronizar. No es un fallo: es que todavía no
  // ha entrado nadie, y quien pulse el botón lo hace desde dentro.
  if (!userId) {
    store.setStatus('idle')
    return
  }
  if (running) return
  running = true
  store.setStatus('syncing')

  try {
    const outcome = await syncOnce(remoteBackend(userId, stateRows()), useSyncStore.getState().sync)
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

/**
 * Arranca el reloj. Lo llama el armazón una sola vez; devuelve la manera de
 * pararlo para que React pueda limpiar al desmontar.
 */
export function startAutoSync(): () => void {
  if (!isSyncConfigured()) {
    useSyncStore.getState().setStatus('off')
    return () => {}
  }

  // Al entrar: bajar lo guardado y fusionarlo, que es lo que evita estudiar
  // sobre un progreso viejo.
  void runSync()

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
    document.removeEventListener('visibilitychange', onHide)
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
