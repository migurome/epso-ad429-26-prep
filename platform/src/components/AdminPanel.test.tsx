// El perfil de administrador.
//
// Todo entra por props, así que las cinco acciones se comprueban sin red y sin
// cuentas. Lo que se vigila aquí, por orden de gravedad:
//
//   1. Que sobre la propia cuenta no se ofrezca nada. Un administrador que se
//      revoca deja el sistema sin nadie capaz de aprobar a nadie.
//   2. Que quitar el acceso y borrar los datos no se confundan.
//   3. Que lo pendiente salga primero, que es lo que el administrador viene a
//      resolver.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { AdminPanel } from './AdminPanel'
import { DICT } from '../lib/dictionary'
import { useLocaleStore } from '../lib/localeStore'
import type { Account } from '../types/account'

const es = (key: keyof typeof DICT) => DICT[key].es

const account = (over: Partial<Account> = {}): Account => ({
  userId: 'u1',
  email: 'candidato@ejemplo.es',
  role: 'candidate',
  status: 'approved',
  createdAt: '2026-09-18T07:00:00.000Z',
  decidedAt: null,
  ...over,
})

const yo = account({ userId: 'admin', email: 'jefe@ejemplo.es', role: 'admin' })

function show(accounts: Account[], over: Record<string, unknown> = {}) {
  const spies = {
    onApprove: vi.fn(),
    onRevoke: vi.fn(),
    onDelete: vi.fn(),
    onWipe: vi.fn(),
    onDownload: vi.fn(),
    onRestore: vi.fn(),
  }
  render(
    <AdminPanel me={yo} accounts={accounts} busy={false} error={null} notice={null} {...spies} {...over} />,
  )
  return spies
}

/** La tarjeta de una cuenta, buscada por su correo. */
const cardOf = (email: string) => screen.getByText(email).closest('li')!

/** Responde que sí a cualquier «¿seguro?», salvo cuando se pide lo contrario. */
let confirmar: ReturnType<typeof vi.fn>

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  confirmar = vi.fn(() => true)
  vi.stubGlobal('confirm', confirmar)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('sobre la propia cuenta no se ofrece nada', () => {
  it('ni quitar acceso, ni borrar, ni vaciar', () => {
    // Si esto falla, un clic deja el sistema sin nadie capaz de aprobar a
    // nadie y sin forma de arreglarlo desde la web.
    show([yo])
    const mine = cardOf(yo.email)
    for (const key of ['admin_revoke', 'admin_delete', 'admin_wipe', 'admin_approve'] as const) {
      expect(within(mine).queryByRole('button', { name: es(key) })).toBeNull()
    }
  })

  it('y se dice por qué, en vez de dejar botones apagados sin explicación', () => {
    show([yo])
    expect(within(cardOf(yo.email)).getByText(es('admin_self_note'))).toBeTruthy()
    expect(within(cardOf(yo.email)).getByText(es('admin_this_is_you'))).toBeTruthy()
  })
})

describe('la cola de solicitudes', () => {
  it('dice cuántas esperan decisión', () => {
    show([account({ userId: 'a', status: 'pending' }), account({ userId: 'b', email: 'b@x.es', status: 'pending' }), yo])
    expect(screen.getByText('2 esperando tu decisión')).toBeTruthy()
  })

  it('cuando no espera nadie, también lo dice', () => {
    show([yo])
    expect(screen.getByText(es('admin_none_waiting'))).toBeTruthy()
  })

  it('lo pendiente sale primero', () => {
    show([
      account({ userId: 'a', email: 'aprobado@x.es', status: 'approved' }),
      account({ userId: 'b', email: 'espera@x.es', status: 'pending' }),
    ])
    const emails = [...document.querySelectorAll('li')].map((li) => li.textContent)
    expect(emails[0]).toContain('espera@x.es')
  })

  it('aprobar avisa a quien cablea, con la cuenta entera', () => {
    const pendiente = account({ userId: 'nuevo', email: 'nuevo@x.es', status: 'pending' })
    const { onApprove } = show([pendiente, yo])
    fireEvent.click(within(cardOf('nuevo@x.es')).getByRole('button', { name: es('admin_approve') }))
    expect(onApprove).toHaveBeenCalledWith(pendiente)
  })

  it('a quien ya tiene acceso no se le ofrece dárselo otra vez', () => {
    show([account({ userId: 'a', email: 'dentro@x.es', status: 'approved' })])
    expect(within(cardOf('dentro@x.es')).queryByRole('button', { name: es('admin_approve') })).toBeNull()
  })

  it('a quien ya está fuera no se le ofrece echarlo otra vez', () => {
    show([account({ userId: 'a', email: 'fuera@x.es', status: 'revoked' })])
    expect(within(cardOf('fuera@x.es')).queryByRole('button', { name: es('admin_revoke') })).toBeNull()
    // Pero sí volver a dejarle entrar.
    expect(within(cardOf('fuera@x.es')).getByRole('button', { name: es('admin_approve') })).toBeTruthy()
  })
})

