import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyncState } from './remoteSync'

// Lo que este dispositivo recuerda de la sincronización.
//
// **Nada de esto viaja en el estado que se sincroniza**: la referencia de la
// fila, la versión ya fusionada y la huella son de este navegador, y
// arrastrarlas de un dispositivo a otro haría que el móvil creyera que ya subió
// lo que subió el PC. Por eso vive en su propio almacén y no en `studyStore`,
// que sí se exporta.
//
// La sesión de Supabase no se guarda aquí: la guarda el cliente de Supabase, en
// su propia clave, y aquí sólo se refleja quién está dentro para poder decirlo.

/** Qué está pasando con la sincronización, para poder contarlo en Ajustes. */
export type SyncStatus =
  /** Sin URL ni clave: la web funciona, pero no sincroniza con nada. */
  | 'off'
  /** Configurada, pero nadie ha entrado en este navegador. */
  | 'signed-out'
  | 'signing-in'
  | 'ready'
  | 'syncing'
  | 'error'

interface SyncStoreState {
  /** Si se sincroniza cada cinco minutos mientras la pestaña está abierta. */
  auto: boolean
  status: SyncStatus
  /** Último fallo, tal cual, para poder pegarlo en una consulta. */
  error: string | null
  /** Cuándo terminó bien la última sincronización. */
  lastSyncAt: string | null
  /** Quién está dentro, para que la tarjeta pueda decirlo. */
  email: string | null
  /** Lo que el sincronizador necesita recordar entre pasadas. */
  sync: SyncState
  setAuto: (auto: boolean) => void
  setStatus: (status: SyncStatus, error?: string | null) => void
  /** La sesión ha cambiado: ha entrado alguien, o se ha ido. */
  setSession: (email: string | null) => void
  remember: (next: { sync?: SyncState; syncedAt?: string }) => void
  signedOut: () => void
}

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set) => ({
      auto: true,
      status: 'off',
      error: null,
      lastSyncAt: null,
      email: null,
      sync: {},
      setAuto: (auto) => set({ auto }),
      setStatus: (status, error = null) => set({ status, error }),
      setSession: (email) =>
        set((state) => {
          // Entrar con otra cuenta es apuntar a otra fila. Lo recordado
          // —qué versión se fusionó, qué huella se subió— habla de la fila
          // anterior, y conservarlo haría que la web creyera haber subido ya un
          // progreso que en la fila nueva no existe: se quedaría sin subirlo.
          if (email !== null && state.email !== null && email !== state.email) {
            return { email, sync: {}, lastSyncAt: null, error: null }
          }
          return { email, error: null }
        }),
      remember: ({ sync, syncedAt }) =>
        set((state) => ({
          sync: sync ?? state.sync,
          lastSyncAt: syncedAt ?? state.lastSyncAt,
        })),
      // Salir borra lo recordado por lo mismo: el siguiente que entre puede ser
      // otra cuenta, y lo de antes no le sirve.
      signedOut: () =>
        set({ status: 'signed-out', error: null, email: null, sync: {}, lastSyncAt: null }),
    }),
    {
      name: 'epso-prep-sync',
      // El estado de la conexión y quién está dentro son de esta pestaña:
      // guardarlos haría que al abrir la web pareciera sincronizada antes de
      // haber hablado con Supabase.
      partialize: ({ auto, lastSyncAt, sync }) => ({ auto, lastSyncAt, sync }),
    },
  ),
)
