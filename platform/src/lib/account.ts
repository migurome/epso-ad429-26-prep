import type { Account, AccountRole } from '../types/account'

// Qué pantalla toca: la decisión de acceso, sola y sin red.
//
// Es la pieza más pequeña de todo esto y la más importante que no se equivoque,
// porque decide si alguien entra. Vive aparte para poder probarla entera.
//
// La distinción que justifica que exista: **un fallo de la base de datos no es
// una negativa**. Si no se puede leer la cuenta —la tabla no existe todavía, no
// hay red, la política está mal puesta—, lo honrado es decir que no se sabe y
// ofrecer reintentar. Tratarlo como «no estás aprobado» dejaría al
// administrador fuera de su propia aplicación por un problema de red, y encima
// con un mensaje que le mentiría sobre la causa.

export type AccountPhase =
  /** Todavía se está averiguando si hay sesión. No es «sin sesión». */
  | 'starting'
  | 'signed-out'
  | 'pending'
  | 'revoked'
  /** Hay sesión, pero no se ha podido leer la cuenta. No se sabe. */
  | 'unavailable'
  | 'ready'

export interface AccountSituation {
  /** Si ya se ha resuelto la primera lectura de la sesión. */
  started: boolean
  /** Quién ha entrado, si alguien lo ha hecho. */
  userId: string | null
  /** Su fila de `profiles`, si se ha podido leer. */
  account: Account | null
  /** Por qué no se pudo leer, tal cual, si es que no se pudo. */
  failure: string | null
}

export function phaseOf({ started, userId, account, failure }: AccountSituation): AccountPhase {
  if (!started) return 'starting'
  if (!userId) return 'signed-out'
  // Antes que cualquier cosa sobre la cuenta: un fallo al leerla también la
  // deja en null, y confundir las dos cosas es el error que este módulo existe
  // para no cometer.
  if (failure) return 'unavailable'
  // Sin fila, con sesión y sin fallo: el disparador de la base crea la fila al
  // registrarse, así que esto es alguien cuya fila se borró. Se trata como
  // pendiente, que es la opción segura: no entra, y un administrador puede
  // volver a darle el alta.
  if (!account) return 'pending'
  switch (account.status) {
    case 'approved':
      return 'ready'
    case 'revoked':
      return 'revoked'
    case 'pending':
      return 'pending'
  }
}

/** Manda quien tiene el papel Y está aprobado: revocar a un admin lo desarma. */
export function isAdmin(account: Account | null): boolean {
  return account?.role === 'admin' && account.status === 'approved'
}

/** La fila de `profiles` tal como la devuelve PostgREST. */
export interface AccountRow {
  user_id: string
  email: string | null
  role: string
  status: string
  created_at: string
  decided_at: string | null
}

const ROLES: AccountRole[] = ['candidate', 'admin']

/**
 * La fila, traducida.
 *
 * Un papel o un estado que no se reconozcan no se dejan pasar como si tal cosa:
 * se degradan a lo menos capaz —candidato, pendiente—, porque la alternativa es
 * que una errata en la base de datos conceda accesos.
 */
export function toAccount(row: AccountRow): Account {
  return {
    userId: row.user_id,
    email: row.email ?? '',
    role: ROLES.includes(row.role as AccountRole) ? (row.role as AccountRole) : 'candidate',
    status:
      row.status === 'approved' || row.status === 'revoked'
        ? row.status
        : 'pending',
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  }
}
