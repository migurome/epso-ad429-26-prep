// El cronómetro es la pieza que hace que un simulacro sea un simulacro: si
// arranca con el tiempo sobrante del intento anterior, o si se congela al
// cambiar de pestaña, el resultado guardado no significa nada.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useCountdown } from './useCountdown'

function Harness({ total, onExpire }: { total: number; onExpire?: () => void }) {
  const [running, setRunning] = useState(false)
  const remaining = useCountdown(total, running, onExpire)
  return (
    <div>
      <span data-testid="remaining">{remaining}</span>
      <button onClick={() => setRunning(true)}>start</button>
      <button onClick={() => setRunning(false)}>stop</button>
    </div>
  )
}

const remaining = () => screen.getByTestId('remaining').textContent
const click = (label: string) => act(() => void screen.getByText(label).click())
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('counts down while running', () => {
    render(<Harness total={600} />)
    expect(remaining()).toBe('600')
    click('start')
    advance(100_000)
    expect(remaining()).toBe('500')
  })

  it('restarts from the full time on a second run', () => {
    render(<Harness total={600} />)
    click('start')
    advance(100_000)
    expect(remaining()).toBe('500')
    click('stop')
    click('start')
    expect(remaining()).toBe('600')
  })

  it('restarts from the full time after the first run expired', () => {
    const onExpire = vi.fn()
    render(<Harness total={60} onExpire={onExpire} />)
    click('start')
    advance(61_000)
    expect(remaining()).toBe('0')
    expect(onExpire).toHaveBeenCalledTimes(1)

    click('stop')
    click('start')
    expect(remaining()).toBe('60')
    // y no vuelve a expirar de inmediato
    advance(1_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  // Los navegadores limitan los temporizadores de las pestañas ocultas: un
  // contador que restara un segundo por tick se quedaría muy por detrás del
  // reloj real. Al basarse en una marca de tiempo absoluta, recupera el
  // desfase en cuanto vuelve a ejecutarse.
  it('keeps up with the wall clock when timers are throttled', () => {
    render(<Harness total={600} />)
    click('start')
    // un único tick tras 120 s de reloj real (pestaña en segundo plano)
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(remaining()).toBe('480')
  })

  it('fires onExpire exactly once', () => {
    const onExpire = vi.fn()
    render(<Harness total={5} onExpire={onExpire} />)
    click('start')
    advance(10_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })
})
