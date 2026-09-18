import type { BoardNotice, BoardStage } from '../types/board'

const DAY = 86_400_000

/** De más urgente a menos: es también el orden en que se lee el tablón. */
export const STAGE_ORDER: BoardStage[] = ['open', 'in-progress', 'closed']

/** Cuánto dura el verde: un mes, contado desde que la convocatoria se publicó. */
export const FRESH_DAYS = 30

/**
 * El día en que la convocatoria salió, si se puede afirmar.
 *
 * Lo bueno es `openedOn`, que el bot lee del calendario de la ficha de EPSO
 * («Application period: 08/09/2026 - …»). Cuando la ficha no lo publica queda
 * `firstSeen`, el día en que el bot la vio, pero **sólo** si fue después de
 * empezar a vigilar: las que ya estaban el primer día llevaban meses
 * publicadas, y usar `firstSeen` ahí las marcaría nuevas a todas.
 */
export function publishedOn(notice: BoardNotice, since: string | null): string | null {
  if (notice.openedOn) return notice.openedOn
  if (since && notice.firstSeen > since) return notice.firstSeen
  return null
}

/**
 * ¿Se publicó hace menos de un mes? Es lo que va destacado en verde.
 *
 * Una convocatoria cuyo plazo aún no ha empezado también cuenta: es lo más
 * nuevo que hay, y esconderla sería justo lo contrario de lo que se busca.
 */
export function isFresh(
  notice: BoardNotice,
  since: string | null,
  now: Date,
  days = FRESH_DAYS,
): boolean {
  const day = publishedOn(notice, since)
  if (!day) return false
  const ms = Date.parse(`${day}T00:00:00Z`)
  if (Number.isNaN(ms)) return false
  return (now.getTime() - ms) / DAY < days
}

/**
 * Días que faltan para el cierre, contando el día en curso como uno.
 *
 * Devuelve null si EPSO no publicó la fecha en máquina: antes de inventar una
 * hora, el tablón enseña el texto tal como lo escribió EPSO.
 */
export function daysLeft(deadline: string | null | undefined, now: Date): number | null {
  if (!deadline) return null
  const ms = Date.parse(deadline)
  if (Number.isNaN(ms)) return null
  return Math.ceil((ms - now.getTime()) / DAY)
}

/**
 * Las convocatorias repartidas por fase, cada grupo en el orden en que
 * interesa leerlo: lo abierto por plazo (lo que cierra antes, arriba), y lo
 * demás por número de convocatoria, de la más reciente a la más antigua.
 */
export function byStage(notices: BoardNotice[]): Record<BoardStage, BoardNotice[]> {
  const byDeadline = (a: BoardNotice, b: BoardNotice) =>
    String(a.deadline ?? '').localeCompare(String(b.deadline ?? '')) || a.title.localeCompare(b.title)
  const byReference = (a: BoardNotice, b: BoardNotice) =>
    String(b.reference ?? '').localeCompare(String(a.reference ?? '')) || a.title.localeCompare(b.title)

  return {
    open: notices.filter((n) => n.stage === 'open').sort(byDeadline),
    'in-progress': notices.filter((n) => n.stage === 'in-progress').sort(byReference),
    closed: notices.filter((n) => n.stage === 'closed').sort(byReference),
  }
}

/**
 * El día de la última novedad, que se deduce de las propias convocatorias.
 *
 * Así el tablón puede decir cuándo cambió algo por última vez sin que el bot
 * tenga que guardar un «revisado hoy» que ensuciaría el repositorio con un
 * commit diario.
 */
export function lastNewsOn(notices: BoardNotice[]): string | null {
  const dates = notices.flatMap((n) =>
    [n.firstSeen, n.updatedOn, n.stageChangedOn].filter((d): d is string => Boolean(d)),
  )
  return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null
}

/**
 * Una fecha de día suelto (`2026-09-18`) escrita como la escribe EPSO:
 * `18/09/2026`, igual en español que en inglés —«es-ES» y «en-GB» dan el mismo
 * formato, y la web de EPSO usa ése en las dos lenguas—.
 *
 * Se parte la cadena en vez de construir un `Date`: una fecha sin hora
 * interpretada en la zona del navegador se va al día anterior en toda América,
 * y aquí eso significaría enseñar mal el día en que salió una convocatoria.
 */
export function formatDay(day: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : day
}
