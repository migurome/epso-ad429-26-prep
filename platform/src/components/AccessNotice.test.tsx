// Las tres pantallas de «hay sesión, pero no entras».
//
// Se prueban juntas porque lo que importa es que NO digan lo mismo: son tres
// situaciones distintas y confundirlas es mentirle al candidato sobre lo que le
// pasa y sobre lo que puede hacer.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AccessNotice } from './AccessNotice'
import { DICT } from '../lib/dictionary'
import { useLocaleStore } from '../lib/localeStore'

const es = (key: keyof typeof DICT) => DICT[key].es

beforeEach(() => useLocaleStore.setState({ locale: 'es' }))
afterEach(cleanup)

const show = (over: Partial<Parameters<typeof AccessNotice>[0]> = {}) => {
  const onRetry = vi.fn()
  const onSignOut = vi.fn()
  render(
    <AccessNotice
      kind="pending"
      email="yo@ejemplo.es"
      onRetry={onRetry}
      onSignOut={onSignOut}
      {...over}
    />,
  )
  return { onRetry, onSignOut }
}

describe('pendiente de aprobación', () => {
  it('dice que la cuenta existe y espera a una persona', () => {
    show()
    expect(screen.getByText(es('access_pending_title'))).toBeTruthy()
    expect(screen.getByText(es('access_pending_body'))).toBeTruthy()
  })

  it('no enseña ningún motivo técnico: no hay nada roto', () => {
    // Un error de base de datos aquí sería ruido que asusta sin motivo.
    const { container } = render(
      <AccessNotice kind="pending" email="yo@ejemplo.es" failure="no hay red" onRetry={vi.fn()} onSignOut={vi.fn()} />,
    )
    expect(container.textContent).not.toContain('no hay red')
  })
})

describe('revocado', () => {
  it('dice que fue una decisión, no un fallo', () => {
    show({ kind: 'revoked' })
    expect(screen.getByText(es('access_revoked_title'))).toBeTruthy()
  })

  it('promete que el progreso sigue ahí', () => {
    // Es lo primero que se teme al ver esta pantalla, y es verdad: revocar el
    // acceso y borrar los datos son dos acciones distintas.
    show({ kind: 'revoked' })
    expect(es('access_revoked_body')).toMatch(/no se ha borrado/)
    expect(screen.getByText(es('access_revoked_body'))).toBeTruthy()
  })
})

describe('no se ha podido comprobar', () => {
  it('dice que no se sabe, no que no puedas', () => {
    // La distinción entera de `phaseOf`, puesta en palabras para el candidato.
    show({ kind: 'unavailable', failure: "Could not find the table 'public.profiles'" })
    expect(screen.getByText(es('access_unavailable_title'))).toBeTruthy()
    expect(es('access_unavailable_body')).toMatch(/No es que no tengas acceso/)
  })

  it('enseña el fallo tal cual, que es lo único que permite arreglarlo', () => {
    show({ kind: 'unavailable', failure: "Could not find the table 'public.profiles'" })
    expect(screen.getByText("Could not find the table 'public.profiles'")).toBeTruthy()
  })

  it('aguanta no tener motivo que enseñar', () => {
    const { container } = render(
      <AccessNotice kind="unavailable" email={null} failure={null} onRetry={vi.fn()} onSignOut={vi.fn()} />,
    )
    expect(container.textContent).toContain(es('access_unavailable_title'))
  })
})

describe('en las tres', () => {
  it('se puede reintentar y se puede salir', () => {
    // Salir importa: sin ese botón, quien entre con la cuenta equivocada se
    // queda encerrado en esta pantalla sin manera de probar con otra.
    const { onRetry, onSignOut } = show()
    fireEvent.click(screen.getByRole('button', { name: es('access_retry') }))
    fireEvent.click(screen.getByRole('button', { name: es('user_menu_sign_out') }))

    expect(onRetry).toHaveBeenCalledOnce()
    expect(onSignOut).toHaveBeenCalledOnce()
  })

  it('se dice con qué cuenta se ha entrado', () => {
    // Con dos cuentas, saber cuál de las dos está esperando lo es todo.
    show()
    expect(screen.getByText(/yo@ejemplo\.es/)).toBeTruthy()
  })

  it('sin correo conocido, no se inventa ninguno', () => {
    const { container } = render(
      <AccessNotice kind="pending" email={null} onRetry={vi.fn()} onSignOut={vi.fn()} />,
    )
    expect(container.textContent).not.toContain('@')
  })
})

describe('en inglés', () => {
  it('cambia de idioma', () => {
    useLocaleStore.setState({ locale: 'en' })
    show()
    expect(screen.getByText(DICT.access_pending_title.en)).toBeTruthy()
  })
})
