import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyncState } from './driveSync'

// Lo que este dispositivo recuerda de la sincronización con Drive.
//
// **Nada de esto viaja en el fichero de estado**: el id de la carpeta, el del
// fichero y la huella son de este navegador, y arrastrarlos de un dispositivo a
// otro haría que el móvil creyera que ya subió lo que subió el PC. Por eso vive
// en su propio almacén y no en `studyStore`, que sí se exporta.
//
// El token de Google no se guarda aquí ni en ninguna parte persistente: vive en
// memoria dentro de `googleAuth.ts` y caduca en una hora.

/** Qué está pasando con la sincronización, para poder contarlo en Ajustes. */
export type DriveStatus =
  | 'off'
  /** Hay identificador de cliente, pero aún no se ha autorizado en este navegador. */
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'syncing'
  | 'error'

interface DriveState {
  /**
   * Identificador de cliente OAuth, si se pega a mano en Ajustes. Vacío
   * significa «usa el que venga compilado». No es un secreto (ver
   * `googleAuth.ts`), así que guardarlo aquí no expone nada.
   */
  clientId: string
  /** Si se sincroniza cada cinco minutos mientras la pestaña está abierta. */
  auto: boolean
  status: DriveStatus
  /** Último fallo, tal cual, para poder pegarlo en una consulta. */
  error: string | null
  /** Cuándo terminó bien la última sincronización. */
  lastSyncAt: string | null
  folderId: string | null
  /** Lo que el sincronizador necesita recordar entre pasadas. */
  sync: SyncState
  setClientId: (clientId: string) => void
  setAuto: (auto: boolean) => void
  setStatus: (status: DriveStatus, error?: string | null) => void
  remember: (next: { folderId?: string; sync?: SyncState; syncedAt?: string }) => void
  disconnect: () => void
}

export const useDriveStore = create<DriveState>()(
  persist(
    (set) => ({
      clientId: '',
      auto: true,
      status: 'off',
      error: null,
      lastSyncAt: null,
      folderId: null,
      sync: {},
      // Pegar un identificador no conecta nada todavía, pero deja de ser «sin
      // configurar»: el paso siguiente es autorizar, y el estado tiene que
      // decirlo o el botón de conectar parecerá no haber hecho nada.
      setClientId: (clientId) =>
        set({ clientId: clientId.trim(), status: clientId.trim() ? 'disconnected' : 'off', error: null }),
      setAuto: (auto) => set({ auto }),
      setStatus: (status, error = null) => set({ status, error }),
      remember: ({ folderId, sync, syncedAt }) =>
        set((state) => ({
          folderId: folderId ?? state.folderId,
          sync: sync ?? state.sync,
          lastSyncAt: syncedAt ?? state.lastSyncAt,
        })),
      disconnect: () =>
        set({ status: 'disconnected', error: null, folderId: null, sync: {}, lastSyncAt: null }),
    }),
    {
      name: 'epso-prep-drive',
      // El estado de la conexión es de esta pestaña: guardarlo haría que al
      // abrir la web pareciera conectada antes de tener ningún token.
      partialize: ({ clientId, auto, lastSyncAt, folderId, sync }) => ({
        clientId,
        auto,
        lastSyncAt,
        folderId,
        sync,
      }),
    },
  ),
)
