// El menú de usuario es ahora la única puerta a progreso, calendario, día del
// examen, ajustes y verificación: si no abre, esas cinco páginas quedan sin
// enlace en toda la aplicación y sólo se llega a ellas escribiendo la URL.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserMenu, initialsOf } from './UserMenu'
import { DEFAULT_PROFILE, useStudyStore } from '../../lib/studyStore'
import { useLocaleStore } from '../../lib/localeStore'
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

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useStudyStore.setState({ profile: { ...DEFAULT_PROFILE } })
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

  it('abre con los cinco apartados del candidato', () => {
    renderMenu()
    openMenu()
    for (const key of ['nav_progress', 'nav_calendar', 'nav_test_day', 'nav_settings', 'nav_selfcheck'] as const) {
      expect(screen.getByRole('menuitem', { name: new RegExp(es(key)) })).toBeTruthy()
    }
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

  it('sin nombre configurado invita a ponerlo', () => {
    renderMenu()
    openMenu()
    expect(screen.getByText(es('user_menu_anonymous'))).toBeTruthy()
    expect(screen.getByText(es('user_menu_set_name'))).toBeTruthy()
  })

  it('con nombre y correo, los enseña y usa sus iniciales', () => {
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, displayName: 'Miguel Romero', email: 'miguel@ejemplo.eu' },
    })
    renderMenu()
    expect(screen.getByRole('button', { name: es('user_menu_label') }).textContent).toBe('MR')
    openMenu()
    expect(screen.getByText('Miguel Romero')).toBeTruthy()
    expect(screen.getByText('miguel@ejemplo.eu')).toBeTruthy()
  })
})
