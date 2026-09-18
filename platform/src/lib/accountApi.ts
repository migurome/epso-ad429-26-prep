import { toAccount, type AccountRow } from './account'
import type { Account } from '../types/account'
import { describeDbError, supabase } from './supabaseClient'

// La tabla de cuentas, vista desde la web.
//
// Deliberadamente tonta: dos llamadas y ninguna decisión. Quién entra lo decide
// `account.ts`, sin red, y así se puede probar entero.
//
// Lo que esta capa NO hace es cachear. La cuenta se vuelve a leer al arrancar y
// cada vez que cambia la sesión, porque «aprobado» guardado en el navegador
// sobreviviría a una revocación: el administrador quitaría el acceso y el
// interesado seguiría entrando hasta vaciar su almacenamiento.

export const PROFILES_TABLE = 'profiles'

const COLUMNS = 'user_id, email, role, status, created_at, decided_at'

/**
 * Lo que hace falta de la tabla para decidir el acceso, y nada más.
 *
 * `mine` devuelve null cuando la cuenta no tiene fila: no es un error, y
 * distinguirlo de un fallo de lectura es justo lo que `phaseOf` necesita.
 */
export interface AccountRows {
  mine(userId: string): Promise<Account | null>
}

export function accountRows(): AccountRows {
  return {
    async mine(userId) {
      const { data, error } = await supabase()
        .from(PROFILES_TABLE)
        .select(COLUMNS)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw new Error(describeDbError(error))
      return data ? toAccount(data as unknown as AccountRow) : null
    },
  }
}
