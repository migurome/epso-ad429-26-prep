import type { PracticeAnswer } from './practiceStore'

// Las decisiones de la lista de práctica, sin interfaz: qué se enseña bajo cada
// filtro, cómo se lee el contador y cuándo se contestó algo.
//
// Están aquí y no dentro del componente porque son reglas, no pintura, y porque
// la de `showsUnder` es la que sostiene una petición concreta: que responder no
// haga desaparecer la pregunta de delante.

/**
 * El ritmo de examen, en segundos por pregunta.
 *
 * Cien y no ciento cinco —que es lo que sale de las 20 preguntas en 35 minutos
 * del verbal— porque es el número con el que se entrena: redondo, igual en
 * todos los bancos, y un pelo más apretado que el examen, que es como conviene
 * entrenar. No es un límite: pasarse no cierra nada.
 */
export const PACE_SECONDS = 100

export type PracticeFilter = 'all' | 'answered' | 'pending'

/**
 * Si una pregunta se enseña bajo un filtro.
 *
 * Pendiente es, sin más, no haberla contestado. Durante un día hubo un estado
 * intermedio —contestada pero no «repasada»— para que la explicación no se
 * cerrara sola; se quitó porque en la mano era un clic de más por pregunta
 * para decir lo que ya decía haberla contestado. Quien quiera releer la
 * explicación vuelve a abrirla, que es un clic también, pero sólo cuando hace
 * falta.
 */
export function showsUnder(filter: PracticeFilter, answer: PracticeAnswer | undefined): boolean {
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
export function paceOf(elapsedSeconds: number): { seconds: number; over: boolean } {
  const left = PACE_SECONDS - Math.max(0, Math.floor(elapsedSeconds))
  return { seconds: Math.abs(left), over: left < 0 }
}

/** `m:ss`, con el menos delante cuando se ha pasado del ritmo. */
export function formatPace(elapsedSeconds: number): string {
  const { seconds, over } = paceOf(elapsedSeconds)
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
