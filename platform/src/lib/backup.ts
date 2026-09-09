import type { CompetitionId } from '../data/competition'
import type { EssayAttempt, TestAttempt } from '../types/content'
import { useCompetitionStore } from './competitionStore'
import { useLocaleStore, type Locale } from './localeStore'
import { usePracticeStore } from './practiceStore'
import { useProgressStore } from './progressStore'
import type { DayLog } from './studyCalendar'
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  useStudyStore,
  type CandidateProfile,
  type StudySettings,
} from './studyStore'
import { useTestLocaleStore } from './testLocaleStore'

// Traslado del progreso entre dispositivos.
//
// La plataforma es un sitio estático: no hay servidor, no hay cuenta y todo
// vive en el `localStorage` de cada navegador, que es privado de ese navegador
// y de ese dispositivo. El PC y el móvil no comparten nada, y ninguna
// sincronización del navegador lo arregla (Chrome y Firefox sincronizan
// marcadores y contraseñas, no `localStorage`). Así que el fichero lo mueve el
// candidato: se exporta aquí, se lleva por donde se lleven los ficheros y se
// importa allí.
//
// Sale todo lo que el candidato no puede reconstruir de memoria. No sale la
// sesión (`epso-prep-auth`): abrir la aplicación es cosa de cada dispositivo y
// arrastrarla sólo confundiría.

/** Versión del formato del fichero. Sube cuando un fichero nuevo deje de ser
 * legible por una versión anterior de la plataforma. */
export const SNAPSHOT_FORMAT = 1

/** Marca del fichero, para no tragarse un JSON cualquiera. */
const SNAPSHOT_APP = 'epso-prep'

export interface Snapshot {
  app: typeof SNAPSHOT_APP
  format: number
  exportedAt: string
  appVersion: string
  profile: CandidateProfile
  settings: StudySettings
  dayLog: DayLog
  testAttempts: TestAttempt[]
  essayAttempts: EssayAttempt[]
  practiceAnswers: Record<string, string>
  practiceOrder: Record<string, number>
  competition: CompetitionId
  uiLocale: Locale
  testLocale: Locale
}

/** Lo que hay dentro de un fichero, o lo que una importación ha añadido. */
export type SnapshotSummary = {
  tests: number
  essays: number
  days: number
  practice: number
}

/**
 * Cómo entra un fichero.
 *
 * `merge` suma lo del fichero a lo que ya hay y no quita nada: es lo que se
 * quiere al ir y venir entre dos dispositivos. `replace` deja este dispositivo
 * como una copia exacta del fichero, que es lo que se quiere al restaurar una
 * copia de seguridad sobre un navegador limpio.
 */
export type ImportMode = 'merge' | 'replace'

export function createSnapshot(): Snapshot {
  const study = useStudyStore.getState()
  const progress = useProgressStore.getState()
  const practice = usePracticeStore.getState()
  return {
    app: SNAPSHOT_APP,
    format: SNAPSHOT_FORMAT,
    exportedAt: new Date().toISOString(),
    appVersion: __APP_VERSION__,
    profile: study.profile,
    settings: study.settings,
    dayLog: study.dayLog,
    testAttempts: progress.testAttempts,
    essayAttempts: progress.essayAttempts,
    practiceAnswers: practice.answers,
    practiceOrder: practice.orderSeed,
    competition: useCompetitionStore.getState().competition,
    uiLocale: useLocaleStore.getState().locale,
    testLocale: useTestLocaleStore.getState().locale,
  }
}

export function describeSnapshot(snapshot: Snapshot): SnapshotSummary {
  return {
    tests: snapshot.testAttempts.length,
    essays: snapshot.essayAttempts.length,
    days: Object.keys(snapshot.dayLog).length,
    practice: Object.keys(snapshot.practiceAnswers).length,
  }
}

export type ReadResult =
  | { ok: true; snapshot: Snapshot }
  /** `unreadable`: no es JSON. `foreign`: es JSON, pero de otra cosa.
   *  `newer`: es nuestro, pero lo escribió una versión posterior. */
  | { ok: false; reason: 'unreadable' | 'foreign' | 'newer' }

/** Lee un fichero exportado, distinguiendo los tres motivos por los que puede
 * no valer: al candidato le sirve de poco un «error» a secas. */
export function readSnapshot(text: string): ReadResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (!isRecord(raw) || raw.app !== SNAPSHOT_APP) return { ok: false, reason: 'foreign' }
  if (typeof raw.format !== 'number' || raw.format > SNAPSHOT_FORMAT) {
    return { ok: false, reason: 'newer' }
  }
  return { ok: true, snapshot: normalise(raw) }
}

/**
 * Rellena con los valores por defecto lo que el fichero no traiga.
 *
 * Un fichero escrito antes de que existiera un campo llega con huecos.
 * Aceptarlos tal cual dejaría la interfaz con `undefined` donde espera una
 * lista, así que esa puerta se cierra una sola vez aquí y el resto del módulo
 * trabaja siempre con un `Snapshot` completo.
 */
