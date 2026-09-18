// La tarjeta de sincronización.
//
// Lo que se comprueba aquí es que el candidato entienda en qué punto está y qué
// puede hacer: sin configurar, nada; sin entrar, entrar o crear la cuenta;
// dentro, sincronizar ahora o salir. Y que el único límite que queda —el
// guardado automático sólo corre con la pestaña abierta— esté escrito, porque
// sin él el candidato acabará creyendo que la web se ha roto.
//
// Lo que NO se prueba aquí es hablar con Supabase de verdad: hace falta cuenta
// y red. Lo que sí está probado entero, sin red, es la decisión de qué se sube
// y qué se fusiona (remoteSync.test.ts) y la traducción de la fila a estado
// (supabaseState.test.ts).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SyncCard } from './SyncCard'
import { DICT } from '../lib/dictionary'
import { useSyncStore } from '../lib/syncStore'
import { useLocaleStore } from '../lib/localeStore'

const es = (key: keyof typeof DICT) => DICT[key].es

/** Lo que el sincronizador recordaría de una cuenta ya sincronizada. */
const remembered = {
  ref: 'cuenta-vieja',
  version: '2026-09-18T07:00:00.000Z',
  fingerprint: 'huella',
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useSyncStore.setState({
    auto: true,
    status: 'off',
    error: null,
    lastSyncAt: null,
    email: null,
    sync: {},
  })
})

afterEach(cleanup)

