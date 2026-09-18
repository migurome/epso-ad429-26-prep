export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Cuánto hace desde la última sincronización, para poder decirlo de un vistazo.
//
// Devuelve la unidad y el número, no un texto: quien lo pinta escoge las
// palabras del diccionario, y así esto se prueba sin idioma y sin interfaz.
//
// La esquina que justifica que exista: **una fecha en el futuro**. Los relojes
// de dos dispositivos no coinciden, la marca la pone el servidor y este
// navegador puede ir atrasado; sin cuidado, eso se enseñaría como «hace -3
// min», que parece una avería de la web cuando no lo es.
export type Freshness =
  | { unit: 'never' }
  | { unit: 'now' }
  | { unit: 'minutes'; value: number }
  | { unit: 'hours'; value: number }
  | { unit: 'days'; value: number }

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function freshnessOf(lastSyncAt: string | null, now: Date): Freshness {
  if (!lastSyncAt) return { unit: 'never' }
  const then = new Date(lastSyncAt).getTime()
  // Una marca ilegible se trata como no haber guardado nunca: es lo único que
  // no promete nada que no se pueda cumplir.
  if (Number.isNaN(then)) return { unit: 'never' }

  const elapsed = now.getTime() - then
  if (elapsed < MINUTE) return { unit: 'now' }
  if (elapsed < HOUR) return { unit: 'minutes', value: Math.floor(elapsed / MINUTE) }
  if (elapsed < DAY) return { unit: 'hours', value: Math.floor(elapsed / HOUR) }
  return { unit: 'days', value: Math.floor(elapsed / DAY) }
}
