// El formulario de acceso.
//
// Antes esto probaba una contraseña compilada en el paquete y la penalización
// de tres segundos al fallar. Las dos cosas desaparecieron con las cuentas de
// verdad: frenar el tanteo ya no es asunto de la web, sino del servidor de
// Supabase, que además lo hace de verdad.
//
// Lo que queda por comprobar es lo que el candidato ve y hace: que no pueda
// enviar un formulario vacío, que el fallo se lea tal cual, que el formulario
// sepa cambiar entre entrar y registrarse, y —lo que más importa— que registrar
// una cuenta **avise de que no da acceso** antes de pulsar, no después.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LoginForm } from './LoginForm'
import { DICT } from '../lib/dictionary'
import { useLocaleStore } from '../lib/localeStore'

const es = (key: keyof typeof DICT) => DICT[key].es

type SignInFn = (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>

function setup(over: { onSignIn?: SignInFn; onSignUp?: SignInFn } = {}) {
  const onSignIn = over.onSignIn ?? vi.fn(async () => ({ ok: true }) as const)
  const onSignUp = over.onSignUp ?? vi.fn(async () => ({ ok: true }) as const)
  render(<LoginForm onSignIn={onSignIn} onSignUp={onSignUp} />)
  return { onSignIn, onSignUp }
}

const fill = (email = 'yo@ejemplo.es', password = 'secreta') => {
  fireEvent.change(screen.getByLabelText(es('login_email')), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(es('login_password')), { target: { value: password } })
}

beforeEach(() => useLocaleStore.setState({ locale: 'es' }))
afterEach(cleanup)

describe('entrar', () => {
  it('no se puede enviar vacío', () => {
    setup()
    expect((screen.getByRole('button', { name: es('login_submit') }) as HTMLButtonElement).disabled)
      .toBe(true)
  })

  it('con correo y contraseña, entra', async () => {
    const { onSignIn } = setup()
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_submit') }))

    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith('yo@ejemplo.es', 'secreta'))
  })

  it('la contraseña no se enseña', () => {
    setup()
    expect((screen.getByLabelText(es('login_password')) as HTMLInputElement).type).toBe('password')
  })
})

describe('cuando el acceso falla', () => {
  const rechaza = vi.fn(async () => ({ ok: false, message: 'Invalid login credentials' }) as const)

  it('enseña lo que dijo el servidor, tal cual', async () => {
    setup({ onSignIn: rechaza })
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_submit') }))

    expect(await screen.findByText('Invalid login credentials')).toBeTruthy()
  })

  it('borra la contraseña pero deja el correo escrito', async () => {
    // Quien se equivoca al teclear la contraseña no se ha equivocado de correo,
    // y hacerle escribirlo otra vez es castigarle dos veces.
    setup({ onSignIn: rechaza })
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_submit') }))

    await screen.findByText('Invalid login credentials')
    expect((screen.getByLabelText(es('login_password')) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(es('login_email')) as HTMLInputElement).value).toBe(
      'yo@ejemplo.es',
    )
  })
})

describe('crear una cuenta', () => {
  it('avisa de que registrarse no da acceso, antes de pulsar', () => {
    // Es lo que evita que alguien se registre, aterrice en una pantalla de
    // espera y crea que la web se ha roto.
    setup()
    expect(screen.getByText(es('login_note'))).toBeTruthy()
    expect(es('login_note')).toMatch(/no da acceso/)
  })

  it('el formulario cambia a registro y vuelve', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: es('login_create') }))
    expect(screen.getByRole('button', { name: es('login_create_submit') })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: es('login_have_account') }))
    expect(screen.getByRole('button', { name: es('login_submit') })).toBeTruthy()
  })

  it('registrarse llama a registrarse, no a entrar', async () => {
    const { onSignIn, onSignUp } = setup()
    fireEvent.click(screen.getByRole('button', { name: es('login_create') }))
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_create_submit') }))

    await waitFor(() => expect(onSignUp).toHaveBeenCalledWith('yo@ejemplo.es', 'secreta'))
    expect(onSignIn).not.toHaveBeenCalled()
  })

  it('cambiar de modo borra el error anterior', async () => {
    setup({ onSignIn: vi.fn(async () => ({ ok: false, message: 'Invalid login credentials' })) })
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_submit') }))
    await screen.findByText('Invalid login credentials')

    fireEvent.click(screen.getByRole('button', { name: es('login_create') }))
    expect(screen.queryByText('Invalid login credentials')).toBeNull()
  })
})

describe('el idioma', () => {
  it('se puede cambiar desde la propia puerta', () => {
    // Antes de entrar no hay Ajustes donde cambiarlo, así que tiene que estar
    // aquí o quien prefiera inglés no puede llegar a él.
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'en' }))
    expect(useLocaleStore.getState().locale).toBe('en')
    expect(screen.getByText(DICT.login_subtitle.en)).toBeTruthy()
  })
})

