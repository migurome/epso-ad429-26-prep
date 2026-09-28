import type { PracticeAnswer } from './practiceStore'

// Las decisiones de la lista de práctica, sin interfaz: qué se enseña bajo cada
// filtro, cómo se lee el contador y cuándo se contestó algo.
//
// Están aquí y no dentro del componente porque son reglas, no pintura, y porque
// la de `showsUnder` es la que sostiene una petición concreta: que responder no
// haga desaparecer la pregunta de delante.

/**
 * El ritmo de examen de un banco, en segundos por pregunta.
 *
 * Sale de su propia prueba y no de un número redondo igual para todos, que es
 * lo que había: cien segundos valían para el verbal —20 preguntas en 35
 * minutos— y mentían en todo lo demás. El numérico da 10 preguntas en 20
 * minutos, o sea el doble de tiempo por pregunta; el abstracto, 10 en 10
 * minutos, casi la mitad. Entrenar el numérico con el reloj del verbal es
 * entrenar contra un examen que no existe.
 *
 * No es un límite: pasarse no cierra nada.
 */
export function paceFor(format: { questions: number; minutes: number }): number {
  if (format.questions <= 0) return DEFAULT_PACE_SECONDS
  return Math.round((format.minutes * 60) / format.questions)
}

/** Para un banco que no cuelga de ninguna prueba oficial —los del curso de
 * fundamentos—, donde no hay formato del que sacar el ritmo. */
export const DEFAULT_PACE_SECONDS = 100

export type PracticeFilter = 'all' | 'answered' | 'pending'

/**
 * Si una pregunta se enseña bajo un filtro.
 *
 * Pendiente es, sin más, no haberla contestado. Hubo un estado intermedio
 * —contestada pero no «repasada»— que duró un día: era un clic por pregunta
 * para decir lo que ya decía haberla contestado.
 *
 * Y una regla que no es del filtro sino de la cortesía: **lo que se está
 * mirando no se esconde**. Con la lista en «pendientes», contestar deja de
 * cumplir el filtro en el mismo instante en que aparece la explicación; sin
 * esta guarda la fila se desvanecería debajo de los ojos de quien acaba de
 * fallar, que es justo quien tiene algo que leer ahí. Se va cuando se abra
 * otra, no antes.
 */
export function showsUnder(
  filter: PracticeFilter,
  answer: PracticeAnswer | undefined,
  isOpen = false,
): boolean {
  if (isOpen) return true
  switch (filter) {
    case 'all':
      return true
    case 'answered':
      return answer != null
    case 'pending':
      return answer == null
  }
}

export interface PracticeCounts {
  answered: number
  pending: number
  total: number
}

export function countsFor(
  questionIds: string[],
  answers: Record<string, PracticeAnswer>,
): PracticeCounts {
  let answered = 0
  let pending = 0
  for (const id of questionIds) {
    const answer = answers[id]
    if (answer != null) answered += 1
    if (showsUnder('pending', answer)) pending += 1
  }
  return { answered, pending, total: questionIds.length }
}

/**
 * El contador, tal como se lee: lo que queda del ritmo, o lo que se ha pasado.
 *
 * `over` no es `seconds < 0`: los segundos salen ya en positivo para poder
 * pintarlos sin más, y quien pregunta si va tarde pregunta eso, no el signo.
 */
export function paceOf(
  elapsedSeconds: number,
  paceSeconds: number = DEFAULT_PACE_SECONDS,
): { seconds: number; over: boolean } {
  const left = paceSeconds - Math.max(0, Math.floor(elapsedSeconds))
  return { seconds: Math.abs(left), over: left < 0 }
}

/** `m:ss`, con el menos delante cuando se ha pasado del ritmo. */
export function formatPace(
  elapsedSeconds: number,
  paceSeconds: number = DEFAULT_PACE_SECONDS,
): string {
  const { seconds, over } = paceOf(elapsedSeconds, paceSeconds)
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, '0')
  return `${over ? '−' : ''}${minutes}:${rest}`
}

/**
 * La primera línea del enunciado, para la fila ya contestada.
 *
 * Una pregunta sin responder enseña el enunciado entero: hay que leerlo para
 * decidir si es la que se quiere abrir. Una ya contestada, no —el trabajo está
 * hecho—, y dejar ahí los diez renglones de un texto de razonamiento verbal
 * convierte la lista en un muro por el que hay que bajar mucho para encontrar
 * lo que falta.
 *
 * Sale texto llano y no Markdown: en una sola línea, una tabla o una negrita no
 * se ven, sólo estorban. El recorte visual lo hace el CSS, que sabe el ancho;
 * aquí sólo se aplana.
 */
export function firstLine(markdown: string): string {
  const line = markdown
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l !== '' && l !== '---')
  if (!line) return ''
  return line
    // Los marcadores de Markdown que se leerían como ruido: almohadillas de
    // título, viñetas, comillas de cita, asteriscos, guiones bajos y acentos
    // graves de código.
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^>\s*/, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Cuándo se contestó, o null si no se sabe.
 *
 * Lo respondido antes de que esto se guardara llega con la fecha vacía, y una
 * fecha ilegible en la base o en un fichero viejo tampoco vale. En los dos
 * casos la respuesta es la misma y es honrada: no se sabe, no se enseña.
 */
export function answeredOn(answer: PracticeAnswer | undefined): Date | null {
  if (!answer?.at) return null
  const when = new Date(answer.at)
  return Number.isNaN(when.getTime()) ? null : when
}
