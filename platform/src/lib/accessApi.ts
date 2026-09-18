import { cleanEmail, outcomeOf, toRequest, type RequestOutcome, type RequestRow } from './access'
import type { AccessRequest } from '../types/account'
import { describeDbError, supabase } from './supabaseClient'

// La cola de solicitudes, vista desde la web.
//
// Tonta como el resto de la frontera: cuatro llamadas y ninguna decisión. Qué
// se puede decidir sobre qué lo dice `access.ts`, sin red.
//
// Lo que sí es de esta capa, y no es un detalle: **`ask` no pide que le
// devuelvan la fila**. Quien pide acceso no se ha identificado, y la política
// de la tabla le deja escribir pero no leer; añadir un `.select()` aquí haría
// fallar con un error de permisos una inserción que en realidad ha funcionado.

export const REQUESTS_TABLE = 'access_requests'

const COLUMNS = 'id, email, status, created_at, decided_at, claimed_at'

export interface AccessRows {
  /** Pedir acceso, sin cuenta y sin sesión. */
  ask(email: string): Promise<RequestOutcome>
  /** La cola entera. La política sólo deja leerla a un administrador. */
  list(): Promise<AccessRequest[]>
  decide(id: string, patch: Record<string, unknown>): Promise<void>
  /** Quita la fila de la lista. No toca ninguna cuenta. */
  remove(id: string): Promise<void>
}

export function accessRows(): AccessRows {
  return {
    async ask(email) {
      const { error } = await supabase()
        .from(REQUESTS_TABLE)
        .insert({ email: cleanEmail(email) })
      return outcomeOf(error ?? null)
    },

    async list() {
      const { data, error } = await supabase().from(REQUESTS_TABLE).select(COLUMNS)
      if (error) throw new Error(describeDbError(error))
      return (data ?? []).map((row) => toRequest(row as unknown as RequestRow))
    },

    async decide(id, patch) {
      const { error } = await supabase().from(REQUESTS_TABLE).update(patch).eq('id', id)
      if (error) throw new Error(describeDbError(error))
    },

    async remove(id) {
      const { error } = await supabase().from(REQUESTS_TABLE).delete().eq('id', id)
      if (error) throw new Error(describeDbError(error))
    },
  }
}
