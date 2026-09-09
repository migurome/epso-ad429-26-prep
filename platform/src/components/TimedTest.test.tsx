// El simulacro cronometrado es el único sitio de la plataforma donde se
// ESCRIBE el historial del candidato. Si puntúa mal, si guarda el intento con
// los datos cambiados o si no lo guarda, el usuario no ve un error: ve un
// progreso que no es el suyo, y lo descubre semanas después.
//
// Lo que se comprueba aquí es el recorrido completo —elegir preguntas,
// responder, terminar— y sobre todo el intento que queda grabado.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { TimedTest } from './TimedTest'
import { useProgressStore } from '../lib/progressStore'
import { DICT } from '../lib/dictionary'
import type { Question } from '../types/content'
import type { TestFormat } from '../data/competition'

const FORMAT: TestFormat = { questions: 3, minutes: 2, maxScore: 30, passMark: 15 }

function question(id: string, correct: string, tags?: string[]): Question {
  return {
    id,
    phase: 'field-mcq',
    field: 'cybersecurity',
    prompt: { es: `Pregunta ${id}`, en: `Question ${id}` },
    options: ['A', 'B', 'C', 'D'].map((letter) => ({
      id: letter,
      text: { es: `Opción ${letter} de ${id}`, en: `Option ${letter} of ${id}` },
      isCorrect: letter === correct,
    })),
    ...(tags ? { tags } : {}),
  }
}

const BANK = [question('q1', 'A'), question('q2', 'B'), question('q3', 'C')]

beforeEach(() => {
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
})

afterEach(cleanup)

const es = (key: keyof typeof DICT) => DICT[key].es

const clickButton = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))
const startTest = () => clickButton(es('start_test'))
const goNext = () => clickButton(es('next'))
const finishTest = () => clickButton(es('finish_test'))

/** Responde la pregunta visible eligiendo la opción de la letra pedida. Las
 * opciones son botones, así que se buscan por su nombre accesible. */
function answerWith(letter: string) {
  clickButton(new RegExp(`Opción ${letter} de `))
}

/** Qué pregunta del banco se está mostrando ahora mismo. El simulacro baraja,
 * así que el orden no se puede dar por supuesto: hay que leerlo de la pantalla.
 */
function visibleQuestion(bank: Question[]): Question {
  const shown = bank.find((q) => screen.queryByText(q.prompt.es) !== null)
  if (!shown) throw new Error('ninguna pregunta del banco está visible')
  return shown
}

/** Responde la pregunta visible acertando o fallando a propósito. */
function answerCurrent(bank: Question[], correct: boolean) {
  const q = visibleQuestion(bank)
  const option = correct
    ? q.options.find((o) => o.isCorrect)!
    : q.options.find((o) => !o.isCorrect)!
  clickButton(new RegExp(`Opción ${option.id} de ${q.id}`))
}

describe('recorrido del simulacro', () => {
  it('empieza en la pantalla de preparación y anuncia el formato', () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    expect(screen.getByText(es('timed_test_title'))).toBeTruthy()
    expect(screen.getByRole('button', { name: es('start_test') })).toBeTruthy()
  })

  it('avisa cuando no hay preguntas en vez de romperse', () => {
    render(<TimedTest questions={[]} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    expect(screen.getByText(es('no_questions_available'))).toBeTruthy()
  })

  it('presenta las preguntas de una en una y permite navegar', async () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    startTest()

    expect(screen.getByText('Pregunta 1 de 3')).toBeTruthy()
    goNext()
    expect(screen.getByText('Pregunta 2 de 3')).toBeTruthy()
    clickButton(es('previous'))
    expect(screen.getByText('Pregunta 1 de 3')).toBeTruthy()
  })

  it('no corrige nada mientras el test está en marcha', async () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    startTest()
    answerWith('A')
    // En condiciones de examen no se revela el acierto hasta el final.
    expect(screen.queryByText(es('result'))).toBeNull()
  })
})

