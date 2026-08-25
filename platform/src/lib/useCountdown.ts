import { useEffect, useRef, useState } from 'react'

/** Ticks down from `totalSeconds` to 0 once per second while `running` is true. */
export function useCountdown(totalSeconds: number, running: boolean, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    setRemaining(totalSeconds)
  }, [totalSeconds])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id)
          onExpireRef.current?.()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  return remaining
}
