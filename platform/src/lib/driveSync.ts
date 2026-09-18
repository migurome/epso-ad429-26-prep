import {
  applySnapshot,
  createSnapshot,
  readSnapshot,
  snapshotText,
  type Snapshot,
  type SnapshotSummary,
} from './backup'

// Sincronización del progreso con un fichero en Google Drive.
//
// Aquí está toda la decisión —cuándo bajar, cuándo fusionar, cuándo subir— y
// nada del acceso a Drive: eso entra por `DriveBackend`, para que estas reglas
// se puedan probar enteras sin red y sin cuenta de Google. La parte que habla
// con Google vive en `driveApi.ts` y `googleAuth.ts`.
//
// Dos decisiones gobiernan el resto:
//
//   · **Al arrancar se fusiona, no se sustituye.** Si el móvil subió algo y el
//     PC tenía trabajo sin subir, sustituir tiraría uno de los dos. La fusión
//     de `backup.ts` es idempotente, así que bajar el mismo fichero cien veces
//     deja el progreso igual.
//   · **Sólo se sube si el estado ha cambiado de verdad.** La huella ignora la
//     fecha de exportación; si no, cada cinco minutos subiría un fichero nuevo
//     idéntico al anterior y el historial de Drive se llenaría de basura.

/** Nombre del fichero dentro de la carpeta de Drive. */
export const SNAPSHOT_FILE = 'epso-prep-estado.json'

/** Carpeta que la aplicación crea en Drive si no existe. */
export const DRIVE_FOLDER = 'EPSO_savedata'

/** Cada cuánto se guarda mientras la pestaña está abierta. */
export const AUTO_SAVE_MS = 5 * 60 * 1000

export interface RemoteFile {
  fileId: string
  /** `modifiedTime` de Drive: cambia en cada escritura, venga de donde venga. */
  modifiedTime: string
  text: string
}

/**
 * Lo que el sincronizador necesita de Drive, y nada más.
 *
 * `read` devuelve null cuando el fichero todavía no existe, que es lo normal la
 * primera vez y no un error.
 */
export interface DriveBackend {
  read(): Promise<RemoteFile | null>
  write(text: string, fileId?: string): Promise<{ fileId: string; modifiedTime: string }>
}

/** Lo que hay que recordar entre sincronizaciones para no repetir trabajo. */
export interface SyncState {
  fileId?: string
  /** La versión de Drive que este dispositivo ya ha fusionado. */
  modifiedTime?: string
  /** Huella del estado local tal como se subió por última vez. */
  fingerprint?: string
}

export type SyncOutcome =
  | {
      ok: true
      /** Qué entró de Drive, si hubo algo que fusionar. */
      pulled: SnapshotSummary | null
      pushed: boolean
      state: SyncState
    }
  | {
      ok: false
      /** `unreadable`/`foreign`/`newer`: lo de Drive no se puede usar.
       *  `read`/`write`: Drive falló. Se distinguen porque el candidato no
       *  puede hacer nada con las primeras y sí reintentar las segundas. */
      reason: 'unreadable' | 'foreign' | 'newer' | 'read' | 'write'
      detail?: string
      state: SyncState
    }

/**
 * Huella del estado, para saber si hace falta subir.
 *
 * Deja fuera `exportedAt` y `appVersion`: los dos cambian sin que el candidato
 * haya estudiado nada, y con ellos dentro cada ciclo de cinco minutos subiría
 * un fichero nuevo. Las claves van ordenadas porque dos dispositivos pueden
 * tener el mismo contenido en otro orden de inserción.
 */
export function fingerprint(snapshot: Snapshot): string {
  const { exportedAt: _exportedAt, appVersion: _appVersion, ...rest } = snapshot
  return stableStringify(rest)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * Una pasada de sincronización: baja, fusiona si hace falta y sube si hace
 * falta.
 *
 * Es la misma función para el arranque de la sesión, para el reloj de los cinco
 * minutos y para el botón de guardar ahora. Tenerla una sola vez evita que el
 * arranque y el guardado automático se comporten distinto, que es donde se
 * pierden progresos.
 */
export async function syncOnce(backend: DriveBackend, state: SyncState): Promise<SyncOutcome> {
  let remote: RemoteFile | null
  try {
    remote = await backend.read()
  } catch (error) {
    return { ok: false, reason: 'read', detail: message(error), state }
  }

  let pulled: SnapshotSummary | null = null
  let next: SyncState = { ...state }

  if (remote) {
    next = { ...next, fileId: remote.fileId }
    // Si la versión de Drive es la misma que ya fusionamos, no hay nada que
    // traer: lo de allí salió de aquí.
    if (remote.modifiedTime !== state.modifiedTime) {
      const read = readSnapshot(remote.text)
      if (!read.ok) return { ok: false, reason: read.reason, state: next }
      pulled = applySnapshot(read.snapshot, 'merge')
      next = { ...next, modifiedTime: remote.modifiedTime }
    }
  }

  // La huella se toma DESPUÉS de fusionar: si lo de Drive traía algo nuevo, el
  // estado local ya lo incluye y lo que se sube es la unión de los dos.
  const snapshot = createSnapshot()
  const mark = fingerprint(snapshot)
  const mustPush = !remote || mark !== next.fingerprint

  if (!mustPush) return { ok: true, pulled, pushed: false, state: next }

  try {
    const written = await backend.write(snapshotText(snapshot), next.fileId)
    return {
      ok: true,
      pulled,
      pushed: true,
      state: { fileId: written.fileId, modifiedTime: written.modifiedTime, fingerprint: mark },
    }
  } catch (error) {
    // Lo fusionado no se deshace: el progreso de Drive ya está en este
    // dispositivo, y lo único que falta es que el de aquí llegue allí. Se
    // conserva `modifiedTime` para no volver a fusionar lo mismo, y no la
    // huella, para que el próximo intento vuelva a subir.
    return { ok: false, reason: 'write', detail: message(error), state: next }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