describe('puntuación', () => {
  /** Recorre las tres preguntas acertando, fallando o dejando en blanco, y
   * termina. `null` deja la pregunta sin responder. */
  function run(outcomes: (boolean | null)[]) {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    startTest()
    for (const [i, outcome] of outcomes.entries()) {
      if (outcome !== null) answerCurrent(BANK, outcome)
      if (i < outcomes.length - 1) goNext()
    }
    finishTest()
  }

  it('acertar todo da la puntuación máxima y aprueba', async () => {
    run([true, true, true])
    expect(screen.getByText('3 / 3')).toBeTruthy()
    expect(screen.getByText(new RegExp(es('passed')))).toBeTruthy()
  })

  it('fallar todo da cero y suspende', async () => {
    run([false, false, false])
    expect(screen.getByText('0 / 3')).toBeTruthy()
    expect(screen.getByText(new RegExp(es('not_passed')))).toBeTruthy()
  })

  it('las preguntas sin responder cuentan como falladas, no se ignoran', async () => {
    run([true, null, null])
    expect(screen.getByText('1 / 3')).toBeTruthy()
    // El componente calcula la puntuación DOS veces: una para esta pantalla y
    // otra para el intento que guarda. Comprobar sólo la pantalla dejaría el
    // segundo cálculo sin red, así que se fija también, y sobre todo que las
    // dos coincidan: si divergen, el historial y el resultado mostrado
    // contarían cosas distintas.
    const [attempt] = useProgressStore.getState().testAttempts
    expect(attempt.results.filter((r) => r.correct)).toHaveLength(1)
    expect(attempt.results.filter((r) => r.selectedOptionId === null).every((r) => !r.correct)).toBe(
      true,
    )
  })

  it('lo que se muestra y lo que se guarda coinciden', async () => {
    run([true, false, null])
    const [attempt] = useProgressStore.getState().testAttempts
    const stored = attempt.results.filter((r) => r.correct).length
    expect(screen.getByText(`${stored} / 3`)).toBeTruthy()
  })

  it('escala la puntuación al máximo del formato y no al número de preguntas', async () => {
    run([true, true, true])
    // 3 de 3 sobre un formato de 30 puntos son 30,0, no 3.
    expect(screen.getByText(/30\.0 \/ 30/)).toBeTruthy()
  })
})

describe('el intento que queda grabado', () => {
  it('registra fase, ámbito, aciertos y total', async () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    startTest()
    answerCurrent(BANK, true)
    goNext()
    answerCurrent(BANK, false)
    goNext()
    answerCurrent(BANK, true)
    finishTest()

    const attempts = useProgressStore.getState().testAttempts
    expect(attempts).toHaveLength(1)
    const attempt = attempts[0]
    expect(attempt.phase).toBe('field-mcq')
    expect(attempt.field).toBe('cybersecurity')
    expect(attempt.totalQuestions).toBe(3)
    expect(attempt.results.filter((r) => r.correct)).toHaveLength(2)
    expect(attempt.finishedAt).toBeTruthy()
    expect(new Date(attempt.finishedAt!).getTime()).toBeGreaterThanOrEqual(
      new Date(attempt.startedAt).getTime(),
    )
  })

  it('guarda qué se marcó en cada pregunta, incluido lo dejado en blanco', async () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    startTest()
    const first = visibleQuestion(BANK)
    answerCurrent(BANK, true)
    goNext()
    goNext()
    finishTest()

    const [attempt] = useProgressStore.getState().testAttempts
    const answered = attempt.results.filter((r) => r.selectedOptionId !== null)
    expect(answered).toHaveLength(1)
    expect(answered[0].questionId).toBe(first.id)
    expect(answered[0].selectedOptionId).toBe(first.options.find((o) => o.isCorrect)!.id)
    expect(attempt.results.filter((r) => r.selectedOptionId === null)).toHaveLength(2)
  })

  it('registra la destreza cuando el simulacro es de razonamiento', async () => {
    render(
      <TimedTest
        questions={BANK.map((q) => ({ ...q, phase: 'reasoning' as const }))}
        format={FORMAT}
        phase="reasoning"
        skill="verbal"
      />,
    )
    startTest()
    clickButton(es('next'))
    clickButton(es('next'))
    finishTest()

    const [attempt] = useProgressStore.getState().testAttempts
    expect(attempt.skill).toBe('verbal')
    expect(attempt.field).toBeUndefined()
  })

  it('un simulacro completado graba exactamente un intento', async () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    startTest()
    goNext()
    goNext()
    finishTest()
    expect(useProgressStore.getState().testAttempts).toHaveLength(1)
  })

  it('repetir el simulacro añade un segundo intento, no reemplaza el primero', async () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    for (let run = 0; run < 2; run += 1) {
      startTest()
      goNext()
      goNext()
      finishTest()
      if (run === 0) clickButton(new RegExp(es('retry_new_questions')))
    }
    expect(useProgressStore.getState().testAttempts).toHaveLength(2)
  })
})

