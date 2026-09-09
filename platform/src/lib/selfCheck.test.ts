// Las comprobaciones de selfCheck.ts son la única red que tiene el contenido:
// si una deja de detectar lo que promete, el banco se degrada en silencio y
// contentIntegrity.test.ts sigue en verde porque el contenido real está bien.
//
// Por eso aquí no se comprueba contenido: se comprueban las COMPROBACIONES.
// Cada caso construye un bloque deliberadamente roto y exige que la incidencia
// aparezca, y uno correcto que debe pasar limpio. Es lo que en su día verifiqué
// a mano rompiendo el banco y mirando si fallaba; esto lo deja hecho para
// siempre.
import { describe, it, expect } from 'vitest'
import type { Question, TheoryDoc } from '../types/content'
import {
  LETTER_SHARE_LIMIT,
  checkAnswerSpread,
  checkCompetitions,
  checkExplanations,
  checkFieldOwnership,
  checkVolume,
  checkWellFormed,
  type Bundle,
  type ContentTarget,
} from './selfCheck'

const TARGET: ContentTarget = {
  id: 'prueba',
  label: { es: 'Prueba', en: 'Test' },
  load: () => Promise.reject(new Error('no se usa')),
  phase: 'field-mcq',
  field: 'cybersecurity',
}

const REASONING_TARGET: ContentTarget = {
  ...TARGET,
  phase: 'reasoning',
  skill: 'verbal',
  field: undefined,
}

/** Una pregunta bien formada, sobre la que cada caso rompe una sola cosa. */
function question(id: string, correct = 'A', overrides: Partial<Question> = {}): Question {
  return {
    id,
    phase: 'field-mcq',
    field: 'cybersecurity',
    prompt: { es: 'Enunciado', en: 'Prompt' },
    options: ['A', 'B', 'C', 'D'].map((letter) => ({
      id: letter,
      text: { es: `Opción ${letter}`, en: `Option ${letter}` },
      isCorrect: letter === correct,
      explanation: letter === correct ? { es: 'Porque sí', en: 'Because' } : undefined,
    })),
    ...overrides,
  }
}

function doc(id = 'teoria'): TheoryDoc {
  return {
    id,
    phase: 'field-mcq',
    title: { es: 'Título', en: 'Title' },
    summaryMd: { es: 'Cuerpo', en: 'Body' },
  }
}

function bundle(questions: Question[], theory: TheoryDoc[] = [doc()]): Bundle {
  return { QUESTIONS: questions, THEORY_DOCS: theory, ESSAY_PROMPTS: [] }
}

/** Un banco sano de n preguntas con la letra correcta bien repartida. */
function healthyBank(n = 40): Question[] {
  const letters = ['A', 'B', 'C', 'D']
  return Array.from({ length: n }, (_, i) => question(`q${i}`, letters[i % 4]))
}

function problems(check: { issues: { where: string; problem: { es: string } }[] }): string[] {
  return check.issues.map((i) => `${i.where}: ${i.problem.es}`)
}

