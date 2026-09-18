import {
  applySnapshot,
  createSnapshot,
  readSnapshot,
  snapshotText,
  type Snapshot,
  type SnapshotSummary,
} from './backup'

// Sincronización del progreso con un almacén remoto.
//
// Aquí está toda la decisión —cuándo bajar, cuándo fusionar, cuándo subir— y
// nada de cómo se llega al almacén: eso entra por `RemoteBackend`, para que
// estas reglas se puedan probar enteras sin red y sin cuenta en ningún sitio.
// La implementación que se usa de verdad vive en `supabaseState.ts`.
//
// Ese aislamiento no es decoración: el almacén ya ha cambiado una vez —de un
// fichero en Google Drive a una fila en Supabase, para no depender de la
// consola de Google Cloud— y estas reglas y sus tests sobrevivieron intactos.
//
// Dos decisiones gobiernan el resto:
//
//   · **Al arrancar se fusiona, no se sustituye.** Si el móvil subió algo y el
//     PC tenía trabajo sin subir, sustituir tiraría uno de los dos. La fusión
//     de `backup.ts` es idempotente, así que bajar lo mismo cien veces deja el
//     progreso igual.
//   · **Sólo se sube si el estado ha cambiado de verdad.** La huella ignora la
//     fecha de exportación; si no, cada cinco minutos se subiría un estado
//     nuevo idéntico al anterior.

/** Cada cuánto se guarda mientras la pestaña está abierta. */
export const AUTO_SAVE_MS = 5 * 60 * 1000

export interface RemoteSnapshot {
  /** Qué es lo remoto: un fichero, una fila. El sincronizador no lo interpreta. */
  ref: string
  /** Marca de versión: cambia en cada escritura, venga del dispositivo que venga. */
  version: string
  text: string
}

/**
 * Lo que el sincronizador necesita del almacén, y nada más.
 *
 * `read` devuelve null cuando todavía no hay nada guardado, que es lo normal la
 * primera vez y no un error.
 */
export interface RemoteBackend {
  read(): Promise<RemoteSnapshot | null>
  write(text: string, ref?: string): Promise<{ ref: string; version: string }>
}

/** Lo que hay que recordar entre sincronizaciones para no repetir trabajo. */
export interface SyncState {
  ref?: string
  /** La versión remota que este dispositivo ya ha fusionado. */
  version?: string
  /** Huella del estado local tal como se subió por última vez. */
  fingerprint?: string
}

export type SyncOutcome =
  | {
      ok: true
      /** Qué entró del servidor, si hubo algo que fusionar. */
      pulled: SnapshotSummary | null
      pushed: boolean
      state: SyncState
    }
  | {
      ok: false
      /** `unreadable`/`foreign`/`newer`: lo remoto no se puede usar.
       *  `read`/`write`: el servidor falló. Se distinguen porque el candidato no
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
export async function syncOnce(backend: RemoteBackend, state: SyncState): Promise<SyncOutcome> {
  let remote: RemoteSnapshot | null
  try {
    remote = await backend.read()
  } catch (error) {
    return { ok: false, reason: 'read', detail: message(error), state }
  }

  let pulled: SnapshotSummary | null = null
  let next: SyncState = { ...state }

  if (remote) {
    next = { ...next, ref: remote.ref }
    // Si la versión remota es la misma que ya fusionamos, no hay nada que
    // traer: lo de allí salió de aquí.
    if (remote.version !== state.version) {
      const read = readSnapshot(remote.text)
      if (!read.ok) return { ok: false, reason: read.reason, state: next }
      pulled = applySnapshot(read.snapshot, 'merge')
      next = { ...next, version: remote.version }
    }
  }

  // La huella se toma DESPUÉS de fusionar: si lo remoto traía algo nuevo, el
  // estado local ya lo incluye y lo que se sube es la unión de los dos.
  const snapshot = createSnapshot()
  const mark = fingerprint(snapshot)
  const mustPush = !remote || mark !== next.fingerprint

  if (!mustPush) return { ok: true, pulled, pushed: false, state: next }

  try {
    const written = await backend.write(snapshotText(snapshot), next.ref)
    return {
      ok: true,
      pulled,
      pushed: true,
      state: { ref: written.ref, version: written.version, fingerprint: mark },
    }
  } catch (error) {
    // Lo fusionado no se deshace: el progreso del servidor ya está en este
    // dispositivo, y lo único que falta es que el de aquí llegue allí. Se
    // conserva `version` para no volver a fusionar lo mismo, y no la
    // huella, para que el próximo intento vuelva a subir.
    return { ok: false, reason: 'write', detail: message(error), state: next }
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
