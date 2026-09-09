// El curso empareja cada módulo de teoría con sus preguntas por el TÍTULO del
// módulo, que es la etiqueta que el generador pone en cada pregunta. Es un
// acoplamiento frágil a propósito: build_content.py falla si una pregunta
// apunta a un módulo inexistente, y aquí se comprueba el otro lado, que es el
// que se ejecuta en el navegador.
//
// Si este emparejado se rompe, un módulo aparece con cero preguntas sin que
// nada falle: la pestaña sigue ahí, sólo que vacía.
import { describe, it, expect } from 'vitest'
import type { Question, TheoryDoc } from '../types/content'
import { courseModules, findModule, moduleNumber } from './course'

function doc(id: string, titleEn: string): TheoryDoc {
  return {
    id,
    phase: 'field-mcq',
    field: 'cybersecurity',
    title: { es: `${titleEn} (es)`, en: titleEn },
    summaryMd: { es: 'cuerpo', en: 'body' },
  }
}

function question(id: string, module: string): Question {
  return {
    id,
    phase: 'field-mcq',
    field: 'cybersecurity',
    prompt: { es: 'p', en: 'p' },
    options: [
      { id: 'A', text: { es: 'a', en: 'a' }, isCorrect: true },
      { id: 'B', text: { es: 'b', en: 'b' }, isCorrect: false },
    ],
    tags: ['course', 'ai-generated', module],
  }
}

const THEORY = [
  doc('course-cyber-intro', 'Intro'),
  doc('course-cyber-m2', 'Cryptographic tools'),
  doc('course-cyber-m1', 'Security concepts'),
  doc('course-cyber-m10', 'Databases'),
]

const QUESTIONS = [
  question('q1', 'Security concepts'),
  question('q2', 'Security concepts'),
  question('q3', 'Cryptographic tools'),
  question('q4', 'Databases'),
]

describe('número de módulo', () => {
  it.each([
    ['course-cyber-m1', 1],
    ['course-cyber-m12', 12],
    ['course-cyber-intro', 0],
    ['cualquier-otra-cosa', 0],
  ])('%s → %i', (id, expected) => {
    expect(moduleNumber(id)).toBe(expected)
  })

  // 'm10' no puede leerse como 'm1' seguido de un cero: ordenaría el módulo 10
  // entre el 1 y el 2, y el curso se recorrería en el orden equivocado.
  it('lee el número completo y no sólo el primer dígito', () => {
    expect(moduleNumber('course-cyber-m10')).toBe(10)
    expect(moduleNumber('course-cyber-m11')).toBe(11)
  })
})

describe('módulos del curso', () => {
  it('los ordena por número aunque la teoría venga desordenada', () => {
    expect(courseModules(THEORY, QUESTIONS).map((m) => moduleNumber(m.doc.id))).toEqual([1, 2, 10])
  })

  it('excluye la introducción, que no es un módulo', () => {
    expect(courseModules(THEORY, QUESTIONS).some((m) => m.doc.id.endsWith('-intro'))).toBe(false)
  })

  it('adjunta a cada módulo sus preguntas y sólo las suyas', () => {
    const [first, second, third] = courseModules(THEORY, QUESTIONS)
    expect(first.questions.map((q) => q.id)).toEqual(['q1', 'q2'])
    expect(second.questions.map((q) => q.id)).toEqual(['q3'])
    expect(third.questions.map((q) => q.id)).toEqual(['q4'])
  })

  it('empareja por el título en inglés, que es el que usa el generador', () => {
    // La etiqueta la escribe build_content.py desde el documento inglés; si el
    // emparejado usara el título traducido, el curso en español saldría vacío.
    const withSpanishTag = [question('q9', 'Security concepts (es)')]
    const [first] = courseModules(THEORY, withSpanishTag)
    expect(first.questions).toEqual([])
  })

  it('un módulo sin preguntas aparece igualmente, con la lista vacía', () => {
    const theory = [...THEORY, doc('course-cyber-m3', 'Sin preguntas todavía')]
    const module = courseModules(theory, QUESTIONS).find((m) => moduleNumber(m.doc.id) === 3)
    expect(module).toBeDefined()
    expect(module!.questions).toEqual([])
  })

  it('ignora las etiquetas que no son títulos de módulo', () => {
    const q = question('q5', 'Security concepts')
    q.tags = ['real', 'ai-generated', 'course', 'Security concepts']
    const [first] = courseModules(THEORY, [q])
    expect(first.questions.map((x) => x.id)).toEqual(['q5'])
  })

  it('una pregunta sin etiqueta de módulo no se adjudica a ninguno', () => {
    const q = question('q6', 'Security concepts')
    q.tags = ['course', 'ai-generated']
    expect(courseModules(THEORY, [q]).every((m) => m.questions.length === 0)).toBe(true)
  })

  it('sin teoría no hay módulos', () => {
    expect(courseModules([], QUESTIONS)).toEqual([])
  })
})

describe('buscar un módulo', () => {
  it('lo encuentra por su número', () => {
    expect(findModule(THEORY, QUESTIONS, 2)?.doc.title.en).toBe('Cryptographic tools')
  })

  it('devuelve indefinido para un número que no existe', () => {
    expect(findModule(THEORY, QUESTIONS, 99)).toBeUndefined()
  })

  it('no devuelve la introducción como módulo 0', () => {
    expect(findModule(THEORY, QUESTIONS, 0)).toBeUndefined()
  })
})

describe('sobre el curso publicado', () => {
  it('los doce módulos reales tienen sus diez preguntas', async () => {
    const mod = await import('../data/content.course-cybersecurity.generated')
    const modules = courseModules(mod.THEORY_DOCS, mod.QUESTIONS)
    expect(modules).toHaveLength(12)
    for (const module of modules) {
      expect(module.questions.length, `${module.doc.title.es} sin preguntas`).toBe(10)
    }
    // Ninguna pregunta se queda fuera de todos los módulos.
    const assigned = new Set(modules.flatMap((m) => m.questions.map((q) => q.id)))
    expect(assigned.size).toBe(mod.QUESTIONS.length)
  })
})
