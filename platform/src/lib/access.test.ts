// La cola de solicitudes.
//
// Dos cosas de aquí valen más que el resto, y por razones opuestas:
//
//   · **El correo repetido se contesta como si todo hubiera ido bien.** Si
//     alguna vez se enseña el fallo de la base, la puerta se convierte en un
//     detector: se prueba un correo y la respuesta dice si estaba en la lista.
//   · **Sobre quien ya tiene cuenta, esta lista no manda.** El visto bueno lo
//     lee el disparador una sola vez, al registrarse. Aprobar después una
//     solicitud ya usada no daría acceso a nadie, y el administrador se
//     quedaría creyendo que sí.
import { describe, it, expect } from 'vitest'
import {
  canRequest,
  checkEmail,
  cleanEmail,
  hasAccountFor,
  outcomeOf,
  requestDecision,
  sortRequests,
  toRequest,
  waitingRequests,
} from './access'
import type { AccessRequest, Account } from '../types/account'

const request = (over: Partial<AccessRequest> = {}): AccessRequest => ({
  id: 'r1',
  email: 'quien@ejemplo.es',
  status: 'pending',
  createdAt: '2026-09-18T07:00:00.000Z',
  decidedAt: null,
  claimedAt: null,
  ...over,
})

const account = (over: Partial<Account> = {}): Account => ({
  userId: 'u1',
  email: 'quien@ejemplo.es',
  role: 'candidate',
  status: 'approved',
  createdAt: '2026-09-18T07:00:00.000Z',
  decidedAt: null,
  ...over,
})

describe('el correo que se escribe en la puerta', () => {
  it('se guarda sin espacios y en minúsculas', () => {
    // Si no, 'Yo@Ejemplo.es ' y 'yo@ejemplo.es' serían dos solicitudes.
    expect(checkEmail('  Yo@Ejemplo.ES ')).toEqual({ ok: true, email: 'yo@ejemplo.es' })
  })

  it('vacío no se envía', () => {
    expect(checkEmail('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('sin arroba, sin punto o con espacios dentro, tampoco', () => {
    expect(checkEmail('yo').ok).toBe(false)
    expect(checkEmail('yo@ejemplo').ok).toBe(false)
    expect(checkEmail('yo @ejemplo.es').ok).toBe(false)
    expect(checkEmail('yo@@ejemplo.es').ok).toBe(false)
  })

  it('uno interminable se corta aquí y no en la base', () => {
    // La tabla lo rechaza igual, pero con un error de Postgres ilegible.
    const largo = 'a'.repeat(250) + '@ejemplo.es'
    expect(checkEmail(largo)).toEqual({ ok: false, reason: 'long' })
  })

  it('cleanEmail no decide nada, sólo normaliza', () => {
    expect(cleanEmail(' A@B.ES ')).toBe('a@b.es')
  })
})

describe('qué se contesta al pedir acceso', () => {
  it('sin error, enviado', () => {
    expect(outcomeOf(null)).toEqual({ ok: true })
  })

  it('el correo repetido se contesta igual que el nuevo', () => {
    // A propósito: lo contrario delataría quién ha pedido acceso antes.
    expect(outcomeOf({ code: '23505', message: 'duplicate key value' })).toEqual({ ok: true })
  })

  it('cualquier otro fallo se enseña tal cual', () => {
    expect(outcomeOf({ code: '42501', message: 'row-level security' })).toEqual({
      ok: false,
      message: 'row-level security',
    })
  })
})

describe('el orden de la cola', () => {
  it('lo que espera decisión, primero', () => {
    const lista = sortRequests([
      request({ id: 'a', status: 'rejected' }),
      request({ id: 'b', status: 'approved' }),
      request({ id: 'c', status: 'pending' }),
    ])
    expect(lista.map((r) => r.id)).toEqual(['c', 'b', 'a'])
  })

  it('dentro de un grupo, quien lleva más tiempo esperando va antes', () => {
    const lista = sortRequests([
      request({ id: 'nueva', createdAt: '2026-09-18T10:00:00.000Z' }),
      request({ id: 'vieja', createdAt: '2026-09-01T10:00:00.000Z' }),
    ])
    expect(lista.map((r) => r.id)).toEqual(['vieja', 'nueva'])
  })

  it('no reordena la lista original en su sitio', () => {
    const original = [request({ id: 'a', status: 'rejected' }), request({ id: 'b' })]
    sortRequests(original)
    expect(original.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('cuenta las que esperan', () => {
    expect(waitingRequests([request(), request({ id: 'r2', status: 'approved' })])).toBe(1)
  })
})

describe('qué se puede decidir sobre una solicitud', () => {
  it('se aprueba la que espera', () => {
    expect(canRequest('approve', request(), false)).toEqual({ ok: true })
  })

  it('no se ofrece aprobar lo ya aprobado, ni rechazar lo ya rechazado', () => {
    expect(canRequest('approve', request({ status: 'approved' }), false)).toEqual({
      ok: false,
      reason: 'noop',
    })
    expect(canRequest('reject', request({ status: 'rejected' }), false)).toEqual({
      ok: false,
      reason: 'noop',
    })
  })

  it('de quien ya tiene cuenta no se decide aquí', () => {
    // Esta es la guarda que importa: la base lee el visto bueno una sola vez,
    // al registrarse. Aprobar después no daría acceso; rechazar no lo quitaría.
    expect(canRequest('approve', request({ status: 'pending' }), true)).toEqual({
      ok: false,
      reason: 'account',
    })
    expect(canRequest('reject', request({ status: 'pending' }), true)).toEqual({
      ok: false,
      reason: 'account',
    })
  })

  it('pero la fila se puede quitar de la lista siempre', () => {
    expect(canRequest('remove', request({ status: 'approved', claimedAt: 'ya' }), true)).toEqual({
      ok: true,
    })
  })
})

describe('el cruce con las cuentas', () => {
  it('encuentra la cuenta aunque el correo venga escrito distinto', () => {
    expect(hasAccountFor(' QUIEN@ejemplo.ES ', [account()])).toBe(true)
  })

  it('y dice que no cuando no la hay', () => {
    expect(hasAccountFor('otro@ejemplo.es', [account()])).toBe(false)
  })
})

describe('lo que queda escrito al decidir', () => {
  it('quién decidió y cuándo', () => {
    const jefe = account({ userId: 'admin', role: 'admin' })
    expect(requestDecision('approved', jefe, new Date('2026-09-18T09:00:00.000Z'))).toEqual({
      status: 'approved',
      decided_at: '2026-09-18T09:00:00.000Z',
      decided_by: 'admin',
    })
  })
})

describe('leer una fila de la base', () => {
  it('un estado desconocido espera decisión, no entra', () => {
    const leida = toRequest({
      id: 'r1',
      email: 'quien@ejemplo.es',
      status: 'lo-que-sea',
      created_at: '2026-09-18T07:00:00.000Z',
      decided_at: null,
      claimed_at: null,
    })
    expect(leida.status).toBe('pending')
  })

  it('una fila sin correo no revienta la lista', () => {
    const leida = toRequest({
      id: 'r1',
      email: null,
      status: 'approved',
      created_at: '2026-09-18T07:00:00.000Z',
      decided_at: '2026-09-18T08:00:00.000Z',
      claimed_at: '2026-09-18T09:00:00.000Z',
    })
    expect(leida).toEqual({
      id: 'r1',
      email: '',
      status: 'approved',
      createdAt: '2026-09-18T07:00:00.000Z',
      decidedAt: '2026-09-18T08:00:00.000Z',
      claimedAt: '2026-09-18T09:00:00.000Z',
    })
  })
})
