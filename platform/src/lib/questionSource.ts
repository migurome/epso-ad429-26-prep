import type { DictKey } from './dictionary'
import type { Question } from '../types/content'

// Procedencia de una pregunta, leída de sus etiquetas.
//
// Hay tres y no se mezclan sin decirlo. El banco REAL son preguntas de examen
// publicadas; el BONUS lo redactó una IA; las GENERADAS las construye el motor
// de figuras abstractas, y cada una lleva la prueba de que tiene una sola
// respuesta. Presentarlas juntas sin distinguirlas daría al candidato una idea
// falsa de cuánto material oficial ha trabajado.
//
// Vivía copiado en PracticeBank y en FullscreenPractice. Con dos procedencias
// la copia era tolerable; con tres, cada una habría tenido que acordarse de la
// nueva por su cuenta.

export type QuestionSource = 'real' | 'ai-generated' | 'engine'

/** En el orden en que se ofrecen: primero lo que se examina. */
export const SOURCE_ORDER: QuestionSource[] = ['real', 'ai-generated', 'engine']

export const SOURCE_LABEL_KEY: Record<QuestionSource, DictKey> = {
  real: 'filter_real_bank',
  'ai-generated': 'filter_ai_bank',
  engine: 'filter_engine_bank',
}

export function sourceOf(tags: string[] | undefined): QuestionSource | null {
  if (!tags) return null
  return SOURCE_ORDER.find((source) => tags.includes(source)) ?? null
}

/** Las procedencias presentes en un banco, en orden. El filtro sólo tiene
 * sentido con dos o más: con una, cada botón enseñaría lo mismo. */
export function sourcesIn(questions: Question[]): QuestionSource[] {
  const present = new Set(questions.map((q) => sourceOf(q.tags)))
  return SOURCE_ORDER.filter((source) => present.has(source))
}

/** Dónde arranca el filtro: en el banco real si lo hay, porque es lo que se
 * examina; si no, en todo. */
export function defaultSource(sources: QuestionSource[]): QuestionSource | 'all' {
  if (sources.length < 2) return 'all'
  return sources.includes('real') ? 'real' : 'all'
}