describe('lo irreversible pregunta antes', () => {
  const otro = () => account({ userId: 'otro', email: 'otro@x.es' })

  it('borrar el progreso pregunta, y si se dice que no, no pasa nada', () => {
    // Sin esta comprobación, alguien quita el `confirm` algún día y nada falla
    // hasta que se borra un progreso de verdad.
    confirmar.mockReturnValue(false)
    const { onWipe } = show([otro()])
    fireEvent.click(within(cardOf('otro@x.es')).getByRole('button', { name: es('admin_wipe') }))

    expect(confirmar).toHaveBeenCalledOnce()
    expect(onWipe).not.toHaveBeenCalled()
  })

  it('borrar la cuenta, igual', () => {
    confirmar.mockReturnValue(false)
    const { onDelete } = show([otro()])
    fireEvent.click(within(cardOf('otro@x.es')).getByRole('button', { name: es('admin_delete') }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('quitar el acceso, también', () => {
    confirmar.mockReturnValue(false)
    const { onRevoke } = show([otro()])
    fireEvent.click(within(cardOf('otro@x.es')).getByRole('button', { name: es('admin_revoke') }))
    expect(onRevoke).not.toHaveBeenCalled()
  })

  it('la pregunta lleva el correo dentro', () => {
    // Un «¿estás seguro?» sin nombre es lo que hace que se confirme sin leer.
    show([otro()])
    fireEvent.click(within(cardOf('otro@x.es')).getByRole('button', { name: es('admin_wipe') }))
    expect(confirmar.mock.calls[0][0]).toContain('otro@x.es')
  })

  it('bajarse el progreso no pregunta: no destruye nada', () => {
    const { onDownload } = show([otro()])
    fireEvent.click(within(cardOf('otro@x.es')).getByRole('button', { name: es('admin_download') }))
    expect(confirmar).not.toHaveBeenCalled()
    expect(onDownload).toHaveBeenCalled()
  })
})

describe('quitar el acceso y borrar los datos no son lo mismo', () => {
  it('son dos botones distintos y llaman a cosas distintas', () => {
    const otro = account({ userId: 'otro', email: 'otro@x.es' })
    const { onRevoke, onWipe, onDelete } = show([otro])
    const card = cardOf('otro@x.es')

    fireEvent.click(within(card).getByRole('button', { name: es('admin_revoke') }))
    expect(onRevoke).toHaveBeenCalledWith(otro)
    expect(onWipe).not.toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()

    fireEvent.click(within(card).getByRole('button', { name: es('admin_wipe') }))
    expect(onWipe).toHaveBeenCalledWith(otro)
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('el texto de quitar acceso promete que el progreso se queda', () => {
    // Es lo primero que se teme al pulsarlo, y es verdad.
    expect(es('admin_confirm_revoke')).toMatch(/no se borra/)
  })

  it('el de borrar progreso avisa de que no se deshace', () => {
    expect(es('admin_confirm_wipe')).toMatch(/no se puede deshacer/)
  })
})

describe('el progreso de cada uno', () => {
  it('se puede bajar', () => {
    const otro = account({ userId: 'otro', email: 'otro@x.es' })
    const { onDownload } = show([otro])
    fireEvent.click(within(cardOf('otro@x.es')).getByRole('button', { name: es('admin_download') }))
    expect(onDownload).toHaveBeenCalledWith(otro)
  })

  it('y restaurarlo desde un fichero, para esa persona', () => {
    const otro = account({ userId: 'otro', email: 'otro@x.es' })
    const { onRestore } = show([otro])
    const file = new File(['{}'], 'copia.json', { type: 'application/json' })
    const input = screen.getByLabelText(`Fichero de progreso para ${otro.email}`) as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })
    expect(onRestore).toHaveBeenCalledWith(otro, file)
  })

  it('el selector se vacía, para poder elegir el mismo fichero dos veces', () => {
    // El navegador no dispara `change` al reelegir el mismo fichero, así que
    // sin vaciarlo el segundo intento no haría nada y sin decir por qué.
    const otro = account({ userId: 'otro', email: 'otro@x.es' })
    show([otro])
    const input = screen.getByLabelText(`Fichero de progreso para ${otro.email}`) as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['{}'], 'copia.json')] } })
    expect(input.value).toBe('')
  })
})

describe('lo que cuenta de sí mismo', () => {
  it('marca quién es administrador', () => {
    show([yo, account({ userId: 'otro', email: 'otro@x.es' })])
    expect(within(cardOf(yo.email)).getByText(es('admin_role_admin'))).toBeTruthy()
    expect(within(cardOf('otro@x.es')).queryByText(es('admin_role_admin'))).toBeNull()
  })

  it('mientras trabaja, no acepta más clics', () => {
    show([account({ userId: 'otro', email: 'otro@x.es' })], { busy: true })
    for (const button of within(cardOf('otro@x.es')).getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('enseña el fallo de la base tal cual', () => {
    show([yo], { error: '42501 — new row violates row-level security policy' })
    expect(screen.getByText('42501 — new row violates row-level security policy')).toBeTruthy()
  })

  it('y confirma lo que sale bien', () => {
    show([yo], { notice: 'nuevo@x.es ya puede entrar.' })
    expect(screen.getByText('nuevo@x.es ya puede entrar.')).toBeTruthy()
  })

  it('sin ninguna cuenta, lo dice', () => {
    show([])
    expect(screen.getByText(es('admin_empty'))).toBeTruthy()
  })
})

describe('en inglés', () => {
  it('cambia de idioma', () => {
    useLocaleStore.setState({ locale: 'en' })
    show([account({ userId: 'otro', email: 'otro@x.es', status: 'pending' })])
    expect(screen.getByText(DICT.admin_status_pending.en)).toBeTruthy()
  })
})
