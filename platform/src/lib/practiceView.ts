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
 * La regla que no es obvia: **una respondida y todavía sin dar por repasada
 * sigue contando como pendiente**. Sin eso, marcar la opción la haría
 * desaparecer de la lista en el mismo instante en que aparece su explicación, y
 * la explicación le hace falta justo a quien acaba de fallar.
 */
export function showsUnder(filter: PracticeFilter, answer: PracticeAnswer | undefined): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'answered':
      return answer != null
    case 'pending':
      return answer == null || answer.done !== true
  }
}

export interface PracticeCounts {
  answered: number
  /** Sin responder, más las respondidas que siguen abiertas. */
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
