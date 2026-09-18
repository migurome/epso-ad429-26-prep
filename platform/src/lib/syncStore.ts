import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyncState } from './remoteSync'

// Lo que este dispositivo recuerda de la sincronización.
//
// Aquí ya no vive quién ha entrado: eso es de `accountStore`, y tenerlo en dos
// sitios era tener dos opiniones sobre la misma cosa. Esto guarda sólo lo que
// hace falta para no repetir trabajo.
//
// **Nada de esto viaja en el estado que se sincroniza**: la referencia de la
// fila, la versión ya fusionada y la huella son de este navegador, y
// arrastrarlas de un dispositivo a otro haría que el móvil creyera que ya subió
// lo que subió el PC. Por eso vive en su propio almacén y no en `studyStore`,
// que sí se exporta.

/** Qué está pasando con la sincronización, para poder contarlo. */
export type SyncStatus =
  /** Sin URL ni clave: la web funciona, pero no sincroniza con nada. */
  | 'off'
  /** Configurada, y todavía sin hablar con el servidor en esta pestaña. */
  | 'idle'
  | 'syncing'
  | 'ready'
  | 'error'

interface SyncStoreState {
  /** Si se sincroniza cada cinco minutos mientras la pestaña está abierta. */
  auto: boolean
  status: SyncStatus
  /** Último fallo, tal cual, para poder pegarlo en una consulta. */
  error: string | null
  /** Cuándo terminó bien la última sincronización. */
  lastSyncAt: string | null
  /** Lo que el sincronizador necesita recordar entre pasadas. */
  sync: SyncState
  setAuto: (auto: boolean) => void
  setStatus: (status: SyncStatus, error?: string | null) => void
  remember: (next: { sync?: SyncState; syncedAt?: string }) => void
  /** Olvidar la fila de la que se venía. Lo llama el cambio de sesión. */
  forget: () => void
}

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set, get) => ({
      auto: true,
      status: 'off',
      error: null,
      lastSyncAt: null,
      sync: {},
      setAuto: (auto) => set({ auto }),
      setStatus: (status, error = null) => set({ status, error }),
      remember: ({ sync, syncedAt }) =>
        set((state) => ({
          sync: sync ?? state.sync,
          lastSyncAt: syncedAt ?? state.lastSyncAt,
        })),
      // Cambiar de cuenta es apuntar a otra fila. Lo recordado —qué versión se
      // fusionó, qué huella se subió— habla de la anterior, y conservarlo haría
      // que la web creyera haber subido ya un progreso que en la fila nueva no
      // existe: se quedaría sin subirlo. Se comprueba antes de tocar nada,
      // porque la misma sesión renovándose no es un cambio de cuenta y borrar
      // ahí subiría el estado entero cada hora sin necesidad.
      forget: () => {
        if (Object.keys(get().sync).length === 0 && get().lastSyncAt === null) return
        set({ sync: {}, lastSyncAt: null, status: 'idle', error: null })
      },
    }),
    {
      name: 'epso-prep-sync',
      // El estado de la última pasada es de esta pestaña: guardarlo haría que
      // al abrir la web pareciera sincronizada antes de hablar con el servidor.
      partialize: ({ auto, lastSyncAt, sync }) => ({ auto, lastSyncAt, sync }),
    },
  ),
)
