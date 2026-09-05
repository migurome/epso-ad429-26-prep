// Regla de la que se queja el alumno cuando se rompe: dentro de una misma
// pregunta de razonamiento abstracto, o TODO son figuras o TODO es texto.
// El banco real describe muchas figuras en prosa que no se reducen al juego de
// símbolos; cuando se dibujaba "lo que se podía", la secuencia salía mitad
// iconos mitad párrafos y las opciones dejaban de ser comparables.
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QuestionCard } from './QuestionCard'
import type { Question } from '../types/content'
import { SCANNED_FIGURES } from '../data/scannedFigures.generated'
import { QUESTIONS } from '../data/content.abstract.generated'

const SCANNED_ID = 'abs-real-1'

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

  it('serves the book scan, not a redrawing, for the questions that have one', () => {
    // El banco real sale de un libro escaneado: cuando hay recorte, mandan las
    // dos imágenes (enunciado y opciones) y las opciones se reducen a su letra.
    // Redibujar la misma pregunta al lado sería enseñar dos figuras distintas
    // para la misma pregunta.
    const q = { ...build('● · ○ · ?', ['●', '○', '■', '▲', '⬠']), id: SCANNED_ID }
    render0(q)
    const images = screen.getAllByRole('img')
    expect(images.map((i) => (i as HTMLImageElement).src.split('/').pop())).toEqual([
      `${SCANNED_ID}-prompt.webp`,
      `${SCANNED_ID}-options.webp`,
    ])
    expect(drawnOptions()).toBe(0)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('has a scan for every question of the real bank', () => {
    // Si `extract_figures.py` deja de recortar una página, esas preguntas
    // desaparecen del manifiesto y vuelven solas al dibujo vectorial: no se
    // rompe nada, pero conviene enterarse.
    const real = QUESTIONS.filter((q) => q.skill === 'abstract' && q.id.startsWith('abs-real-'))
    expect(real.length).toBe(120)
    expect(real.filter((q) => !SCANNED_FIGURES.has(q.id)).map((q) => q.id)).toEqual([])
  })
})
