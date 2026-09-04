// Regla de la que se queja el alumno cuando se rompe: dentro de una misma
// pregunta de razonamiento abstracto, o TODO son figuras o TODO es texto.
// El banco real describe muchas figuras en prosa que no se reducen al juego de
// símbolos; cuando se dibujaba "lo que se podía", la secuencia salía mitad
// iconos mitad párrafos y las opciones dejaban de ser comparables.
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QuestionCard } from './QuestionCard'
import type { Question } from '../types/content'

afterEach(cleanup)

function build(prompt: string, options: string[]): Question {
  return {
    id: 'q',
    phase: 'reasoning',
    skill: 'abstract',
    prompt: { en: prompt, es: prompt },
    options: options.map((text, i) => ({
      id: 'ABCDE'[i],
      text: { en: text, es: text },
      isCorrect: i === 0,
    })),
  } as Question
}

const render0 = (q: Question) =>
  render(<QuestionCard question={q} selectedOptionId={null} revealed={false} onSelect={() => {}} />)

/** Nº de opciones dibujadas como figura (el <svg> de ShapeIcon). */
function drawnOptions(): number {
  return screen.getAllByRole('button').filter((b) => b.querySelector('svg')).length
}

describe('QuestionCard, abstract figures', () => {
  it('draws every option when they all reduce to figures', () => {
    const q = build('[○○ / ▲▼▲] · [●● / △▽△] · ?', ['○○ / ▲▲▲', '●● / ▽▽▽', '○● / ▲▽▲', '●○ / △△△', '○○ / ▽▲▽'])
    render0(q)
    expect(drawnOptions()).toBe(5)
  })

  it('drops to text for the whole question when one option is only prose', () => {
    const q = build('[○○ / ▲▼▲] · [●● / △▽△] · ?', ['○○ / ▲▲▲', '●● / ▽▽▽', '○● / ▲▽▲', '●○ / △△△', '[an irregular blob]'])
    render0(q)
    expect(drawnOptions()).toBe(0)
    expect(screen.getByText('[an irregular blob]')).toBeTruthy()
  })

  it('drops to text when two options would draw the same figure but say different things', () => {
    // El parser no modela lo que llevan dentro, así que las dos primeras se
    // dibujarían idénticas — y una está marcada como correcta.
    const q = build('● · ○ · ?', ['●(a dot inside)', '●(a cross inside)', '○', '■', '⬠'])
    render0(q)
    expect(drawnOptions()).toBe(0)
  })

  it('keeps figures when the repeated option is a deliberate duplicate', () => {
    // "cuatro de estas cinco comparten una regla, una no": los distractores
    // repetidos son el diseño de la pregunta, no un fallo del dibujo.
    const q = build('Four of these five share a rule.', ['●●▲', '●●▲', '●●▲', '●●△', '●●▲'])
    render0(q)
    expect(drawnOptions()).toBe(5)
  })
})