function normalise(raw: Record<string, unknown>): Snapshot {
  return {
    app: SNAPSHOT_APP,
    format: raw.format as number,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    appVersion: typeof raw.appVersion === 'string' ? raw.appVersion : '',
    profile: { ...DEFAULT_PROFILE, ...(isRecord(raw.profile) ? raw.profile : {}) },
    settings: { ...DEFAULT_SETTINGS, ...(isRecord(raw.settings) ? raw.settings : {}) },
    dayLog: numberMap(raw.dayLog),
    testAttempts: asArray<TestAttempt>(raw.testAttempts),
    essayAttempts: asArray<EssayAttempt>(raw.essayAttempts),
    practiceAnswers: stringMap(raw.practiceAnswers),
    practiceOrder: numberMap(raw.practiceOrder),
    competition: raw.competition === 'ad7' || raw.competition === 'ad8' ? raw.competition : 'ad8',
    uiLocale: asLocale(raw.uiLocale),
    testLocale: asLocale(raw.testLocale),
  }
}

/**
 * Une dos listas de intentos por `id`, ganando el local.
 *
 * Un intento no cambia una vez terminado, así que cuál de los dos se quede es
 * indiferente; lo que importa es que un `id` repetido no salga dos veces en el
 * histórico. Se ordenan por fecha de inicio para que el progreso lea como una
 * línea temporal y no como dos pegadas.
 */
export function mergeAttempts<T extends { id: string; startedAt: string }>(
  local: T[],
  incoming: T[],
): T[] {
  const byId = new Map<string, T>()
  for (const attempt of incoming) byId.set(attempt.id, attempt)
  for (const attempt of local) byId.set(attempt.id, attempt)
  return [...byId.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

/**
 * Une dos calendarios quedándose, día a día, con el mayor de los dos.
 *
 * Sumarlos daría un número más fiel el día que de verdad se estudie en los dos
 * sitios, pero rompe algo que aquí importa más: importar el mismo fichero dos
 * veces tiene que dejar el calendario igual. Y este fichero se va a importar
 * muchas veces, porque ése es el flujo. Con la suma, cada pasada inflaría todos
 * los días compartidos y el calendario mentiría un poco más cada vez; con el
 * máximo se queda corto como mucho una tarde, y ya no se mueve nunca.
 */
export function mergeDayLog(local: DayLog, incoming: DayLog): DayLog {
  const merged: DayLog = { ...local }
  for (const [day, seconds] of Object.entries(incoming)) {
    merged[day] = Math.max(merged[day] ?? 0, seconds)
  }
  return merged
}

/**
 * Une las respuestas de práctica, ganando la local.
 *
 * Se importa desde el dispositivo que se tiene delante: reescribir en silencio
 * una respuesta que está en pantalla es peor que dejar fuera la del fichero.
 */
export function mergeAnswers(
  local: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  return { ...incoming, ...local }
}

/**
 * Mete un fichero en este dispositivo y devuelve lo que ha entrado de nuevo.
 *
 * En `merge` no se tocan los ajustes, el perfil, la convocatoria ni los
 * idiomas: son de este dispositivo, y el candidato no está pidiendo cambiarlos,
 * está pidiendo recuperar su trabajo.
 */
export function applySnapshot(snapshot: Snapshot, mode: ImportMode): SnapshotSummary {
  if (mode === 'replace') {
    useStudyStore.setState({
      profile: snapshot.profile,
      settings: snapshot.settings,
      dayLog: snapshot.dayLog,
    })
    useProgressStore.setState({
      testAttempts: snapshot.testAttempts,
      essayAttempts: snapshot.essayAttempts,
    })
    usePracticeStore.setState({
      answers: snapshot.practiceAnswers,
      orderSeed: snapshot.practiceOrder,
    })
    useCompetitionStore.setState({ competition: snapshot.competition })
    useLocaleStore.setState({ locale: snapshot.uiLocale })
    useTestLocaleStore.setState({ locale: snapshot.testLocale })
    return describeSnapshot(snapshot)
  }

  const study = useStudyStore.getState()
  const progress = useProgressStore.getState()
  const practice = usePracticeStore.getState()

  const dayLog = mergeDayLog(study.dayLog, snapshot.dayLog)
  const testAttempts = mergeAttempts(progress.testAttempts, snapshot.testAttempts)
  const essayAttempts = mergeAttempts(progress.essayAttempts, snapshot.essayAttempts)
  const answers = mergeAnswers(practice.answers, snapshot.practiceAnswers)
  // El orden de los bancos es presentación, no progreso: reordenarlos bajo los
  // pies del candidato le haría perder por dónde iba. Sólo se adoptan las
  // semillas de los bancos que aquí no tienen ninguna.
  const orderSeed = { ...snapshot.practiceOrder, ...practice.orderSeed }

  useStudyStore.setState({ dayLog })
  useProgressStore.setState({ testAttempts, essayAttempts })
  usePracticeStore.setState({ answers, orderSeed })

  return {
    tests: testAttempts.length - progress.testAttempts.length,
    essays: essayAttempts.length - progress.essayAttempts.length,
    days: Object.keys(dayLog).filter((day) => dayLog[day] !== study.dayLog[day]).length,
    practice: Object.keys(answers).length - Object.keys(practice.answers).length,
  }
}

/** Nombre del fichero. Lleva la fecha delante para que varias copias se
 * ordenen solas en la carpeta de descargas. */
export function snapshotFilename(when: Date = new Date()): string {
  return `epso-prep-${when.toISOString().slice(0, 10)}.json`
}

export function snapshotText(snapshot: Snapshot): string {
  return JSON.stringify(snapshot, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'es'
}

function numberMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw
  }
  return out
}

function stringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === 'string') out[key] = raw
  }
  return out
}
