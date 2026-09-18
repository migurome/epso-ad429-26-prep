import type { Account, AccountStatus } from '../types/account'

// Las decisiones del perfil de administrador, sin red y sin interfaz.
//
// Dos cosas gobiernan todo lo de aquí:
//
//   · **Nadie se desarma a sí mismo.** Un administrador que se revoca o se
//     borra deja el sistema sin nadie capaz de aprobar a nadie, y no hay
//     manera de arreglarlo desde la web: habría que ir al SQL. La base de datos
//     no lo impide —la política sólo pregunta si eres admin, no a quién tocas—,
//     así que lo impide esto, y con un texto que dice por qué.
//   · **Quitar el acceso y borrar los datos son cosas distintas.** Un solo
//     botón que hiciera las dos acabaría haciendo la que no se quería. Aquí van
//     separadas hasta en el nombre.

/** El orden en que un administrador quiere ver esto. */
const RANK: Record<AccountStatus, number> = {
  // Primero lo que le espera a él: alguien no puede entrar hasta que decida.
  pending: 0,
  approved: 1,
  revoked: 2,
}

/**
 * La lista, ordenada por lo que reclama atención.
 *
 * Dentro de cada grupo, por antigüedad: quien lleva más tiempo esperando sale
 * antes, que es lo justo y además evita que la lista baile al recargar.
 */
export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort(
    (a, b) =>
      RANK[a.status] - RANK[b.status] ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.email.localeCompare(b.email),
  )
}

/** Cuántas solicitudes esperan una decisión. */
export function pendingCount(accounts: Account[]): number {
  return accounts.filter((a) => a.status === 'pending').length
}

export type AdminAction = 'approve' | 'revoke' | 'delete' | 'wipe' | 'download' | 'restore'

/**
 * Si una acción se puede ofrecer, y si no, por qué.
 *
 * Devuelve el motivo y no sólo un booleano: un botón desactivado sin
 * explicación es de las cosas que más desconciertan, y aquí el motivo es
 * siempre el mismo y siempre merece decirse.
 */
export type Allowed = { ok: true } | { ok: false; reason: 'self' | 'noop' }

export function can(action: AdminAction, me: Account, target: Account): Allowed {
  // Sobre uno mismo sólo se puede mirar. Aprobarse no hace falta —ya está
  // dentro— y lo demás es quitarse la llave estando dentro de la habitación.
  if (me.userId === target.userId) return { ok: false, reason: 'self' }

  switch (action) {
    case 'approve':
      return target.status === 'approved' ? { ok: false, reason: 'noop' } : { ok: true }
    case 'revoke':
      return target.status === 'revoked' ? { ok: false, reason: 'noop' } : { ok: true }
    case 'delete':
    case 'wipe':
    case 'download':
    case 'restore':
      return { ok: true }
  }
}

/** Lo que se escribe en la fila al decidir sobre alguien. */
export function decisionFor(
  status: Extract<AccountStatus, 'approved' | 'revoked'>,
  by: Account,
  now: Date,
): { status: AccountStatus; decided_at: string; decided_by: string } {
  return { status, decided_at: now.toISOString(), decided_by: by.userId }
}

/**
 * El nombre del fichero al bajarse el progreso de alguien.
 *
 * Lleva el correo dentro porque un administrador que se baja tres seguidos
 * acaba con tres ficheros en la carpeta de descargas y ninguna forma de saber
 * cuál es de quién. Lo que no sea seguro en un nombre de fichero se sustituye.
 */
export function progressFilename(email: string, when: Date): string {
  const who = email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const day = when.toISOString().slice(0, 10)
  return `epso-progreso-${who || 'sin-correo'}-${day}.json`
}
