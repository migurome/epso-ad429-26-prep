// Las decisiones del perfil de administrador.
//
// La que más importa no equivocarse: **nadie se desarma a sí mismo**. La base
// de datos no lo impide —su política sólo pregunta si eres admin, no a quién
// tocas—, así que si esto falla, un clic deja el sistema sin nadie capaz de
// aprobar a nadie y sin forma de arreglarlo desde la web.
import { describe, it, expect } from 'vitest'
import { can, decisionFor, pendingCount, progressFilename, sortAccounts } from './admin'
import type { Account } from '../types/account'

const account = (over: Partial<Account> = {}): Account => ({
  userId: 'u1',
  email: 'yo@ejemplo.es',
  role: 'candidate',
  status: 'approved',
  createdAt: '2026-09-18T07:00:00.000Z',
  decidedAt: null,
  ...over,
})

const admin = account({ userId: 'admin', email: 'jefe@ejemplo.es', role: 'admin' })

describe('el orden de la lista', () => {
  it('lo pendiente primero: es lo que espera una decisión', () => {
    const lista = sortAccounts([
      account({ userId: 'a', status: 'revoked' }),
      account({ userId: 'b', status: 'approved' }),
      account({ userId: 'c', status: 'pending' }),
    ])
    expect(lista.map((a) => a.userId)).toEqual(['c', 'b', 'a'])
  })

  it('dentro de un grupo, el que lleva más tiempo esperando va antes', () => {
    const lista = sortAccounts([
      account({ userId: 'nuevo', status: 'pending', createdAt: '2026-09-18T10:00:00.000Z' }),
      account({ userId: 'viejo', status: 'pending', createdAt: '2026-09-01T10:00:00.000Z' }),
    ])
    expect(lista.map((a) => a.userId)).toEqual(['viejo', 'nuevo'])
  })

  it('no reordena la lista original en su sitio', () => {
    // Ordenar el array del almacén haría bailar la lista bajo el ratón.
    const original = [account({ userId: 'a', status: 'revoked' }), account({ userId: 'b', status: 'pending' })]
    sortAccounts(original)
    expect(original.map((a) => a.userId)).toEqual(['a', 'b'])
  })

  it('cuenta las que esperan decisión', () => {
    expect(
      pendingCount([
        account({ status: 'pending' }),
        account({ status: 'pending' }),
        account({ status: 'approved' }),
      ]),
    ).toBe(2)
  })
})

describe('nadie se desarma a sí mismo', () => {
  it('un administrador no puede revocarse', () => {
    expect(can('revoke', admin, admin)).toEqual({ ok: false, reason: 'self' })
  })

  it('ni borrarse, ni vaciarse los datos', () => {
    expect(can('delete', admin, admin)).toEqual({ ok: false, reason: 'self' })
    expect(can('wipe', admin, admin)).toEqual({ ok: false, reason: 'self' })
  })

  it('tampoco aprobarse: ya está dentro', () => {
    expect(can('approve', admin, admin)).toEqual({ ok: false, reason: 'self' })
  })

  it('sobre otro sí puede todo', () => {
    const otro = account({ userId: 'otro', status: 'pending' })
    for (const accion of ['approve', 'revoke', 'delete', 'wipe'] as const) {
      expect(can(accion, admin, otro)).toEqual({ ok: true })
    }
  })

  it('se compara por identidad, no por correo', () => {
    // Dos cuentas pueden compartir texto en el correo por un descuido de la
    // base; lo que no se repite es el identificador.
    const gemelo = account({ userId: 'otro', email: admin.email })
    expect(can('revoke', admin, gemelo)).toEqual({ ok: true })
  })
})

describe('lo que ya está hecho no se ofrece', () => {
  it('aprobar a quien ya está aprobado no hace nada', () => {
    expect(can('approve', admin, account({ userId: 'x', status: 'approved' }))).toEqual({
      ok: false,
      reason: 'noop',
    })
  })

  it('revocar a quien ya está revocado tampoco', () => {
    expect(can('revoke', admin, account({ userId: 'x', status: 'revoked' }))).toEqual({
      ok: false,
      reason: 'noop',
    })
  })

  it('borrar sí se ofrece siempre: no hay estado que lo haga redundante', () => {
    expect(can('delete', admin, account({ userId: 'x', status: 'revoked' }))).toEqual({ ok: true })
  })
})

describe('lo que queda escrito al decidir', () => {
  it('guarda quién decidió y cuándo', () => {
    // Sin eso, meses después no hay forma de saber quién dejó entrar a quién.
    const now = new Date('2026-09-18T12:00:00.000Z')
    expect(decisionFor('approved', admin, now)).toEqual({
      status: 'approved',
      decided_at: '2026-09-18T12:00:00.000Z',
      decided_by: 'admin',
    })
  })
})

describe('el nombre del fichero de progreso', () => {
  const when = new Date('2026-09-18T12:00:00.000Z')

  it('lleva el correo y el día, para no confundir tres descargas seguidas', () => {
    expect(progressFilename('Yo@Ejemplo.es', when)).toBe('epso-progreso-yo-ejemplo-es-2026-09-18.json')
  })

  it('un correo raro no produce un nombre de fichero inválido', () => {
    expect(progressFilename('a b/c\\d?', when)).toBe('epso-progreso-a-b-c-d-2026-09-18.json')
  })

  it('sin correo, tampoco se queda sin nombre', () => {
    expect(progressFilename('', when)).toBe('epso-progreso-sin-correo-2026-09-18.json')
  })
})
