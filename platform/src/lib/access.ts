import type { AccessRequest, Account, RequestStatus } from '../types/account'

// Pedir acceso antes de tener cuenta, y decidir sobre lo pedido.
//
// El orden de las cosas cambió aquí: antes había que crear la cuenta —correo y
// contraseña— para caer en la cola; ahora se deja sólo el correo y la
// contraseña se pone después, cuando hay un sí. Eso evita dos basuras
// distintas: contraseñas elegidas para cuentas que quizá nunca se aprueben, y
// cuentas de acceso creadas para gente a la que se va a decir que no.
//
// Todo lo de este fichero es puro y sin red, que es lo que permite probar
// entera la parte que importa: **qué se puede decidir sobre qué**.

export function cleanEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export type EmailCheck =
  | { ok: true; email: string }
  | { ok: false; reason: 'empty' | 'shape' | 'long' }

// La misma forma que impone la tabla. Se comprueba aquí además de allí no por
// desconfianza, sino porque el error de Postgres al violar un CHECK es
// ilegible, y quien se equivoca escribiendo su correo merece que se lo digan
// con palabras y sin esperar al viaje de ida y vuelta.
const SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MAX_LENGTH = 254

export function checkEmail(raw: string): EmailCheck {
  const email = cleanEmail(raw)
  if (email === '') return { ok: false, reason: 'empty' }
  if (email.length > MAX_LENGTH) return { ok: false, reason: 'long' }
  if (!SHAPE.test(email)) return { ok: false, reason: 'shape' }
  return { ok: true, email }
}

/** El orden en que un administrador quiere ver la cola. */
const RANK: Record<RequestStatus, number> = {
  pending: 0,
  approved: 1,
  rejected: 2,
}

export function sortRequests(requests: AccessRequest[]): AccessRequest[] {
  return [...requests].sort(
    (a, b) =>
      RANK[a.status] - RANK[b.status] ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.email.localeCompare(b.email),
  )
}

/** Cuántas solicitudes esperan una decisión. */
export function waitingRequests(requests: AccessRequest[]): number {
  return requests.filter((r) => r.status === 'pending').length
}

export type RequestOutcome = { ok: true } | { ok: false; message: string }

/**
 * Qué contestar a quien acaba de pedir acceso.
 *
 * El caso que no es obvio: **el correo repetido se trata como un envío
 * correcto**. La tabla tiene un índice único, así que pedirlo dos veces
 * responde `23505`; enseñar ese fallo convertiría la puerta en un detector de
 * quién ha pedido acceso antes —se prueba un correo, y la respuesta dice si
 * está en la lista—. Como para el que pide el resultado es el mismo (su
 * solicitud está puesta), se le dice lo mismo.
 */
export function outcomeOf(error: { code?: string; message: string } | null): RequestOutcome {
  if (!error) return { ok: true }
  if (error.code === '23505') return { ok: true }
  return { ok: false, message: error.message }
}

export type RequestAction = 'approve' | 'reject' | 'remove'
export type RequestAllowed = { ok: true } | { ok: false; reason: 'noop' | 'account' }

/**
 * Si se puede decidir algo sobre una solicitud, y si no, por qué.
 *
 * La guarda que de verdad hace falta es `account`: en cuanto esa persona ha
 * creado su cuenta, esta fila **ya no manda nada**. El visto bueno lo lee el
 * disparador de la base una sola vez, en el momento del registro; aprobar
 * después una solicitud ya usada no da acceso a nadie, y rechazarla no se lo
 * quita a nadie. Quien tiene cuenta se decide en la lista de cuentas, y aquí
 * se dice en vez de ofrecer un botón que no hace nada.
 */
export function canRequest(
  action: RequestAction,
  request: AccessRequest,
  hasAccount: boolean,
): RequestAllowed {
  // Borrar la fila es ordenar la lista, y eso se puede hacer siempre.
  if (action === 'remove') return { ok: true }
  if (hasAccount) return { ok: false, reason: 'account' }

  const already: RequestStatus = action === 'approve' ? 'approved' : 'rejected'
  return request.status === already ? { ok: false, reason: 'noop' } : { ok: true }
}

/** Si el correo de una solicitud ya tiene cuenta creada. */
export function hasAccountFor(email: string, accounts: Account[]): boolean {
  const who = cleanEmail(email)
  return accounts.some((a) => cleanEmail(a.email) === who)
}

/** Lo que se escribe en la fila al decidir sobre una solicitud. */
export function requestDecision(
  status: Extract<RequestStatus, 'approved' | 'rejected'>,
  by: Account,
  now: Date,
): { status: RequestStatus; decided_at: string; decided_by: string } {
  return { status, decided_at: now.toISOString(), decided_by: by.userId }
}

/** Una fila de `access_requests`, tal como llega. */
export interface RequestRow {
  id: string
  email: string | null
  status: string | null
  created_at: string
  decided_at: string | null
  claimed_at: string | null
}

/**
 * De fila a solicitud.
 *
 * Un estado que esta versión de la web no conoce se lee como `pending`, igual
 * que en las cuentas: lo prudente ante lo desconocido es dejarlo esperando una
 * decisión, nunca darlo por aprobado.
 */
export function toRequest(row: RequestRow): AccessRequest {
  const status = row.status ?? ''
  return {
    id: row.id,
    email: row.email ?? '',
    status: status === 'approved' || status === 'rejected' ? status : 'pending',
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    claimedAt: row.claimed_at,
  }
}
