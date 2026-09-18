// La decisión de acceso.
//
// Es la única pieza de la web que decide si alguien entra, así que se prueba
// entera: las seis situaciones posibles y, sobre todo, la que se presta a
// confundirse —que no poder leer la cuenta NO es que te la hayan negado—.
import { describe, it, expect, beforeEach } from 'vitest'
import { isAdmin, phaseOf, toAccount, type AccountRow } from './account'
import type { Account } from '../types/account'
import { useAccountStore } from './accountStore'

const account = (over: Partial<Account> = {}): Account => ({
  userId: 'u1',
  email: 'yo@ejemplo.es',
  role: 'candidate',
  status: 'approved',
  createdAt: '2026-09-18T07:00:00.000Z',
  decidedAt: '2026-09-18T07:00:00.000Z',
  ...over,
})

const situation = (over: Partial<Parameters<typeof phaseOf>[0]> = {}) =>
  phaseOf({ started: true, userId: 'u1', account: account(), failure: null, ...over })

describe('qué pantalla toca', () => {
  it('mientras no se sabe si hay sesión, está arrancando', () => {
    // Importa que esto NO sea «sin sesión»: la sesión se recupera del disco y
    // tarda un instante, y enseñar el acceso en ese instante haría parpadear
    // la puerta en cada recarga a quien ya está dentro.
    expect(situation({ started: false })).toBe('starting')
    expect(situation({ started: false, userId: null, account: null })).toBe('starting')
  })

  it('sin sesión, a la puerta', () => {
    expect(situation({ userId: null, account: null })).toBe('signed-out')
  })

  it('aprobado, adentro', () => {
    expect(situation()).toBe('ready')
  })

  it('pendiente de aprobación, a esperar', () => {
    expect(situation({ account: account({ status: 'pending' }) })).toBe('pending')
  })

  it('revocado, fuera', () => {
    expect(situation({ account: account({ status: 'revoked' }) })).toBe('revoked')
  })

  it('sin fila pero sin fallo, pendiente: es la opción segura', () => {
    // La fila la crea la base de datos al registrarse, así que no tenerla es
    // que alguien la borró. No entra, y un administrador puede rehacerla.
    expect(situation({ account: null })).toBe('pending')
  })
})

describe('un fallo de la base de datos no es una negativa', () => {
  it('si no se pudo leer la cuenta, se dice que no se sabe', () => {
    // Éste es el caso por el que este módulo existe. Con la tabla sin crear
    // —o sin red— tratar el fallo como «no aprobado» dejaría al administrador
    // fuera de su propia aplicación, y encima mintiéndole sobre la causa.
    expect(
      situation({ account: null, failure: "Could not find the table 'public.profiles'" }),
    ).toBe('unavailable')
  })

  it('el fallo pesa más que una cuenta vieja que hubiera quedado en memoria', () => {
    // Si una lectura anterior había traído la cuenta y la siguiente falla, lo
    // que vale es el fallo: seguir dentro con datos de hace un rato es cómo se
    // cuela alguien a quien acaban de revocar.
    expect(situation({ account: account({ status: 'approved' }), failure: 'no hay red' })).toBe(
      'unavailable',
    )
  })

  it('sin sesión, el fallo no importa: a la puerta', () => {
    expect(situation({ userId: null, account: null, failure: 'no hay red' })).toBe('signed-out')
  })
})

describe('quién manda', () => {
  it('manda el admin aprobado', () => {
    expect(isAdmin(account({ role: 'admin' }))).toBe(true)
  })

  it('un admin revocado no manda: revocarlo tiene que desarmarlo', () => {
    expect(isAdmin(account({ role: 'admin', status: 'revoked' }))).toBe(false)
    expect(isAdmin(account({ role: 'admin', status: 'pending' }))).toBe(false)
  })

  it('un candidato no manda, y nadie sin cuenta tampoco', () => {
    expect(isAdmin(account())).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})

describe('traducir la fila', () => {
  const row: AccountRow = {
    user_id: 'u1',
    email: 'yo@ejemplo.es',
    role: 'admin',
    status: 'approved',
    created_at: '2026-09-18T07:00:00.000Z',
    decided_at: null,
  }

  it('cambia los nombres y deja el resto igual', () => {
    expect(toAccount(row)).toEqual({
      userId: 'u1',
      email: 'yo@ejemplo.es',
      role: 'admin',
      status: 'approved',
      createdAt: '2026-09-18T07:00:00.000Z',
      decidedAt: null,
    })
  })

  it('un correo vacío en la base no se vuelve null en la web', () => {
    expect(toAccount({ ...row, email: null }).email).toBe('')
  })

  it('un papel que no se reconoce se degrada a candidato', () => {
    // Al revés —dejarlo pasar— una errata en la base concedería mando.
    expect(toAccount({ ...row, role: 'superadmin' }).role).toBe('candidate')
  })

  it('un estado que no se reconoce se degrada a pendiente', () => {
    expect(toAccount({ ...row, status: 'aprobado' }).status).toBe('pending')
    expect(isAdmin(toAccount({ ...row, status: 'aprobado' }))).toBe(false)
  })
})

describe('el almacén de cuenta', () => {
  // Vive aquí, y no en un fichero propio, porque es la otra mitad de la misma
  // decisión: `phaseOf` dice qué significa lo que hay guardado, y esto dice qué
  // se guarda cuando cambia quién está dentro.
  beforeEach(() => {
    useAccountStore.setState({
      started: true,
      userId: 'u1',
      email: 'yo@ejemplo.es',
      account: account({ status: 'approved' }),
      failure: null,
    })
  })

  it('al cambiar de sesión, la cuenta anterior deja de valer al instante', () => {
    // Si se quedara puesta un instante, quien acaba de entrar vería la
    // aplicación entera antes de que nadie haya comprobado si puede.
    useAccountStore.getState().session({ id: 'u2', email: 'otro@ejemplo.es' })

    expect(useAccountStore.getState().account).toBeNull()
    expect(useAccountStore.getState().phase()).toBe('pending')
  })

  it('al salir tampoco queda rastro de la cuenta', () => {
    useAccountStore.getState().session(null)

    expect(useAccountStore.getState().account).toBeNull()
    expect(useAccountStore.getState().phase()).toBe('signed-out')
  })

  it('un fallo al leer borra la cuenta que hubiera: no se entra con datos viejos', () => {
    useAccountStore.getState().failed('no hay red')

    expect(useAccountStore.getState().account).toBeNull()
    expect(useAccountStore.getState().phase()).toBe('unavailable')
  })
})