describe('selección de preguntas', () => {
  it('recorta el banco al número de preguntas del formato', async () => {
    // Con el banco más grande que el examen: si no recortara, el simulacro
    // duraría más de lo que anuncia y el intento guardaría un total falso.
    const big = Array.from({ length: 8 }, (_, i) => question(`q${i}`, 'A'))
    render(
      <TimedTest
        questions={big}
        format={{ ...FORMAT, questions: 3 }}
        phase="field-mcq"
        field="cybersecurity"
      />,
    )
    startTest()
    expect(screen.getByText('Pregunta 1 de 3')).toBeTruthy()
    goNext()
    goNext()
    finishTest()
    expect(useProgressStore.getState().testAttempts[0].totalQuestions).toBe(3)
  })

  it('nunca pide más preguntas de las que hay', async () => {
    render(
      <TimedTest
        questions={BANK.slice(0, 2)}
        format={{ ...FORMAT, questions: 10 }}
        phase="field-mcq"
        field="cybersecurity"
      />,
    )
    startTest()
    expect(screen.getByText('Pregunta 1 de 2')).toBeTruthy()
  })

  it('prefiere el banco real cuando hay suficiente', async () => {
    const mixed = [
      question('real1', 'A', ['real']),
      question('real2', 'A', ['real']),
      question('bonus1', 'A', ['ai-generated']),
      question('bonus2', 'A', ['ai-generated']),
    ]
    render(
      <TimedTest
        questions={mixed}
        format={{ ...FORMAT, questions: 2 }}
        phase="field-mcq"
        field="cybersecurity"
      />,
    )
    startTest()
    clickButton(es('next'))
    finishTest()

    const [attempt] = useProgressStore.getState().testAttempts
    expect(attempt.results.every((r) => r.questionId.startsWith('real'))).toBe(true)
  })

  it('cae al banco completo cuando el real no da para el formato', async () => {
    const mixed = [
      question('real1', 'A', ['real']),
      question('bonus1', 'A', ['ai-generated']),
      question('bonus2', 'A', ['ai-generated']),
    ]
    render(
      <TimedTest
        questions={mixed}
        format={{ ...FORMAT, questions: 3 }}
        phase="field-mcq"
        field="cybersecurity"
      />,
    )
    startTest()
    expect(screen.getByText('Pregunta 1 de 3')).toBeTruthy()
  })
})

describe('cronómetro', () => {
  it('al agotarse el tiempo termina solo y guarda el intento', async () => {
    vi.useFakeTimers()
    try {
      render(
        <TimedTest
          questions={BANK}
          format={{ ...FORMAT, minutes: 1 }}
          phase="field-mcq"
          field="cybersecurity"
        />,
      )
      // userEvent no funciona con temporizadores falsos; el clic directo sí.
      await act(async () => {
        screen.getByRole('button', { name: es('start_test') }).click()
      })
      expect(screen.getByText('Pregunta 1 de 3')).toBeTruthy()

      await act(async () => {
        vi.advanceTimersByTime(61_000)
      })

      expect(screen.getByText(es('result'))).toBeTruthy()
      const attempts = useProgressStore.getState().testAttempts
      expect(attempts).toHaveLength(1)
      // El tiempo empleado se mide contra el reloj, así que un test agotado
      // registra el total y no `total - 1` (ver el comentario en finish()).
      expect(attempts[0].timeSpentSeconds).toBe(60)
    } finally {
      vi.useRealTimers()
    }
  })

  it('«repetir» vuelve a la preparación con el reloj entero', async () => {
    render(<TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />)
    startTest()
    goNext()
    goNext()
    finishTest()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(es('retry_new_questions')) }))

    expect(screen.getByRole('button', { name: es('start_test') })).toBeTruthy()
  })
})

describe('barra de progreso de preguntas', () => {
  it('permite saltar a una pregunta concreta', async () => {
    const { container } = render(
      <TimedTest questions={BANK} format={FORMAT} phase="field-mcq" field="cybersecurity" />,
    )
    startTest()

    const jumps = within(container).getAllByRole('button').filter((b) => b.className.includes('h-1.5'))
    expect(jumps).toHaveLength(3)
    fireEvent.click(jumps[2])
    expect(screen.getByText('Pregunta 3 de 3')).toBeTruthy()
  })
})
