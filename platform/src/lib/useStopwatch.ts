import { useEffect, useRef, useState } from 'react'

/**
 * Segundos transcurridos desde que `running` pasó a true, y 0 mientras no lo
 * esté. Al pararse conserva el último valor, que es el que se guarda.
 *
 * Es el gemelo de `useCountdown` y existe por una diferencia que parece menor y
 * no lo es: aquí el tiempo **no se detiene al llegar al objetivo**. El ritmo de
 * examen es una referencia, no una guillotina; quien tarda el doble en una
 * pregunta difícil quiere saber cuánto se pasó, y un contador que se queda
 * clavado en 0:00 se lo oculta justo cuando más dice.
 *
 * El transcurrido se calcula contra una marca absoluta y no acumulando ticks:
 * los navegadores frenan los temporizadores de las pestañas en segundo plano
 * —a menudo a uno por minuto—, así que un contador de `setInterval(…, 1000)`
 * se quedaría atrás del reloj real en cuanto se cambia de pestaña.
 */
export function useStopwatch(running: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  // El instante de arranque vive en una ref y no en el estado: cambiarlo no
  // tiene por qué repintar, y guardarlo en estado provocaría una vuelta extra.
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!running) {
      startedAt.current = null
      return
    }
    const start = Date.now()
    startedAt.current = start
    setElapsed(0)
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  return elapsed
}
