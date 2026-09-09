// El contador de uso es lo que convierte «5 horas semanales» en un número
// real, y sus reglas son afirmaciones fuertes: sólo cuenta con la pestaña
// visible y sólo si ha habido interacción reciente. Si alguna deja de
// cumplirse, el calendario sigue pintando barras — pero mide otra cosa, y una
// pestaña olvidada toda la tarde pasa por estudio.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, useStudyStore } from './studyStore'
import { useStudyTracker } from './useStudyTracker'

const TICK_MS = 15_000

function Probe() {
  useStudyTracker()
  return null
}

/** El estado de visibilidad de jsdom es de sólo lectura por defecto. */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

function logged(): number {
  return Object.values(useStudyStore.getState().dayLog).reduce((a, b) => a + b, 0)
}

/** Avanza el reloj y los temporizadores dentro de act, para que los cambios de
 * estado que provoquen queden confirmados antes de comprobar nada. */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  useStudyStore.setState({ profile: DEFAULT_PROFILE, settings: DEFAULT_SETTINGS, dayLog: {} })
  setVisibility('visible')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('contador de uso', () => {
  it('suma mientras la pestaña está visible y hay actividad reciente', async () => {
    render(<Probe />)
    await advance(TICK_MS * 4)
    expect(logged()).toBe(TICK_MS / 1000 * 4)
  })

  it('no suma nada con la pestaña en segundo plano', async () => {
    render(<Probe />)
    setVisibility('hidden')
    await advance(TICK_MS * 10)
    expect(logged()).toBe(0)
  })

  it('reanuda al volver a la pestaña, y volver cuenta como actividad', async () => {
    render(<Probe />)
    setVisibility('hidden')
    await advance(TICK_MS * 4)
    expect(logged()).toBe(0)

    setVisibility('visible')
    await advance(TICK_MS * 2)
    expect(logged()).toBe(30)
  })

  it('deja de contar tras el umbral de inactividad', async () => {
    useStudyStore.getState().updateSettings({ idleTimeoutMinutes: 1 })
    render(<Probe />)

    // Dentro del minuto todavía cuenta.
    await advance(TICK_MS * 3)
    expect(logged()).toBe(45)

    // Pasado el minuto sin tocar nada, se detiene.
    await advance(TICK_MS * 10)
    expect(logged()).toBe(60)
  })

  it('cualquier interacción reinicia el reloj de inactividad', async () => {
    useStudyStore.getState().updateSettings({ idleTimeoutMinutes: 1 })
    render(<Probe />)
    await advance(TICK_MS * 5)
    const afterIdle = logged()

    await act(async () => {
      window.dispatchEvent(new Event('keydown'))
    })
    await advance(TICK_MS * 3)
    expect(logged()).toBeGreaterThan(afterIdle)
  })

  it('no cuenta nada si el seguimiento está desactivado', async () => {
    useStudyStore.getState().updateSettings({ trackUsage: false })
    render(<Probe />)
    await advance(TICK_MS * 10)
    expect(logged()).toBe(0)
  })

  it('deja de contar al desmontarse, sin dejar el temporizador vivo', async () => {
    const { unmount } = render(<Probe />)
    await advance(TICK_MS * 2)
    const before = logged()
    unmount()
    await advance(TICK_MS * 10)
    expect(logged()).toBe(before)
  })

  it('un umbral de inactividad no válido no desactiva el contador', async () => {
    // Un 0 guardado por un ajuste manual dejaría idleMs en 0 y el contador no
    // sumaría nunca; el hook lo eleva al mínimo de un minuto.
    useStudyStore.getState().updateSettings({ idleTimeoutMinutes: 0 })
    render(<Probe />)
    await advance(TICK_MS * 2)
    expect(logged()).toBeGreaterThan(0)
  })
})