describe('sin configurar', () => {
  it('lo dice y no ofrece nada que pulsar', () => {
    render(<SyncCard />)
    expect(screen.getByText(es('sync_status_off'))).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('dice dónde se ponen la URL y la clave', () => {
    // Es la única cara de la tarjeta dirigida a quien monta la web, no a quien
    // estudia: si no dijera el fichero, habría que buscarlo por el código.
    render(<SyncCard />)
    expect(screen.getByText(/supabaseConfig\.ts/)).toBeTruthy()
  })
})

describe('sin entrar', () => {
  beforeEach(() => {
    useSyncStore.setState({ status: 'signed-out' })
  })

  it('pide correo y contraseña, y todavía no ha sincronizado nunca', () => {
    render(<SyncCard />)
    expect(screen.getByLabelText(es('sync_email'))).toBeTruthy()
    expect(screen.getByLabelText(es('sync_password'))).toBeTruthy()
    expect(screen.getByText(es('sync_never'))).toBeTruthy()
  })

  it('no se puede entrar con los campos vacíos', () => {
    render(<SyncCard />)
    for (const name of [es('sync_in'), es('sync_up')]) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('con correo y contraseña, ya se puede entrar o crear la cuenta', () => {
    render(<SyncCard />)
    fireEvent.change(screen.getByLabelText(es('sync_email')), {
      target: { value: 'yo@ejemplo.es' },
    })
    fireEvent.change(screen.getByLabelText(es('sync_password')), { target: { value: 'secreta' } })

    for (const name of [es('sync_in'), es('sync_up')]) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(false)
    }
  })

  it('la contraseña no se enseña al escribirla', () => {
    render(<SyncCard />)
    expect((screen.getByLabelText(es('sync_password')) as HTMLInputElement).type).toBe('password')
  })

  it('explica que la fila es sólo suya, pese a la clave pública', () => {
    // Sin esto, pegar una clave pública en el paquete parece un descuido.
    render(<SyncCard />)
    expect(screen.getByText(es('sync_private'))).toBeTruthy()
  })
})

describe('dentro', () => {
  beforeEach(() => {
    useSyncStore.setState({
      status: 'ready',
      email: 'yo@ejemplo.es',
      lastSyncAt: '2026-09-18T07:30:00.000Z',
      sync: remembered,
    })
  })

  it('dice quién está dentro y cuándo fue la última vez', () => {
    render(<SyncCard />)
    expect(screen.getByText(/yo@ejemplo\.es/)).toBeTruthy()
    expect(screen.getByText(new RegExp(es('sync_last').replace('{when}', '')))).toBeTruthy()
  })

  it('ofrece sincronizar y salir, y ya no pide contraseña', () => {
    render(<SyncCard />)
    expect(screen.getByRole('button', { name: es('sync_now') })).toBeTruthy()
    expect(screen.getByRole('button', { name: es('sync_out') })).toBeTruthy()
    expect(screen.queryByLabelText(es('sync_password'))).toBeNull()
  })

  it('dice el único límite que queda: la pestaña abierta', () => {
    // El permiso de Google caducaba cada hora; la sesión de Supabase se renueva
    // sola. Queda un solo aviso, y tiene que decir eso.
    render(<SyncCard />)
    expect(screen.getByText(es('sync_auto_hint'))).toBeTruthy()
  })

  it('el guardado automático se puede apagar', () => {
    render(<SyncCard />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useSyncStore.getState().auto).toBe(false)
  })

  it('mientras sincroniza, no se puede pedir otra pasada', () => {
    useSyncStore.setState({ status: 'syncing' })
    render(<SyncCard />)
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('al salir se olvida la cuenta y lo que se sabía de su fila', async () => {
    // Quien entre después puede ser otra cuenta, y lo recordado —qué versión se
    // fusionó, qué huella se subió— hablaría de una fila que no es la suya.
    //
    // Se espera porque salir pasa por Supabase antes de tocar el almacén. Sin
    // sesión que cerrar no hay petición ninguna, y si algún día la hubiera este
    // test fallaría a la vista en vez de volverse intermitente: el olvido
    // ocurre después del `await`, así que una petición rota lo impediría.
    render(<SyncCard />)
    fireEvent.click(screen.getByRole('button', { name: es('sync_out') }))

    await waitFor(() => expect(useSyncStore.getState().email).toBeNull())
    const state = useSyncStore.getState()
    expect(state.sync).toEqual({})
    expect(state.lastSyncAt).toBeNull()
    expect(state.status).toBe('signed-out')
  })
})

describe('cuando algo falla', () => {
  it('enseña el motivo tal cual, para poder pegarlo en una consulta', () => {
    useSyncStore.setState({
      status: 'error',
      email: 'yo@ejemplo.es',
      error: 'PGRST205 — Could not find the table public.study_state',
    })
    render(<SyncCard />)
    expect(
      screen.getByText('PGRST205 — Could not find the table public.study_state'),
    ).toBeTruthy()
    expect(screen.getByText(es('sync_status_error'))).toBeTruthy()
  })

  it('un fallo al guardar no echa de la sesión', () => {
    // Volver a pedir la contraseña porque una escritura falló sería castigar al
    // candidato por un problema de red.
    useSyncStore.setState({ status: 'error', email: 'yo@ejemplo.es', error: 'no hay red' })
    render(<SyncCard />)
    expect(screen.getByRole('button', { name: es('sync_now') })).toBeTruthy()
    expect(screen.queryByLabelText(es('sync_password'))).toBeNull()
  })

  it('una contraseña equivocada sí deja volver a intentarlo', () => {
    useSyncStore.setState({ status: 'error', email: null, error: 'Invalid login credentials' })
    render(<SyncCard />)
    expect(screen.getByText('Invalid login credentials')).toBeTruthy()
    expect(screen.getByLabelText(es('sync_password'))).toBeTruthy()
  })
})

describe('el almacén', () => {
  it('entrar con otra cuenta olvida lo recordado de la anterior', () => {
    // Esto no se puede provocar desde la tarjeta —hay que salir primero—, pero
    // sí desde otra pestaña o al renovarse la sesión, y el almacén tiene que
    // aguantarlo: la fila es otra, y creerla ya subida dejaría el progreso sin
    // subir.
    useSyncStore.setState({ email: 'yo@ejemplo.es', sync: remembered, lastSyncAt: 'ayer' })
    useSyncStore.getState().setSession('otro@ejemplo.es')

    expect(useSyncStore.getState().sync).toEqual({})
    expect(useSyncStore.getState().lastSyncAt).toBeNull()
  })

  it('la misma cuenta otra vez no borra nada', () => {
    // Pasa en cada renovación de sesión, cada hora: si borrara aquí, subiría el
    // estado entero cada vez sin necesidad.
    useSyncStore.setState({ email: 'yo@ejemplo.es', sync: remembered })
    useSyncStore.getState().setSession('yo@ejemplo.es')

    expect(useSyncStore.getState().sync).toEqual(remembered)
  })
})

describe('en inglés', () => {
  it('la tarjeta entera cambia de idioma', () => {
    useLocaleStore.setState({ locale: 'en' })
    useSyncStore.setState({ status: 'ready', email: 'yo@ejemplo.es' })
    render(<SyncCard />)
    expect(screen.getByText(DICT.sync_status_ready.en)).toBeTruthy()
    expect(screen.queryByText(es('sync_status_ready'))).toBeNull()
  })
})
