// El cronómetro de las preguntas sueltas.
//
// Lo que se vigila es que NO se pare al llegar al ritmo de examen: el contador
// es una referencia, no una guillotina, y lo interesante de una pregunta que
// costó el doble es justo el tiempo que pasó de largo.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useStopwatch } from './useStopwatch'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const avanzar = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('el cronómetro', () => {
  it('parado, no cuenta', () => {
    const { result } = renderHook(() => useStopwatch(false))
    avanzar(5000)
    expect(result.current).toBe(0)
  })

  it('en marcha, cuenta segundos enteros', () => {
    const { result } = renderHook(() => useStopwatch(true))
    avanzar(3000)
    expect(result.current).toBe(3)
  })

  it('no se detiene al pasar el ritmo de examen', () => {
    const { result } = renderHook(() => useStopwatch(true))
    avanzar(140_000)
    expect(result.current).toBe(140)
  })

  it('al pararlo conserva lo contado, que es lo que se guarda', () => {
    const { result, rerender } = renderHook(({ on }) => useStopwatch(on), {
      initialProps: { on: true },
    })
    avanzar(42_000)
    rerender({ on: false })
    expect(result.current).toBe(42)
  })

  it('volver a arrancarlo empieza de cero', () => {
    // Si no, la segunda pregunta heredaría el tiempo de la primera.
    const { result, rerender } = renderHook(({ on }) => useStopwatch(on), {
      initialProps: { on: true },
    })
    avanzar(30_000)
    rerender({ on: false })
    rerender({ on: true })
    expect(result.current).toBe(0)
    avanzar(2000)
    expect(result.current).toBe(2)
  })
})