describe('forma y traducción', () => {
  it('un banco correcto no produce incidencias', () => {
    expect(checkWellFormed(TARGET, bundle(healthyBank())).issues).toEqual([])
  })

  it('detecta una traducción vacía en una opción', () => {
    const q = question('q1')
    q.options[0].text = { es: '', en: 'Option A' }
    const found = problems(checkWellFormed(TARGET, bundle([q])))
    expect(found).toEqual(["prueba / q1 · opción A: vacío en 'es'"])
  })

  it('detecta un enunciado vacío en inglés', () => {
    const q = question('q1', 'A', { prompt: { es: 'Enunciado', en: '   ' } })
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toEqual([
      "prueba / q1 · enunciado: vacío en 'en'",
    ])
  })

  it('detecta una explicación a medio traducir', () => {
    const q = question('q1')
    q.options[0].explanation = { es: 'Porque sí', en: '' }
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toContain(
      "prueba / q1 · explicación A: vacío en 'en'",
    )
  })

  it('detecta dos respuestas correctas', () => {
    const q = question('q1')
    q.options[1].isCorrect = true
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toContain(
      'prueba / q1: 2 opciones correctas (se espera 1)',
    )
  })

  it('detecta que no haya ninguna correcta', () => {
    const q = question('q1')
    for (const o of q.options) o.isCorrect = false
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toContain(
      'prueba / q1: 0 opciones correctas (se espera 1)',
    )
  })

  it('detecta ids de opción repetidos', () => {
    const q = question('q1')
    q.options[1].id = 'A'
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toContain(
      'prueba / q1: ids de opción repetidos [A,A,C,D]',
    )
  })

  it('detecta un id de opción fuera de A–E', () => {
    const q = question('q1')
    q.options[3].id = 'F'
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toContain(
      "prueba / q1: id de opción no válido 'F'",
    )
  })

  it('detecta un número de opciones imposible', () => {
    const q = question('q1')
    q.options = q.options.slice(0, 1)
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toContain(
      'prueba / q1: 1 opciones (se esperan 2–5)',
    )
  })

  it('detecta ids de pregunta repetidos dentro del bloque', () => {
    expect(problems(checkWellFormed(TARGET, bundle([question('q1'), question('q1')])))).toContain(
      "prueba: id de pregunta repetido 'q1'",
    )
  })

  it('detecta una pregunta colocada en el bloque equivocado', () => {
    const q = question('q1', 'A', { field: 'data-science' })
    expect(problems(checkWellFormed(TARGET, bundle([q])))).toContain(
      "prueba / q1: ámbito 'data-science'",
    )
  })

  it('detecta una destreza equivocada en razonamiento', () => {
    const q = question('q1', 'A', { phase: 'reasoning', skill: 'numerical', field: undefined })
    expect(problems(checkWellFormed(REASONING_TARGET, bundle([q])))).toContain(
      "prueba / q1: destreza 'numerical'",
    )
  })

  it('detecta teoría sin cuerpo traducido', () => {
    const d = doc()
    d.summaryMd = { es: 'Cuerpo', en: '' }
    expect(problems(checkWellFormed(TARGET, bundle([], [d])))).toContain(
      "prueba / teoría teoria · cuerpo: vacío en 'en'",
    )
  })
})

describe('reparto de la letra correcta', () => {
  it('un reparto equilibrado pasa', () => {
    expect(checkAnswerSpread(TARGET, bundle(healthyBank())).issues).toEqual([])
  })

  // El fallo que motivó esta comprobación (commit 4414216) tenía la B correcta
  // en 77 de 80 preguntas: se aprobaba marcando siempre la misma letra.
  it('detecta un banco entero sesgado a una letra', () => {
    const bank = Array.from({ length: 40 }, (_, i) => question(`q${i}`, 'B'))
    const found = problems(checkAnswerSpread(TARGET, bundle(bank)))
    expect(found).toContain('prueba: la letra B es la correcta en 40 de 40 (B=40)')
  })

  it('detecta un sesgo justo por encima del umbral', () => {
    const biased = Math.ceil(100 * LETTER_SHARE_LIMIT)
    const bank = Array.from({ length: 100 }, (_, i) =>
      question(`q${i}`, i < biased ? 'B' : ['A', 'C', 'D'][i % 3]),
    )
    expect(checkAnswerSpread(TARGET, bundle(bank)).issues.length).toBeGreaterThan(0)
  })

  it('deja pasar un desequilibrio natural por debajo del umbral', () => {
    const bank = Array.from({ length: 100 }, (_, i) =>
      question(`q${i}`, i < 40 ? 'B' : ['A', 'C', 'D'][i % 3]),
    )
    expect(checkAnswerSpread(TARGET, bundle(bank)).issues).toEqual([])
  })

  it('detecta una letra que se ofrece y nunca es la correcta', () => {
    const bank = Array.from({ length: 40 }, (_, i) => question(`q${i}`, ['A', 'B', 'C'][i % 3]))
    expect(problems(checkAnswerSpread(TARGET, bundle(bank)))).toContain(
      'prueba: la letra D nunca es correcta',
    )
  })

  it('un banco vacío no produce incidencias ni divide por cero', () => {
    expect(checkAnswerSpread(TARGET, bundle([])).issues).toEqual([])
  })
})

