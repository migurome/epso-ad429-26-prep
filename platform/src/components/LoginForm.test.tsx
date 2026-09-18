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
type SignUpFn = (
  email: string,
  password: string,
) => Promise<{ ok: true; inside: boolean } | { ok: false; message: string }>
type AskFn = (email: string) => Promise<{ ok: true } | { ok: false; message: string }>

function setup(over: { onSignIn?: SignInFn; onSignUp?: SignUpFn; onRequest?: AskFn } = {}) {
  const onSignIn = over.onSignIn ?? vi.fn(async () => ({ ok: true }) as const)
  const onSignUp = over.onSignUp ?? vi.fn(async () => ({ ok: true, inside: true }) as const)
  const onRequest = over.onRequest ?? vi.fn(async () => ({ ok: true }) as const)
  render(<LoginForm onSignIn={onSignIn} onSignUp={onSignUp} onRequest={onRequest} />)
  return { onSignIn, onSignUp, onRequest }
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

describe('poner la contraseña cuando ya hay un sí', () => {
  it('avisa de que aquí no se entra sin aprobación, antes de pulsar', () => {
    // Es lo que evita que alguien se registre, aterrice en una pantalla de
    // espera y crea que la web se ha roto.
    setup()
    expect(screen.getByText(es('login_note'))).toBeTruthy()
    expect(es('login_note')).toMatch(/sin que el administrador lo apruebe/)
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

  it('crear la cuenta y no quedar dentro se dice, en vez de no hacer nada', async () => {
    // Supabase contesta que sí y no devuelve sesión si hay que confirmar el
    // correo, y también —callándoselo— si esa cuenta ya existía. Sin aviso, la
    // persona pulsa y no ocurre nada: la manera más rápida de creer que la web
    // está rota.
    const fuera = vi.fn(async () => ({ ok: true, inside: false }) as const)
    setup({ onSignUp: fuera })
    fireEvent.click(screen.getByRole('button', { name: es('login_create') }))
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_create_submit') }))

    expect(await screen.findByText(es('login_created_title'))).toBeTruthy()
  })

  it('y a quien entra de verdad no se le manda a mirar el buzón', async () => {
    const { onSignUp } = setup()
    fireEvent.click(screen.getByRole('button', { name: es('login_create') }))
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_create_submit') }))

    await waitFor(() => expect(onSignUp).toHaveBeenCalled())
    expect(screen.queryByText(es('login_created_title'))).toBeNull()
  })

  it('una contraseña rechazada al crear la cuenta tampoco se queda escrita', async () => {
    // Misma razón que al entrar, y hasta ahora sin test: al partir el envío en
    // dos ramas, esta se quedó sin red y una mutación lo enseñó.
    const corta = vi.fn(async () => ({ ok: false, message: 'Password too short' }) as const)
    setup({ onSignUp: corta })
    fireEvent.click(screen.getByRole('button', { name: es('login_create') }))
    fill()
    fireEvent.click(screen.getByRole('button', { name: es('login_create_submit') }))

    await screen.findByText('Password too short')
    expect((screen.getByLabelText(es('login_password')) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(es('login_email')) as HTMLInputElement).value).toBe(
      'yo@ejemplo.es',
    )
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


describe('pedir acceso', () => {
  const ask = () => fireEvent.click(screen.getByRole('button', { name: es('login_ask') }))
  const write = (value: string) =>
    fireEvent.change(screen.getByLabelText(es('login_email')), { target: { value } })

  it('no pide contraseña: todavía no hay cuenta que proteger', () => {
    setup()
    ask()
    expect(screen.queryByLabelText(es('login_password'))).toBeNull()
  })

  it('el correo sale limpio hacia la cola', () => {
    // Si no, el mismo correo escrito de dos maneras serían dos solicitudes.
    const { onRequest } = setup()
    ask()
    write('  YO@Ejemplo.ES  ')
    fireEvent.click(screen.getByRole('button', { name: es('login_ask_submit') }))

    expect(onRequest).toHaveBeenCalledWith('yo@ejemplo.es')
  })

  it('lo que no parece un correo no llega a viajar', async () => {
    // La tabla lo rechaza igual, pero contestando con un error de Postgres.
    const { onRequest } = setup()
    ask()
    write('yo-arroba-ejemplo')
    fireEvent.click(screen.getByRole('button', { name: es('login_ask_submit') }))

    expect(await screen.findByText(es('login_ask_bad_email'))).toBeTruthy()
    expect(onRequest).not.toHaveBeenCalled()
  })

  it('enviada, dice qué pasa ahora y nombra el paso siguiente', async () => {
    setup()
    ask()
    write('yo@ejemplo.es')
    fireEvent.click(screen.getByRole('button', { name: es('login_ask_submit') }))

    expect(await screen.findByText(es('login_ask_sent_title'))).toBeTruthy()
    // Y el texto nombra el botón exacto que tendrá que pulsar al volver: sin
    // eso, quien reciba el sí no sabe por dónde entra.
    expect(es('login_ask_sent_body')).toContain(es('login_create'))
    expect(screen.queryByLabelText(es('login_email'))).toBeNull()
  })

  it('si el servidor falla no se dice que está enviada', async () => {
    const falla = vi.fn(async () => ({ ok: false, message: 'row-level security' }) as const)
    setup({ onRequest: falla })
    ask()
    write('yo@ejemplo.es')
    fireEvent.click(screen.getByRole('button', { name: es('login_ask_submit') }))

    expect(await screen.findByText('row-level security')).toBeTruthy()
    expect(screen.queryByText(es('login_ask_sent_title'))).toBeNull()
  })

  it('desde la confirmación se vuelve a entrar', async () => {
    setup()
    ask()
    write('yo@ejemplo.es')
    fireEvent.click(screen.getByRole('button', { name: es('login_ask_submit') }))
    fireEvent.click(await screen.findByRole('button', { name: es('login_ask_back') }))

    expect(screen.getByRole('button', { name: es('login_submit') })).toBeTruthy()
  })

  it('equivocarse de modo no borra lo escrito', () => {
    // Quien escribe su correo y se da cuenta de que era el otro botón no tiene
    // por qué escribirlo otra vez.
    setup()
    ask()
    write('yo@ejemplo.es')
    fireEvent.click(screen.getByRole('button', { name: es('login_have_account') }))

    expect((screen.getByLabelText(es('login_email')) as HTMLInputElement).value).toBe(
      'yo@ejemplo.es',
    )
  })
})
