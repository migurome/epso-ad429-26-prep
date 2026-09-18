import { toAccount, type AccountRow } from './account'
import { PROFILES_TABLE } from './accountApi'
import { STATE_TABLE } from './supabaseState'
import type { Account } from '../types/account'
import { describeDbError, supabase } from './supabaseClient'

// Lo que el perfil de administrador necesita de la base, y nada más.
//
// Deliberadamente tonto, como el resto de la frontera: cinco llamadas y ninguna
// decisión. Qué se puede hacer sobre quién lo decide `admin.ts`, sin red.
//
// Nada de esto se apoya en que la interfaz esconda los botones: quien no sea
// administrador recibe un error de la base de datos, porque la política sólo
// deja escribir en `profiles` a quien lo es. Lo que la interfaz aporta es no
// ofrecer lo que va a fallar; la seguridad la pone Postgres.
//
// La única salvedad, y conviene tenerla presente: la política pregunta si eres
// administrador, no a quién tocas. Que nadie se revoque a sí mismo lo impide
// `admin.ts`, no la base.

const COLUMNS = 'user_id, email, role, status, created_at, decided_at'

export interface AdminRows {
  /** Todas las cuentas. La política sólo deja hacerlo a un administrador. */
  list(): Promise<Account[]>
  decide(userId: string, patch: Record<string, unknown>): Promise<void>
  /** Borra la fila de `profiles`. La cuenta de acceso sigue existiendo. */
  removeProfile(userId: string): Promise<void>
  /** El progreso de alguien, tal como está guardado, o null si no tiene. */
  progressOf(userId: string): Promise<string | null>
  /** Escribe el progreso de alguien. Sobrescribe: es una restauración. */
  restoreProgress(userId: string, snapshot: unknown): Promise<void>
  /** Borra el progreso de alguien sin tocar su acceso. */
  wipeProgress(userId: string): Promise<void>
}

export function adminRows(): AdminRows {
  return {
    async list() {
      const { data, error } = await supabase().from(PROFILES_TABLE).select(COLUMNS)
      if (error) throw new Error(describeDbError(error))
      return (data ?? []).map((row) => toAccount(row as unknown as AccountRow))
    },

    async decide(userId, patch) {
      const { error } = await supabase().from(PROFILES_TABLE).update(patch).eq('user_id', userId)
      if (error) throw new Error(describeDbError(error))
    },

    async removeProfile(userId) {
      const { error } = await supabase().from(PROFILES_TABLE).delete().eq('user_id', userId)
      if (error) throw new Error(describeDbError(error))
    },

    async progressOf(userId) {
      const { data, error } = await supabase()
        .from(STATE_TABLE)
        .select('snapshot')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw new Error(describeDbError(error))
      return data ? JSON.stringify(data.snapshot) : null
    },

    async restoreProgress(userId, snapshot) {
      const { error } = await supabase()
        .from(STATE_TABLE)
        .upsert({ user_id: userId, snapshot }, { onConflict: 'user_id' })
      if (error) throw new Error(describeDbError(error))
    },

    async wipeProgress(userId) {
      const { error } = await supabase().from(STATE_TABLE).delete().eq('user_id', userId)
      if (error) throw new Error(describeDbError(error))
    },
  }
}

