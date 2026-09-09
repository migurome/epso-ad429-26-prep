// Cálculo del calendario de estudio: agrupar la actividad por día y por
// semana, y decidir si una semana cumple el objetivo.
//
// Todo lo de aquí es puro —entra actividad, sale resumen— para que se pueda
// probar sin montar la interfaz y para que la página se limite a pintar.
//
// Dos decisiones que conviene tener presentes al leer el resto:
//
//   1. Las semanas empiezan en LUNES. Es la convención europea y la que usa
//      EPSO en sus plazos; empezar en domingo desplazaría todos los cómputos.
//   2. El tiempo de un día NO es la suma del tiempo registrado de uso y el de
//      los tests: un test cronometrado ocurre *dentro* del tiempo de uso, así
//      que sumarlos lo contaría dos veces. Se toma el mayor de los dos.
import type { EssayAttempt, TestAttempt } from '../types/content'
import type { Localized } from './localeStore'
import {
  COMPETITIONS,
  COMPETITION_ORDER,
  EUFTE_FORMAT,
  FIELD_MCQ_FORMAT,
  REASONING_SKILLS,
} from '../data/competition'

export interface StudyEvent {
  id: string
  kind: 'test' | 'essay'
  /** Momento en que se cerró la actividad, en ISO. */
  at: string
  seconds: number
  label: Localized
  detail: Localized
  /** Aciertos sobre el máximo de la prueba, cuando aplica. */
  score?: { value: number; max: number }
}

export interface DaySummary {
  /** Clave local 'YYYY-MM-DD'. Local y no UTC: si no, a partir de las 22:00 en
   * España la actividad se registraría en el día siguiente. */
  key: string
  date: Date
  /** Tiempo de uso de la plataforma registrado por el seguimiento pasivo. */
  activeSeconds: number
  /** Suma del tiempo de los tests y redacciones cerrados ese día. */
  eventSeconds: number
  /** El que cuenta para el objetivo: el mayor de los dos, nunca la suma. */
  seconds: number
  events: StudyEvent[]
  /** Pertenece al mes que se está mirando, o es relleno de la rejilla. */
  inMonth: boolean
  isToday: boolean
  isFuture: boolean
}

export interface WeekSummary {
  /** Clave 'YYYY-MM-DD' del lunes. */
  key: string
  start: Date
  end: Date
  seconds: number
  goalSeconds: number
  /** Alcanzado el objetivo de la semana. */
  complete: boolean
  /** Progreso hacia el objetivo, recortado a 1. */
  ratio: number
  /** La semana entera está por venir. Una semana futura no se ha incumplido:
   * enseñarle un 0 % al candidato sería un reproche por algo que todavía no
   * ha tenido ocasión de hacer. */
  isFuture: boolean
  days: DaySummary[]
}

/** Registro de uso pasivo: segundos acumulados por día. */
export type DayLog = Record<string, number>

