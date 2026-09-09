// Los dos historiales enseñan al candidato lo que ya hizo. Si ordenan mal,
// puntúan mal o pierden un intento, la información es errónea y él no tiene
// forma de saberlo: no hay nada con lo que contrastar.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { AttemptHistory } from './AttemptHistory'
import { EssayHistory } from './EssayHistory'
import { useLocaleStore } from '../lib/localeStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { DICT } from '../lib/dictionary'
import type { EssayAttempt, EssayPrompt, TestAttempt } from '../types/content'

const es = (key: keyof typeof DICT) => DICT[key].es

function attempt(id: string, correct: number, total: number, startedAt: string): TestAttempt {
  return {
    id,
    phase: 'reasoning',
    skill: 'verbal',
    startedAt,
    finishedAt: startedAt,
    results: Array.from({ length: total }, (_, i) => ({
      questionId: `q${i}`,
      selectedOptionId: 'A',
      correct: i < correct,
    })),
    totalQuestions: total,
    timeSpentSeconds: 900,
  }
}

const PROMPT: EssayPrompt = {
  id: 'p1',
  title: { es: 'Cohesión territorial', en: 'Territorial cohesion' },
  briefMd: { es: 'brief', en: 'brief' },
  recommendedMinutes: 40,
}

function essay(id: string, startedAt: string, text: string): EssayAttempt {
  return { id, promptId: 'p1', startedAt, finishedAt: startedAt, text, timeSpentSeconds: 2400 }
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useTestLocaleStore.setState({ locale: 'es' })
})

afterEach(cleanup)

describe('historial de simulacros', () => {
  it('sin intentos invita a hacer uno', () => {
    render(<AttemptHistory attempts={[]} maxScore={20} />)
    expect(screen.getByText(es('no_attempts_title'))).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('ordena del más reciente al más antiguo', () => {
    render(
      <AttemptHistory
        attempts={[
          attempt('viejo', 5, 20, '2026-09-01T10:00:00.000Z'),
          attempt('nuevo', 15, 20, '2026-09-09T10:00:00.000Z'),
          attempt('medio', 10, 20, '2026-09-05T10:00:00.000Z'),
        ]}
        maxScore={20}
      />,
    )
    // La columna de aciertos delata el orden sin depender del formato de fecha.
    const correct = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[2].textContent)
    expect(correct).toEqual(['15 / 20', '10 / 20', '5 / 20'])
  })

  it('no reordena el array que recibe', () => {
    const attempts = [
      attempt('a', 5, 20, '2026-09-01T10:00:00.000Z'),
      attempt('b', 15, 20, '2026-09-09T10:00:00.000Z'),
    ]
    render(<AttemptHistory attempts={attempts} maxScore={20} />)
    // Ordenar el array del store en su sitio haría que otras vistas que lo
    // comparten cambiaran de orden sin motivo aparente.
    expect(attempts.map((a) => a.id)).toEqual(['a', 'b'])
  })

  it('escala la puntuación al máximo de la prueba', () => {
    render(<AttemptHistory attempts={[attempt('a', 5, 10, '2026-09-09T10:00:00.000Z')]} maxScore={30} />)
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell')
    expect(cells[1].textContent).toBe('15.0 / 30')
  })

  it('un intento sin preguntas no rompe la puntuación', () => {
    const empty = { ...attempt('a', 0, 0, '2026-09-09T10:00:00.000Z'), results: [], totalQuestions: 0 }
    render(<AttemptHistory attempts={[empty]} maxScore={20} />)
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell')
    expect(cells[1].textContent).toBe('0.0 / 20')
  })

  it('muestra el tiempo empleado en formato de reloj', () => {
    render(<AttemptHistory attempts={[attempt('a', 5, 20, '2026-09-09T10:00:00.000Z')]} maxScore={20} />)
    expect(screen.getByText('15:00')).toBeTruthy()
  })
})

describe('historial de redacciones', () => {
  it('sin redacciones invita a escribir una', () => {
    render(<EssayHistory attempts={[]} prompts={[PROMPT]} />)
    expect(screen.getByText(es('no_essays_title'))).toBeTruthy()
  })

  it('nombra el tema de cada redacción', () => {
    render(
      <EssayHistory
        attempts={[essay('e1', '2026-09-09T10:00:00.000Z', 'una dos tres')]}
        prompts={[PROMPT]}
      />,
    )
    expect(screen.getByText(/Cohesión territorial/)).toBeTruthy()
  })

  it('cuenta las palabras escritas', () => {
    render(
      <EssayHistory
        attempts={[essay('e1', '2026-09-09T10:00:00.000Z', '  una   dos tres cuatro ')]}
        prompts={[PROMPT]}
      />,
    )
    expect(screen.getByText(new RegExp(es('n_words').replace('{n}', '4')))).toBeTruthy()
  })

  it('ordena del más reciente al más antiguo', () => {
    render(
      <EssayHistory
        attempts={[
          essay('vieja', '2026-09-01T10:00:00.000Z', 'una'),
          essay('nueva', '2026-09-09T10:00:00.000Z', 'una dos'),
        ]}
        prompts={[PROMPT]}
      />,
    )
    const body = document.body.textContent ?? ''
    expect(body.indexOf(es('n_words').replace('{n}', '2'))).toBeLessThan(
      body.indexOf(es('n_words').replace('{n}', '1')),
    )
  })

  it('sobrevive a una redacción cuyo tema ya no existe', () => {
    // Si un enunciado se retira del banco, el intento guardado sigue en el
    // navegador: la pantalla no puede reventar por eso.
    render(
      <EssayHistory attempts={[essay('e1', '2026-09-09T10:00:00.000Z', 'texto')]} prompts={[]} />,
    )
    expect(screen.getByText(new RegExp(es('n_words').replace('{n}', '1')))).toBeTruthy()
  })
})
