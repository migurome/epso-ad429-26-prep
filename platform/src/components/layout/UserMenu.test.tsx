// El menú de usuario es la única puerta a progreso, calendario, día del examen
// y ajustes: si no abre, esas páginas quedan sin enlace en toda la aplicación y
// sólo se llega a ellas escribiendo la URL.
//
// Y lleva dos apartados más cuando quien mira manda: administración y
// verificación. Esconderlos no es la protección —esa la ponen las rutas y la
// base de datos—, es no ofrecerle a un candidato una puerta cerrada.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserMenu, initialsOf } from './UserMenu'
import { DEFAULT_PROFILE, useStudyStore } from '../../lib/studyStore'
import { useLocaleStore } from '../../lib/localeStore'
import { useAccountStore } from '../../lib/accountStore'
import { DICT } from '../../lib/dictionary'

const es = (key: keyof typeof DICT) => DICT[key].es

function renderMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  )
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: es('user_menu_label') }))

const cuenta = (role: 'candidate' | 'admin') => ({
  userId: 'u1',
  email: 'yo@ejemplo.es',
  role,
  status: 'approved' as const,
  createdAt: '2026-09-18T07:00:00.000Z',
  decidedAt: null,
})

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useStudyStore.setState({ profile: { ...DEFAULT_PROFILE } })
  useAccountStore.setState({
    started: true,
    userId: 'u1',
    email: 'yo@ejemplo.es',
    account: cuenta('candidate'),
    failure: null,
  })
})

afterEach(cleanup)

describe('iniciales del avatar', () => {
  it('sin nombre no hay iniciales', () => {
    expect(initialsOf('')).toBe('')
    expect(initialsOf('   ')).toBe('')
  })

  it('un solo nombre da una inicial', () => {
    expect(initialsOf('miguel')).toBe('M')
  })

  it('nombre y apellido dan dos', () => {
    expect(initialsOf('Miguel Romero')).toBe('MR')
  })

  it('no pasa de dos aunque haya más palabras', () => {
    // Tres letras no caben en el círculo, y un nombre compuesto no debería
    // deformar la barra superior.
    expect(initialsOf('Miguel  Romero   Gómez')).toBe('MR')
  })
})

describe('menú de usuario', () => {
  it('empieza cerrado', () => {
    renderMenu()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('abre con los cuatro apartados del candidato', () => {
    renderMenu()
    openMenu()
    for (const key of ['nav_progress', 'nav_calendar', 'nav_test_day', 'nav_settings'] as const) {
      expect(screen.getByRole('menuitem', { name: new RegExp(es(key)) })).toBeTruthy()
    }
  })

  it('a un candidato no le ofrece administración ni verificación', () => {
    renderMenu()
    openMenu()
    expect(screen.queryByRole('menuitem', { name: new RegExp(es('nav_admin')) })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: new RegExp(es('nav_selfcheck')) })).toBeNull()
  })

  it('al administrador sí', () => {
    useAccountStore.setState({ account: cuenta('admin') })
    renderMenu()
    openMenu()
    expect(screen.getByRole('menuitem', { name: new RegExp(es('nav_admin')) })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: new RegExp(es('nav_selfcheck')) })).toBeTruthy()
  })

  it('un administrador revocado deja de mandar también en el menú', () => {
    // El papel sin el estado no basta: revocar a alguien tiene que desarmarlo
    // en todas partes, no sólo en la base de datos.
    useAccountStore.setState({ account: { ...cuenta('admin'), status: 'revoked' } })
    renderMenu()
    openMenu()
    expect(screen.queryByRole('menuitem', { name: new RegExp(es('nav_admin')) })).toBeNull()
  })

  it('vuelve a pulsar y se cierra', () => {
    renderMenu()
    openMenu()
    openMenu()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('Escape lo cierra', () => {
    renderMenu()
    openMenu()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('pulsar fuera lo cierra', () => {
    // Sin esto, un menú abierto se queda tapando la esquina de la página.
    renderMenu()
    openMenu()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('sin nombre configurado, llama candidato a quien mira', () => {
    renderMenu()
    openMenu()
    expect(screen.getByText(es('user_menu_anonymous'))).toBeTruthy()
  })

  it('el correo que enseña es el de la cuenta, no el de Ajustes', () => {
    // Son dos cosas distintas: el de la cuenta es la identidad de verdad y el
    // de Ajustes algo que el candidato escribe para sí mismo. Enseñar uno u
    // otro según el día sería tener dos identidades a la vista.
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, email: 'el-que-escribí@ejemplo.eu' },
    })
    renderMenu()
    openMenu()
    expect(screen.getByText('yo@ejemplo.es')).toBeTruthy()
    expect(screen.queryByText('el-que-escribí@ejemplo.eu')).toBeNull()
  })

  it('con nombre puesto, lo enseña y usa sus iniciales', () => {
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, displayName: 'Miguel Romero' },
    })
    renderMenu()
    expect(screen.getByRole('button', { name: es('user_menu_label') }).textContent).toBe('MR')
    openMenu()
    expect(screen.getByText('Miguel Romero')).toBeTruthy()
    expect(screen.getByText('yo@ejemplo.es')).toBeTruthy()
  })
})
