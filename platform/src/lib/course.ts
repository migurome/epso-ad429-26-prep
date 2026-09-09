import type { Question, TheoryDoc } from '../types/content'

// Emparejado de la teoría del curso con su banco de preguntas.
//
// El generador (scripts/build_content.py) etiqueta cada pregunta con el título
// del módulo al que pertenece y comprueba, al construir, que ese título existe
// entre los módulos: si alguien renombra un módulo y se olvida del encabezado
// del banco, la construcción falla en vez de dejar preguntas huérfanas que
// desaparecerían de la interfaz sin que nada avisara.
//
// Aquí sólo se rehace ese emparejado en el navegador, y se ordena por el
// número que lleva el identificador del documento.

/** Etiquetas que no son títulos de módulo. */
const NON_MODULE_TAGS = new Set(['course', 'ai-generated', 'real'])

export interface CourseModule {
  doc: TheoryDoc
  questions: Question[]
}

/** Número de módulo a partir de un id 'course-<algo>-m<N>'. Devuelve 0 para la
 * introducción, que así queda siempre la primera al ordenar. */
export function moduleNumber(id: string): number {
  const match = /-m(\d+)$/.exec(id)
  return match ? Number(match[1]) : 0
}

function moduleTags(question: Question): string[] {
  return (question.tags ?? []).filter((tag) => !NON_MODULE_TAGS.has(tag))
}

/** Los módulos del curso, en orden, cada uno con sus preguntas. La
 * introducción no es un módulo y se excluye. */
export function courseModules(theory: TheoryDoc[], questions: Question[]): CourseModule[] {
  const byTitle = new Map<string, Question[]>()
  for (const question of questions) {
    for (const tag of moduleTags(question)) {
      const list = byTitle.get(tag)
      if (list) list.push(question)
      else byTitle.set(tag, [question])
    }
  }

  return theory
    .filter((doc) => moduleNumber(doc.id) > 0)
    .sort((a, b) => moduleNumber(a.id) - moduleNumber(b.id))
    .map((doc) => ({ doc, questions: byTitle.get(doc.title.en) ?? [] }))
}

export function findModule(
  theory: TheoryDoc[],
  questions: Question[],
  number: number,
): CourseModule | undefined {
  return courseModules(theory, questions).find((m) => moduleNumber(m.doc.id) === number)
}
