import { useEffect, useRef } from 'react'
import { useStudyStore } from './studyStore'

// Cuenta el tiempo de uso real de la plataforma, que es lo que da sentido a un
// objetivo semanal en horas.
//
// Sin esto sólo se podría medir el tiempo de los tests cronometrados, y un
// test dura entre diez y cuarenta minutos: llegar a cinco horas semanales sería
// imposible aunque se estudiara todos los días. Leer teoría y responder el
// banco de práctica son estudio y tienen que contar.
//
// Reglas para que el número signifique algo:
//
//   - Sólo se cuenta con la pestaña visible. Una pestaña de fondo no es
//     estudio.
//   - Sólo se cuenta si ha habido interacción reciente. Una pestaña abierta y
//     olvidada toda la tarde tampoco lo es.
//   - Se suma en tramos cortos, así que cerrar el navegador de golpe pierde
//     como mucho un tramo.

const TICK_SECONDS = 15
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

export function useStudyTracker() {
  const addActiveSeconds = useStudyStore((s) => s.addActiveSeconds)
  const trackUsage = useStudyStore((s) => s.settings.trackUsage)
  const idleTimeoutMinutes = useStudyStore((s) => s.settings.idleTimeoutMinutes)
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    if (!trackUsage) return

    const markActive = () => {
      lastActivity.current = Date.now()
    }
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true })
    }
    // Volver a la pestaña cuenta como actividad: si no, al regresar habría que
    // tocar algo antes de que el contador arrancase de nuevo.
    document.addEventListener('visibilitychange', markActive)

    const idleMs = Math.max(1, idleTimeoutMinutes) * 60_000
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActivity.current > idleMs) return
      addActiveSeconds(TICK_SECONDS)
    }, TICK_SECONDS * 1000)

    return () => {
      window.clearInterval(timer)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, markActive)
      document.removeEventListener('visibilitychange', markActive)
    }
  }, [addActiveSeconds, trackUsage, idleTimeoutMinutes])
}
