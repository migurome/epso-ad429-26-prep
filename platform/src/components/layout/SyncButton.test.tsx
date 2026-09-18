// El botón de guardar de la cabecera.
//
// Responde a una sola pregunta, la que se hace el candidato cuando lleva una
// hora estudiando: ¿esto se ha guardado? Así que lo que se comprueba es que la
// respuesta esté a la vista y sea verdad —incluido el caso de no haberse
// guardado nunca, que es el que más importa no disimular—.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SyncButton } from './SyncButton'
import { DICT } from '../../lib/dictionary'
import { useSyncStore } from '../../lib/syncStore'
import { useAccountStore } from '../../lib/accountStore'
import { useLocaleStore } from '../../lib/localeStore'

const es = (key: keyof typeof DICT) => DICT[key].es
const AHORA = new Date('2026-09-18T12:00:00.000Z')
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(AHORA)
  useLocaleStore.setState({ locale: 'es' })
  useSyncStore.setState({ auto: true, status: 'idle', error: null, lastSyncAt: null, sync: {} })
  // Sin cuenta: pulsar no sale a la red, y eso es lo que permite probar el
  // cableado del botón aquí mismo.
  useAccountStore.setState({ started: true, userId: null, email: null, account: null, failure: null })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('qué dice', () => {
  it('sin haber guardado nunca, lo dice en vez de callarse', () => {
    render(<SyncButton />)
    expect(screen.getByText(es('sync_ago_never'))).toBeTruthy()
  })

  it('recién guardado', () => {
    useSyncStore.setState({ status: 'ready', lastSyncAt: hace(10_000) })
    render(<SyncButton />)
    expect(screen.getByText(es('sync_ago_now'))).toBeTruthy()
  })

  it('hace unos minutos, con el número', () => {
    useSyncStore.setState({ status: 'ready', lastSyncAt: hace(7 * 60_000) })
    render(<SyncButton />)
    expect(screen.getByText('Guardado hace 7 min')).toBeTruthy()
  })

  it('hace horas', () => {
    useSyncStore.setState({ status: 'ready', lastSyncAt: hace(3 * 3_600_000) })
    render(<SyncButton />)
    expect(screen.getByText('Guardado hace 3 h')).toBeTruthy()
  })

  it('el texto se refresca solo con el paso del tiempo', () => {
    // Nada vuelve a pintar la cabecera mientras se estudia; sin el reloj
    // interno, esto diría «Guardado ahora» una hora después.
    useSyncStore.setState({ status: 'ready', lastSyncAt: AHORA.toISOString() })
    render(<SyncButton />)
    expect(screen.getByText(es('sync_ago_now'))).toBeTruthy()

    // `act` porque el repintado lo dispara un temporizador, no un clic: sin
    // él React deja el cambio de estado sin aplicar y el texto no cambia.
    act(() => vi.advanceTimersByTime(5 * 60_000))
    expect(screen.getByText('Guardado hace 5 min')).toBeTruthy()
  })

  it('la hora exacta está en el título, para quien la necesite', () => {
    // La hora se compara con la que daría el propio navegador: fijar aquí una
    // cadena haría que el test dependiera de la zona horaria de quien lo corra.
    const cuando = hace(7 * 60_000)
    useSyncStore.setState({ status: 'ready', lastSyncAt: cuando })
    render(<SyncButton />)
    expect(screen.getByRole('button').getAttribute('title')).toContain(
      new Date(cuando).toLocaleString('es-ES'),
    )
  })
})

describe('qué hace', () => {
  it('su nombre accesible dice la acción y el estado', () => {
    // Sólo el texto visible no dice qué hace el botón; sólo la acción pierde
    // lo que se viene a mirar.
    useSyncStore.setState({ status: 'ready', lastSyncAt: hace(7 * 60_000) })
    render(<SyncButton />)
    expect(screen.getByRole('button', { name: /Sincronizar ahora/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /7 min/ })).toBeTruthy()
  })

  it('al pulsarlo pide una pasada', () => {
    // Sin cuenta, la pasada termina en «idle» sin tocar la red: que el estado
    // cambie es la prueba de que el botón está cableado a algo.
    useSyncStore.setState({ status: 'error', error: 'algo fue mal' })
    render(<SyncButton />)
    fireEvent.click(screen.getByRole('button'))

    expect(useSyncStore.getState().status).toBe('idle')
  })

  it('mientras sincroniza no acepta otra pulsación', () => {
    useSyncStore.setState({ status: 'syncing' })
    render(<SyncButton />)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('sin sincronización configurada, el botón no existe', () => {
    // Prometer un guardado que no va a ninguna parte es peor que no ofrecerlo.
    useSyncStore.setState({ status: 'off' })
    const { container } = render(<SyncButton />)
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('en inglés', () => {
  it('cambia de idioma', () => {
    useLocaleStore.setState({ locale: 'en' })
    useSyncStore.setState({ status: 'ready', lastSyncAt: hace(7 * 60_000) })
    render(<SyncButton />)
    expect(screen.getByText('Saved 7 min ago')).toBeTruthy()
  })
})
