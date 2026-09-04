import { useEffect, useRef, useState } from 'react'

/** Cuenta atrás desde `totalSeconds` hasta 0 mientras `running` sea true.
 *
 * Dos detalles importantes para un simulacro cronometrado:
 *
 * - El restante se calcula contra una marca de tiempo absoluta (`deadline`),
 *   no acumulando ticks de un segundo. Los navegadores limitan los
 *   temporizadores de las pestañas en segundo plano (a menudo a uno por
 *   minuto), así que un contador basado en `setInterval(…, 1000)` se queda
 *   atrás del reloj real en cuanto el usuario cambia de pestaña — y el
 *   examen duraría bastante más de lo que marca el formato.
 * - El contador se reinicia cada vez que `running` pasa a true. Sin esto, un
 *   segundo intento del mismo test («Repetir con preguntas nuevas») arrancaba
 *   con el tiempo que sobró del intento anterior, y si el primero había
 *   agotado el tiempo el segundo terminaba solo al primer tick.
 */
export function useCountdown(totalSeconds: number, running: boolean, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!running) {
      setRemaining(totalSeconds)
      return
    }
    const deadline = Date.now() + totalSeconds * 1000
    setRemaining(totalSeconds)
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        window.clearInterval(id)
        onExpireRef.current?.()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running, totalSeconds])

  return remaining
}