describe('explicaciones', () => {
  it('un banco de ámbito explicado al 100 % pasa', () => {
    expect(checkExplanations(TARGET, bundle(healthyBank())).issues).toEqual([])
  })

  it('exige el 100 % en los bancos de ámbito', () => {
    const bank = healthyBank(40)
    delete bank[0].options.find((o) => o.isCorrect)!.explanation
    expect(problems(checkExplanations(TARGET, bundle(bank)))).toEqual([
      'prueba: sólo 39 de 40 preguntas explicadas (mínimo 100 %)',
    ])
  })

  // Los bancos de razonamiento arrastran preguntas oficiales de EPSO
  // publicadas sin solución razonada, así que ahí el listón es de cobertura.
  it('tolera hasta un 15 % sin explicar en razonamiento', () => {
    const bank = healthyBank(100).map((q, i) => {
      if (i < 14) delete q.options.find((o) => o.isCorrect)!.explanation
      return { ...q, phase: 'reasoning' as const, skill: 'verbal' as const, field: undefined }
    })
    expect(checkExplanations(REASONING_TARGET, bundle(bank)).issues).toEqual([])
  })

  it('falla en razonamiento por debajo del 85 %', () => {
    const bank = healthyBank(100).map((q, i) => {
      if (i < 16) delete q.options.find((o) => o.isCorrect)!.explanation
      return { ...q, phase: 'reasoning' as const, skill: 'verbal' as const, field: undefined }
    })
    expect(checkExplanations(REASONING_TARGET, bundle(bank)).issues.length).toBe(1)
  })

  it('no cuenta como explicada una explicación a medio traducir', () => {
    const bank = healthyBank(40)
    bank[0].options.find((o) => o.isCorrect)!.explanation = { es: 'Porque sí', en: '' }
    expect(checkExplanations(TARGET, bundle(bank)).issues.length).toBe(1)
  })
})

describe('volumen de material', () => {
  it('un banco suficiente con teoría pasa', () => {
    expect(checkVolume(TARGET, bundle(healthyBank())).issues).toEqual([])
  })

  it('detecta un banco que no llega para un simulacro', () => {
    expect(problems(checkVolume(TARGET, bundle(healthyBank(29))))).toContain(
      'prueba: 29 preguntas, no llegan a las 30 de un simulacro',
    )
  })

  it('detecta un bloque sin teoría', () => {
    expect(problems(checkVolume(TARGET, bundle(healthyBank(), [])))).toContain(
      'prueba: sin documento de teoría',
    )
  })

  it('un ámbito pendiente debe traer alcance y ningún banco', () => {
    const pending = { ...TARGET, bankPending: true }
    expect(checkVolume(pending, bundle([])).issues).toEqual([])
    expect(problems(checkVolume(pending, bundle(healthyBank())))).toContain(
      'prueba: marcado como pendiente pero trae banco',
    )
  })
})

// Los datos de convocatoria se presentan como hechos oficiales, así que su
// comprobación se ejecuta sobre los datos reales: aquí sólo se confirma que la
// comprobación existe y que hoy pasa, porque romperla exigiría alterar
// COMPETITIONS y eso ya lo cubre contentIntegrity.
describe('metadatos de convocatoria', () => {
  it('las convocatorias reales pasan sus comprobaciones', () => {
    const checks = [...checkCompetitions(), checkFieldOwnership()]
    expect(checks.length).toBeGreaterThan(0)
    for (const check of checks) expect(problems(check)).toEqual([])
  })

  it('cada comprobación explica qué ha mirado', () => {
    for (const check of checkCompetitions()) {
      expect(check.detail?.es).toBeTruthy()
      expect(check.detail?.en).toBeTruthy()
    }
  })
})
