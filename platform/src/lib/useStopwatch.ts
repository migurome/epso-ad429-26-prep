import { useCallback, useEffect, useRef, useState } from 'react'

export interface Stopwatch {
  /** Segundos contados, sumando todos los tramos en marcha. */
  seconds: number
  running: boolean
  /** Arranca si está parado; para si está en marcha. */
  toggle: () => void
  /** Vuelve a cero y se queda parado. */
  reset: () => void
}

/**
 * Un cronómetro que maneja quien estudia, no la aplicación.
 *
 * Antes arrancaba solo al abrir la pregunta y no había forma de pararlo. Eso
 * contaba como tiempo de examen abrir una pregunta para ojearla, levantarse a
 * por un café con la pestaña abierta, o volver a leer la explicación de algo
 * ya contestado. El número salía siempre inflado y por tanto no servía para
 * nada. Ahora se arranca a propósito, se para a propósito, y se pone a cero
 * para volver a intentar la misma pregunta en serio.
 *
 * Es el gemelo de `useCountdown`, y se diferencia en algo que parece menor y no
 * lo es: aquí el tiempo **no se detiene al llegar al objetivo**. El ritmo de
 * examen es una referencia, no una guillotina; quien tarda el doble en una
 * pregunta difícil quiere saber cuánto se pasó, y un contador clavado en 0:00
 * se lo oculta justo cuando más dice.
 *
 * El transcurrido se calcula contra una marca absoluta y no acumulando ticks:
 * los navegadores frenan los temporizadores de las pestañas en segundo plano
 * —a menudo a uno por minuto—, así que un contador de `setInterval(…, 1000)`
 * se quedaría atrás del reloj real en cuanto se cambia de pestaña. Al parar se
 * guarda lo corrido y al reanudar se sigue sumando desde ahí, que es lo que
 * distingue una pausa de un reinicio.
 */
export function useStopwatch(): Stopwatch {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  // Lo acumulado en los tramos ya cerrados, y el instante en que arrancó el
  // tramo actual. Van en refs porque cambiarlos no tiene por qué repintar.
  const carried = useRef(0)
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const start = Date.now()
    startedAt.current = start
    const tick = () => setSeconds(carried.current + Math.floor((Date.now() - start) / 1000))
    tick()
    const id = window.setInterval(tick, 250)
    return () => {
      window.clearInterval(id)
      // Al desmontar o al parar se cierra el tramo: sin esto, reanudar
      // empezaría de nuevo desde el último arranque y se perdería lo corrido.
      //
      // Salvo que el tramo ya esté cerrado, que es lo que hace `reset` al
      // poner `startedAt` a null. Sin esta comprobación, poner a cero un reloj
      // EN MARCHA volvía a sumar aquí los segundos que el reinicio acababa de
      // borrar, y el contador saltaba de 0 a 25 al arrancarlo de nuevo.
      if (startedAt.current !== start) return
      carried.current += Math.floor((Date.now() - start) / 1000)
      startedAt.current = null
    }
  }, [running])

  const toggle = useCallback(() => setRunning((on) => !on), [])

  const reset = useCallback(() => {
    carried.current = 0
    startedAt.current = null
    setSeconds(0)
    setRunning(false)
  }, [])

  return { seconds, running, toggle, reset }
}
