// El cronómetro de las preguntas sueltas.
//
// Dos cosas que vigilar, y la segunda es nueva:
//
//   1. Que NO se pare al llegar al ritmo de examen: el contador es una
//      referencia, no una guillotina, y lo interesante de una pregunta que
//      costó el doble es justo el tiempo que pasó de largo.
//   2. Que pausar sea pausar. Lo maneja quien estudia, así que parar y
//      reanudar tiene que SUMAR; si al reanudar empezara de cero, la pausa
//      sería un borrado encubierto y nadie se atrevería a usarla.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useStopwatch } from './useStopwatch'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const avanzar = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('el cronómetro', () => {
  it('nace parado y en cero: abrir una pregunta no es empezar a examinarse', () => {
    const { result } = renderHook(() => useStopwatch())
    avanzar(5000)
    expect(result.current.running).toBe(false)
    expect(result.current.seconds).toBe(0)
  })

  it('en marcha, cuenta segundos enteros', () => {
    const { result } = renderHook(() => useStopwatch())
    act(() => result.current.toggle())
    avanzar(3000)
    expect(result.current.seconds).toBe(3)
  })

  it('no se detiene al pasar el ritmo de examen', () => {
    const { result } = renderHook(() => useStopwatch())
    act(() => result.current.toggle())
    avanzar(140_000)
    expect(result.current.seconds).toBe(140)
  })

  it('al pararlo conserva lo contado, que es lo que se guarda', () => {
    const { result } = renderHook(() => useStopwatch())
    act(() => result.current.toggle())
    avanzar(42_000)
    act(() => result.current.toggle())
    expect(result.current.running).toBe(false)
    expect(result.current.seconds).toBe(42)
  })

  it('parado, el tiempo deja de correr de verdad', () => {
    const { result } = renderHook(() => useStopwatch())
    act(() => result.current.toggle())
    avanzar(10_000)
    act(() => result.current.toggle())
    avanzar(60_000)
    expect(result.current.seconds).toBe(10)
  })

  it('reanudar suma, no reinicia', () => {
    // Es la razón de ser de la pausa: levantarse de la mesa no puede costar
    // el tiempo ya invertido en la pregunta.
    const { result } = renderHook(() => useStopwatch())
    act(() => result.current.toggle())
    avanzar(30_000)
    act(() => result.current.toggle())
    avanzar(5_000)
    act(() => result.current.toggle())
    avanzar(12_000)
    expect(result.current.seconds).toBe(42)
  })

  it('ponerlo a cero lo deja parado y en cero', () => {
    const { result } = renderHook(() => useStopwatch())
    act(() => result.current.toggle())
    avanzar(25_000)
    act(() => result.current.reset())
    expect(result.current.seconds).toBe(0)
    expect(result.current.running).toBe(false)
  })

  it('tras ponerlo a cero, arrancar cuenta desde cero y no desde lo anterior', () => {
    const { result } = renderHook(() => useStopwatch())
    act(() => result.current.toggle())
    avanzar(25_000)
    act(() => result.current.reset())
    act(() => result.current.toggle())
    avanzar(3_000)
    expect(result.current.seconds).toBe(3)
  })
})
