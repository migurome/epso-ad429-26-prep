// La tabla de progreso es de donde el candidato saca su idea de si va
// preparado. Una media mal calculada o una fila que se pierde no rompen nada
// visible: simplemente le dan una impresión equivocada de su nivel, que es
// exactamente lo que esta pantalla existe para evitar.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProgressPage } from './ProgressPage'
import { useProgressStore } from '../lib/progressStore'
import { useLocaleStore } from '../lib/localeStore'
import { DICT } from '../lib/dictionary'
import { COMPETITIONS, REASONING_SKILLS } from '../data/competition'
import type { EssayAttempt, TestAttempt } from '../types/content'

const es = (key: keyof typeof DICT) => DICT[key].es

/** Un intento con `correct` de `total` aciertos. */
function attempt(
  id: string,
  correct: number,
  total: number,
  extra: Partial<TestAttempt> = {},
): TestAttempt {
  return {
    id,
    phase: 'reasoning',
    skill: 'verbal',
    startedAt: '2026-09-09T10:00:00.000Z',
    finishedAt: '2026-09-09T10:10:00.000Z',
    results: Array.from({ length: total }, (_, i) => ({
      questionId: `q${i}`,
      selectedOptionId: 'A',
      correct: i < correct,
    })),
    totalQuestions: total,
    timeSpentSeconds: 600,
    ...extra,
  }
}

function essay(id: string, seconds = 2400): EssayAttempt {
  return { id, promptId: 'p1', startedAt: '2026-09-09T10:00:00.000Z', text: 'x', timeSpentSeconds: seconds }
}

function show() {
  return render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>,
  )
}

/** La fila de la tabla cuyo primer campo es `label`. */
function row(label: string): HTMLElement {
  const cell = screen.getByText(label)
  const tr = cell.closest('tr')
  if (!tr) throw new Error(`no hay fila para ${label}`)
  return tr
}

const VERBAL = REASONING_SKILLS.find((s) => s.id === 'verbal')!

beforeEach(() => {
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
  useLocaleStore.setState({ locale: 'es' })
})

afterEach(cleanup)

