// La tarjeta de sincronización.
//
// Perdió el formulario de acceso: entrar en la web ya es entrar en la cuenta,
// así que aquí sólo queda mirar cómo va, forzar una pasada y apagar el guardado
// automático.
//
// Lo que NO se prueba aquí es hablar con Supabase: hace falta cuenta y red. Lo
// que sí está probado entero, sin red, es la decisión de qué se sube y qué se
// fusiona (remoteSync.test.ts) y la traducción de la fila (supabaseState).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SyncCard } from './SyncCard'
import { DICT } from '../lib/dictionary'
import { useSyncStore } from '../lib/syncStore'
import { useLocaleStore } from '../lib/localeStore'

const es = (key: keyof typeof DICT) => DICT[key].es

const remembered = {
  ref: 'u1',
  version: '2026-09-18T07:00:00.000Z',
  fingerprint: 'huella',
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useSyncStore.setState({
    auto: true,
    status: 'idle',
    error: null,
    lastSyncAt: null,
    sync: {},
  })
})

afterEach(cleanup)

describe('sin configurar', () => {
  it('lo dice y no ofrece nada que pulsar', () => {
    useSyncStore.setState({ status: 'off' })
    render(<SyncCard />)
    expect(screen.getByText(es('sync_status_off'))).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('dice dónde se ponen la URL y la clave', () => {
    // La única cara dirigida a quien monta la web, no a quien estudia.
    useSyncStore.setState({ status: 'off' })
    render(<SyncCard />)
    expect(screen.getByText(/supabaseConfig\.ts/)).toBeTruthy()
  })
})

describe('configurada', () => {
  it('todavía no ha sincronizado, y lo dice', () => {
    render(<SyncCard />)
    expect(screen.getByText(es('sync_never'))).toBeTruthy()
    expect(screen.getByRole('button', { name: es('sync_now') })).toBeTruthy()
  })

  it('cuando ya sincronizó, dice cuándo', () => {
    useSyncStore.setState({ status: 'ready', lastSyncAt: '2026-09-18T07:30:00.000Z', sync: remembered })
    render(<SyncCard />)
    expect(screen.getByText(new RegExp(es('sync_last').replace('{when}', '')))).toBeTruthy()
    expect(screen.getByText(es('sync_status_ready'))).toBeTruthy()
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
    expect((screen.getByRole('button', { name: es('sync_now') }) as HTMLButtonElement).disabled)
      .toBe(true)
  })

  it('explica que la fila es sólo suya, pese a la clave pública', () => {
    // Sin esto, llevar una clave pública en el paquete parece un descuido.
    render(<SyncCard />)
    expect(screen.getByText(es('sync_private'))).toBeTruthy()
  })
})

describe('cuando algo falla', () => {
  it('enseña el motivo tal cual, para poder pegarlo en una consulta', () => {
    useSyncStore.setState({
      status: 'error',
      error: 'PGRST205 — Could not find the table public.study_state',
    })
    render(<SyncCard />)
    expect(screen.getByText('PGRST205 — Could not find the table public.study_state')).toBeTruthy()
    expect(screen.getByText(es('sync_status_error'))).toBeTruthy()
    // Y deja reintentar: un fallo de red no deja la tarjeta muerta.
    expect((screen.getByRole('button', { name: es('sync_now') }) as HTMLButtonElement).disabled)
      .toBe(false)
  })
})

describe('el almacén', () => {
  it('olvidar borra la fila de la que se venía', () => {
    // Lo llama el cambio de cuenta: lo recordado habla de la fila anterior, y
    // creerla ya subida dejaría el progreso nuevo sin subir.
    useSyncStore.setState({ sync: remembered, lastSyncAt: '2026-09-18T07:30:00.000Z' })
    useSyncStore.getState().forget()

    expect(useSyncStore.getState().sync).toEqual({})
    expect(useSyncStore.getState().lastSyncAt).toBeNull()
  })

  it('olvidar sin nada que olvidar no toca el estado', () => {
    // Pasa en cada renovación de sesión: la misma cuenta otra vez no es un
    // cambio, y reaccionar ahí subiría el estado entero sin necesidad.
    useSyncStore.setState({ status: 'ready', sync: {}, lastSyncAt: null })
    useSyncStore.getState().forget()

    expect(useSyncStore.getState().status).toBe('ready')
  })
})

describe('en inglés', () => {
  it('la tarjeta entera cambia de idioma', () => {
    useLocaleStore.setState({ locale: 'en' })
    useSyncStore.setState({ status: 'ready' })
    render(<SyncCard />)
    expect(screen.getByText(DICT.sync_status_ready.en)).toBeTruthy()
    expect(screen.queryByText(es('sync_status_ready'))).toBeNull()
  })
})
