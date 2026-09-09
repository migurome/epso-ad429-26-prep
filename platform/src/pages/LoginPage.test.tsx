// La portada de acceso no protege nada secreto —las credenciales viajan en el
// paquete— pero sí tiene que hacer bien las dos cosas que promete: no dejar
// pasar con credenciales equivocadas, y cobrar la penalización de tres segundos
// antes de decir que lo son. Un fallo en lo primero abre la aplicación a
// cualquiera; uno en lo segundo convierte el tanteo en gratis.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react'
import { LoginPage } from './LoginPage'
import { credentialsMatch, useAuthStore, FAILED_ATTEMPT_DELAY_MS } from '../lib/authStore'
import { useLocaleStore } from '../lib/localeStore'
import { DICT } from '../lib/dictionary'

const es = (key: keyof typeof DICT) => DICT[key].es

const userField = () => screen.getByLabelText(es('login_user')) as HTMLInputElement
const passwordField = () => screen.getByLabelText(es('login_password')) as HTMLInputElement
const submit = () => fireEvent.click(screen.getByRole('button', { name: es('login_submit') }))

function attempt(user: string, password: string) {
  fireEvent.change(userField(), { target: { value: user } })
  fireEvent.change(passwordField(), { target: { value: password } })
  submit()
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useAuthStore.setState({ user: null })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('comprobación de credenciales', () => {
  it('acepta las correctas', () => {
    expect(credentialsMatch('migurome', 'migurome')).toBe(true)
  })

  it('el usuario no distingue mayúsculas ni espacios de sobra', () => {
    expect(credentialsMatch('  MiGuRoMe ', 'migurome')).toBe(true)
  })

  it('la contraseña sí distingue mayúsculas', () => {
    // Recortar o normalizar la contraseña ampliaría en silencio lo que abre la
    // puerta, que es justo lo contrario de lo que hace una contraseña.
    expect(credentialsMatch('migurome', 'Migurome')).toBe(false)
  })

  it('rechaza usuario o contraseña equivocados', () => {
    expect(credentialsMatch('otro', 'migurome')).toBe(false)
    expect(credentialsMatch('migurome', 'otra')).toBe(false)
    expect(credentialsMatch('', '')).toBe(false)
  })
})

describe('portada de acceso', () => {
  it('las credenciales correctas abren la sesión', () => {
    render(<LoginPage />)
    attempt('migurome', 'migurome')
    expect(useAuthStore.getState().user).toBe('migurome')
  })

  it('las incorrectas no abren nada', () => {
    render(<LoginPage />)
    attempt('migurome', 'otra')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('fallar cuesta tres segundos antes de decirlo', () => {
    render(<LoginPage />)
    attempt('migurome', 'otra')

    // Durante la espera no se acusa el fallo todavía, y no se puede reintentar.
    expect(screen.queryByText(es('login_error'))).toBeNull()
    expect((screen.getByRole('button', { name: es('login_checking') }) as HTMLButtonElement).disabled).toBe(true)

    act(() => vi.advanceTimersByTime(FAILED_ATTEMPT_DELAY_MS - 1))
    expect(screen.queryByText(es('login_error'))).toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByText(es('login_error'))).toBeTruthy()
    expect((screen.getByRole('button', { name: es('login_submit') }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('durante la penalización no se admiten más intentos', () => {
    render(<LoginPage />)
    attempt('migurome', 'otra')

    // El botón queda deshabilitado, pero eso solo es la primera barrera:
    // enviando el formulario directamente (Intro, o el DOM a mano) el castigo
    // tiene que seguir en pie, o no cuesta nada saltárselo.
    fireEvent.change(passwordField(), { target: { value: 'migurome' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('tras fallar, la contraseña se limpia', () => {
    render(<LoginPage />)
    attempt('migurome', 'otra')
    act(() => vi.advanceTimersByTime(FAILED_ATTEMPT_DELAY_MS))
    expect(passwordField().value).toBe('')
  })

  it('acertar tras haber fallado entra sin castigo', () => {
    render(<LoginPage />)
    attempt('migurome', 'otra')
    act(() => vi.advanceTimersByTime(FAILED_ATTEMPT_DELAY_MS))
    attempt('migurome', 'migurome')
    expect(useAuthStore.getState().user).toBe('migurome')
  })
})