describe('sin actividad', () => {
  it('invita a empezar en vez de enseñar una tabla vacía', () => {
    show()
    expect(screen.getByText(es('no_tests_completed_title'))).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('no ofrece borrar un historial que no existe', () => {
    show()
    expect(screen.queryByRole('button', { name: new RegExp(es('clear_history')) })).toBeNull()
  })
})

describe('estadísticas de la tabla', () => {
  it('cuenta los intentos de cada prueba', () => {
    useProgressStore.setState({
      testAttempts: [attempt('a1', 10, 20), attempt('a2', 15, 20)],
      essayAttempts: [],
    })
    show()
    const cells = within(row(VERBAL.label.es)).getAllByRole('cell')
    expect(cells[1].textContent).toBe('2')
  })

  it('promedia sobre la escala de la prueba, no sobre el número de preguntas', () => {
    // Dos simulacros cortos, de 10 preguntas, sobre una prueba de 20 puntos:
    // 5/10 son 10,0 y 10/10 son 20,0, así que la media es 15,0. Si la media se
    // calculara sobre las preguntas en vez de sobre la escala, saldría 7,5 y
    // el candidato se creería la mitad de preparado de lo que está.
    useProgressStore.setState({
      testAttempts: [attempt('a1', 5, 10), attempt('a2', 10, 10)],
      essayAttempts: [],
    })
    show()
    const cells = within(row(VERBAL.label.es)).getAllByRole('cell')
    expect(cells[2].textContent).toBe(`15.0 / ${VERBAL.format.maxScore}`)
  })

  it('la mejor marca es la máxima, no la última', () => {
    useProgressStore.setState({
      testAttempts: [attempt('a1', 20, 20), attempt('a2', 4, 20)],
      essayAttempts: [],
    })
    show()
    const cells = within(row(VERBAL.label.es)).getAllByRole('cell')
    expect(cells[3].textContent).toBe(`20.0 / ${VERBAL.format.maxScore}`)
  })

  it('suma el tiempo de todos los intentos', () => {
    useProgressStore.setState({
      testAttempts: [attempt('a1', 1, 20), attempt('a2', 1, 20, { timeSpentSeconds: 300 })],
      essayAttempts: [],
    })
    show()
    const cells = within(row(VERBAL.label.es)).getAllByRole('cell')
    expect(cells[4].textContent).toBe('15:00')
  })

  it('un intento sin preguntas no rompe la media con una división por cero', () => {
    useProgressStore.setState({
      testAttempts: [{ ...attempt('a1', 0, 0), results: [], totalQuestions: 0 }],
      essayAttempts: [],
    })
    show()
    const cells = within(row(VERBAL.label.es)).getAllByRole('cell')
    expect(cells[2].textContent).toBe(`0.0 / ${VERBAL.format.maxScore}`)
  })
})

describe('qué filas aparecen', () => {
  it('sólo las pruebas con algún intento', () => {
    useProgressStore.setState({ testAttempts: [attempt('a1', 10, 20)], essayAttempts: [] })
    show()
    expect(screen.getByText(VERBAL.label.es)).toBeTruthy()
    const numerical = REASONING_SKILLS.find((s) => s.id === 'numerical')!
    expect(screen.queryByText(numerical.label.es)).toBeNull()
  })

  // Cambiar de convocatoria no debe hacer desaparecer del historial lo ya
  // trabajado en la otra: el progreso es del candidato, no de la convocatoria.
  it('muestra los ámbitos de las dos convocatorias a la vez', () => {
    useProgressStore.setState({
      testAttempts: [
        attempt('a1', 10, 20, { phase: 'field-mcq', skill: undefined, field: 'cybersecurity' }),
        attempt('a2', 10, 20, { phase: 'field-mcq', skill: undefined, field: 'data-science' }),
      ],
      essayAttempts: [],
    })
    show()
    const cyber = COMPETITIONS.ad8.fields.find((f) => f.id === 'cybersecurity')!
    const ds = COMPETITIONS.ad7.fields.find((f) => f.id === 'data-science')!
    expect(screen.getByText(cyber.label.es)).toBeTruthy()
    expect(screen.getByText(ds.label.es)).toBeTruthy()
  })

  it('separa los intentos de cada ámbito en su propia fila', () => {
    useProgressStore.setState({
      testAttempts: [
        attempt('a1', 20, 20, { phase: 'field-mcq', skill: undefined, field: 'cybersecurity' }),
        attempt('a2', 0, 20, { phase: 'field-mcq', skill: undefined, field: 'data-science' }),
      ],
      essayAttempts: [],
    })
    show()
    const cyber = COMPETITIONS.ad8.fields.find((f) => f.id === 'cybersecurity')!
    expect(within(row(cyber.label.es)).getAllByRole('cell')[1].textContent).toBe('1')
  })

  // Quien sólo hubiera guardado redacciones veía una tabla con cabeceras y
  // ninguna fila debajo.
  it('con sólo redacciones no dibuja la tabla, pero sí su resumen', () => {
    useProgressStore.setState({ testAttempts: [], essayAttempts: [essay('e1')] })
    show()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText(es('nav_eufte'))).toBeTruthy()
  })
})

describe('resumen de redacciones', () => {
  it('cuenta las redacciones y su tiempo total', () => {
    useProgressStore.setState({
      testAttempts: [],
      essayAttempts: [essay('e1', 1200), essay('e2', 1800)],
    })
    show()
    expect(screen.getByText(/50:00/)).toBeTruthy()
  })

  it('no aparece si no hay ninguna', () => {
    useProgressStore.setState({ testAttempts: [attempt('a1', 5, 20)], essayAttempts: [] })
    show()
    expect(screen.queryByText(es('nav_eufte'))).toBeNull()
  })
})
