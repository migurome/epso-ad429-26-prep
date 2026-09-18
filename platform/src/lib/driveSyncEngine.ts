import { driveBackend, ensureFolder } from './driveApi'
import { AUTO_SAVE_MS, DRIVE_FOLDER, SNAPSHOT_FILE, syncOnce, type SyncOutcome } from './driveSync'
import { useDriveStore } from './driveStore'
import { forgetAccessToken, getAccessToken } from './googleAuth'
import { resolveClientId } from './googleConfig'

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
//   · Las pasadas automáticas piden el token **sin molestar**. Si Google
//     necesita preguntar, el navegador bloquearía su ventana por no venir de un
//     clic, así que en ese caso la sincronización espera a que el candidato
//     pulse «Conectar» en Ajustes.
//   · Nunca hay dos pasadas a la vez. Sin ese cerrojo, el reloj de los cinco
//     minutos podría solaparse con un guardado manual y las dos subirían
//     versiones distintas del mismo estado.

let running = false

/** ¿Hay identificador de cliente? Sin él no se carga nada de Google. */
export function isDriveConfigured(): boolean {
  return resolveClientId(useDriveStore.getState().clientId) !== ''
}

/** Texto para el candidato a partir de lo que devolvió el sincronizador. */
export function explainOutcome(outcome: Extract<SyncOutcome, { ok: false }>): string {
  switch (outcome.reason) {
    case 'unreadable':
      return 'el fichero de Drive no se puede leer'
    case 'foreign':
      return 'el fichero de Drive no es de esta aplicación'
    case 'newer':
      return 'el fichero de Drive lo escribió una versión más nueva de la web'
    case 'read':
      return outcome.detail ?? 'no se pudo leer de Drive'
    case 'write':
      return outcome.detail ?? 'no se pudo escribir en Drive'
  }
}

/**
 * Una pasada: baja de Drive, fusiona si hay algo nuevo y sube si hace falta.
 *
 * @param interactive Permite a Google abrir su ventana de permiso. Sólo con
 * `true` desde un clic; en automático el navegador la bloquearía.
 */
export async function runSync({ interactive = false } = {}): Promise<void> {
  const store = useDriveStore.getState()
  const clientId = resolveClientId(store.clientId)
  if (!clientId) {
    store.setStatus('off')
    return
  }
  if (running) return
  running = true
  store.setStatus(store.status === 'ready' ? 'syncing' : 'connecting')

  try {
    const getToken = () => getAccessToken(clientId, { interactive })
    const token = await getToken()
    const folderId = store.folderId ?? (await ensureFolder(token, DRIVE_FOLDER))
    const backend = driveBackend({
      getToken,
      folderId,
      fileName: SNAPSHOT_FILE,
      fileId: store.sync.fileId,
    })

    const outcome = await syncOnce(backend, store.sync)
    const after = useDriveStore.getState()
    if (outcome.ok) {
      after.remember({ folderId, sync: outcome.state, syncedAt: new Date().toISOString() })
      after.setStatus('ready')
    } else {
      after.remember({ folderId, sync: outcome.state })
      after.setStatus('error', explainOutcome(outcome))
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    // Un intento silencioso que falla no es un error del que avisar: lo normal
    // es que Google quiera preguntar y no pueda. Se queda «desconectado», que
    // es lo que invita a pulsar «Conectar».
    useDriveStore
      .getState()
      .setStatus(interactive ? 'error' : 'disconnected', interactive ? detail : null)
  } finally {
    running = false
  }
}

/** Lo que llama el botón de conectar, que sí sale de un clic. */
export function connectDrive(): Promise<void> {
  return runSync({ interactive: true })
}

export async function disconnectDrive(): Promise<void> {
  await forgetAccessToken()
  useDriveStore.getState().disconnect()
}

/**
 * Arranca el reloj. Lo llama el armazón una sola vez; devuelve la manera de
 * pararlo para que React pueda limpiar al desmontar.
 */
export function startDriveAutoSync(): () => void {
  if (!isDriveConfigured()) return () => {}

  // Al abrir la sesión: bajar lo de Drive y fusionarlo, que es lo que evita
  // estudiar sobre un progreso viejo.
  void runSync()

  const timer = setInterval(() => {
    if (useDriveStore.getState().auto) void runSync()
  }, AUTO_SAVE_MS)

  // Al irse a otra pestaña o cerrar: un último intento con lo que haya. No se
  // usa `beforeunload`, donde una petición lanzada se corta a medias.
  const onHide = () => {
    if (document.visibilityState === 'hidden' && useDriveStore.getState().auto) void runSync()
  }
  document.addEventListener('visibilitychange', onHide)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onHide)
  }
}