export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Medianoche local del día de `date`, sin arrastrar hora ni zona. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Lunes de la semana de `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  // getDay() da 0 para domingo; se rota para que el lunes sea 0.
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function sameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b)
}

// ── Etiquetado de la actividad ──────────────────────────────────────────────
// Las etiquetas salen de los mismos datos que el resto de la plataforma, así
// que un ámbito nuevo aparece en el calendario sin tocar nada de aquí.

const FIELD_LABELS = new Map<string, Localized>(
  COMPETITION_ORDER.flatMap((key) => COMPETITIONS[key].fields).map((f) => [f.id, f.label]),
)
const SKILL_LABELS = new Map<string, Localized>(REASONING_SKILLS.map((s) => [s.id, s.label]))

function testLabel(attempt: TestAttempt): Localized {
  if (attempt.skill) {
    return SKILL_LABELS.get(attempt.skill) ?? { es: 'Razonamiento', en: 'Reasoning' }
  }
  if (attempt.field) {
    return FIELD_LABELS.get(attempt.field) ?? { es: 'Prueba de ámbito', en: 'Field test' }
  }
  return { es: 'Simulacro', en: 'Mock test' }
}

function maxScoreFor(attempt: TestAttempt): number {
  if (attempt.skill) {
    return REASONING_SKILLS.find((s) => s.id === attempt.skill)?.format.maxScore ?? attempt.totalQuestions
  }
  if (attempt.phase === 'field-mcq') return FIELD_MCQ_FORMAT.maxScore
  if (attempt.phase === 'eufte') return EUFTE_FORMAT.maxScore
  return attempt.totalQuestions
}

/** Momento en que la actividad quedó registrada. Se prefiere el cierre: es
 * cuando el trabajo estaba hecho. */
function attemptAt(attempt: { startedAt: string; finishedAt?: string }): string {
  return attempt.finishedAt ?? attempt.startedAt
}

export function toEvents(tests: TestAttempt[], essays: EssayAttempt[]): StudyEvent[] {
  const fromTests = tests.map((a): StudyEvent => {
    const correct = a.results.filter((r) => r.correct).length
    const max = maxScoreFor(a)
    const scaled = a.totalQuestions > 0 ? (correct / a.totalQuestions) * max : 0
    return {
      id: a.id,
      kind: 'test',
      at: attemptAt(a),
      seconds: a.timeSpentSeconds,
      label: testLabel(a),
      detail: {
        es: `${correct} de ${a.totalQuestions} correctas`,
        en: `${correct} of ${a.totalQuestions} correct`,
      },
      score: { value: Math.round(scaled * 10) / 10, max },
    }
  })

  const fromEssays = essays.map((a): StudyEvent => {
    const words = a.text.trim() ? a.text.trim().split(/\s+/).length : 0
    return {
      id: a.id,
      kind: 'essay',
      at: attemptAt(a),
      seconds: a.timeSpentSeconds,
      label: { es: 'EUFTE — redacción', en: 'EUFTE — essay' },
      detail: { es: `${words} palabras`, en: `${words} words` },
    }
  })

  return [...fromTests, ...fromEssays].sort((a, b) => a.at.localeCompare(b.at))
}

export function groupEventsByDay(events: StudyEvent[]): Map<string, StudyEvent[]> {
  const byDay = new Map<string, StudyEvent[]>()
  for (const event of events) {
    const key = dayKey(new Date(event.at))
    const list = byDay.get(key)
    if (list) list.push(event)
    else byDay.set(key, [event])
  }
  return byDay
}

export interface CalendarInput {
  tests: TestAttempt[]
  essays: EssayAttempt[]
  dayLog: DayLog
  weeklyGoalHours: number
  /** Inyectable para que las pruebas no dependan del reloj. */
  now?: Date
}

function buildDay(
  date: Date,
  byDay: Map<string, StudyEvent[]>,
  dayLog: DayLog,
  month: number,
  now: Date,
): DaySummary {
  const key = dayKey(date)
  const events = byDay.get(key) ?? []
  const activeSeconds = Math.max(0, Math.round(dayLog[key] ?? 0))
  const eventSeconds = events.reduce((sum, e) => sum + e.seconds, 0)
  return {
    key,
    date,
    activeSeconds,
    eventSeconds,
    seconds: Math.max(activeSeconds, eventSeconds),
    events,
    inMonth: date.getMonth() === month,
    isToday: sameDay(date, now),
    isFuture: startOfDay(date).getTime() > startOfDay(now).getTime(),
  }
}

/** Rejilla del mes: semanas completas de lunes a domingo, con los días de los
 * meses vecinos que hagan falta para cerrar la primera y la última. */
export function buildMonth(year: number, month: number, input: CalendarInput): WeekSummary[] {
  const now = input.now ?? new Date()
  const byDay = groupEventsByDay(toEvents(input.tests, input.essays))
  const goalSeconds = Math.max(0, input.weeklyGoalHours) * 3600

  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const gridStart = startOfWeek(first)
  const gridEnd = startOfWeek(last)

  const weeks: WeekSummary[] = []
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 7)) {
    const days = Array.from({ length: 7 }, (_, i) =>
      buildDay(addDays(cursor, i), byDay, input.dayLog, month, now),
    )
    const seconds = days.reduce((sum, d) => sum + d.seconds, 0)
    weeks.push({
      key: dayKey(cursor),
      start: cursor,
      end: addDays(cursor, 6),
      seconds,
      goalSeconds,
      complete: goalSeconds > 0 && seconds >= goalSeconds,
      ratio: goalSeconds > 0 ? Math.min(1, seconds / goalSeconds) : 0,
      isFuture: days.every((d) => d.isFuture),
      days,
    })
  }
  return weeks
}

/** Resumen de la semana en curso, para enseñarlo fuera del calendario. */
export function currentWeek(input: CalendarInput): WeekSummary {
  const now = input.now ?? new Date()
  const start = startOfWeek(now)
  const byDay = groupEventsByDay(toEvents(input.tests, input.essays))
  const goalSeconds = Math.max(0, input.weeklyGoalHours) * 3600
  const days = Array.from({ length: 7 }, (_, i) =>
    buildDay(addDays(start, i), byDay, input.dayLog, now.getMonth(), now),
  )
  const seconds = days.reduce((sum, d) => sum + d.seconds, 0)
  return {
    key: dayKey(start),
    start,
    end: addDays(start, 6),
    seconds,
    goalSeconds,
    complete: goalSeconds > 0 && seconds >= goalSeconds,
    ratio: goalSeconds > 0 ? Math.min(1, seconds / goalSeconds) : 0,
    // La semana en curso contiene hoy, así que nunca es futura.
    isFuture: false,
    days,
  }
}

/** Semanas consecutivas cumplidas contando hacia atrás. La semana en curso
 * sólo rompe la racha si ya ha terminado: mientras corre, aún puede cumplirse.
 */
export function completedWeekStreak(input: CalendarInput): number {
  const now = input.now ?? new Date()
  const byDay = groupEventsByDay(toEvents(input.tests, input.essays))
  const goalSeconds = Math.max(0, input.weeklyGoalHours) * 3600
  if (goalSeconds <= 0) return 0

  let streak = 0
  let cursor = startOfWeek(now)
  // Un tope evita recorrer indefinidamente un registro corrupto.
  for (let i = 0; i < 520; i += 1) {
    const seconds = Array.from({ length: 7 }, (_, d) =>
      buildDay(addDays(cursor, d), byDay, input.dayLog, now.getMonth(), now),
    ).reduce((sum, day) => sum + day.seconds, 0)

    if (seconds >= goalSeconds) streak += 1
    else if (i > 0) break
    // i === 0 es la semana en curso: si todavía no llega al objetivo no cuenta,
    // pero tampoco corta la racha de las anteriores.
    cursor = addDays(cursor, -7)
  }
  return streak
}

/** Horas y minutos, en el formato corto que usa la interfaz del calendario. */
export function formatDuration(totalSeconds: number, locale: 'es' | 'en'): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours === 0 && minutes === 0) return locale === 'es' ? '0 min' : '0 min'
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}
