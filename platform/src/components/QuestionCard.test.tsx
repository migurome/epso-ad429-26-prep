// Regla de la que se queja el alumno cuando se rompe: dentro de una misma
// pregunta de razonamiento abstracto, o TODO son figuras o TODO es texto.
// El banco real describe muchas figuras en prosa que no se reducen al juego de
// símbolos; cuando se dibujaba "lo que se podía", la secuencia salía mitad
// iconos mitad párrafos y las opciones dejaban de ser comparables.
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QuestionCard } from './QuestionCard'
import type { Question } from '../types/content'
import { SCANNED_FIGURES } from '../data/scannedFigures.generated'
import { QUESTIONS } from '../data/content.abstract.generated'
import { useLocaleStore } from '../lib/localeStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'

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

// ─────────────────────────────────────────────────────────────────────────────
// Ejercicios del motor de figuras abstractas. Llegan con la figura ya pintada
// en SVG —tablero y opciones— y la tarjeta los enseña tal cual, dentro de <img>.
// Lo que importa: que cada figura acabe en su sitio, que el rótulo de texto de
// la opción ('Figura A') ni se lea como notación ni se enseñe, y que el SVG
// nunca se inserte como marcado.
// ─────────────────────────────────────────────────────────────────────────────

const figure = (label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>${label}</title><circle cx="50" cy="50" r="30"/></svg>`

/** Un ejercicio del motor bien formado, sobre el que cada caso rompe una cosa. */
function engineQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'abs-gen-00ff',
    phase: 'reasoning',
    skill: 'abstract',
    prompt: { es: '¿Qué figura continúa la serie?', en: 'Which figure continues the series?' },
    figureOnly: true,
    board: { cellSize: 100, rows: [[figure('casilla-1'), figure('casilla-2'), null]] },
    options: ['A', 'B', 'C', 'D', 'E'].map((id) => ({
      id,
      text: { es: `Figura ${id}`, en: `Figure ${id}` },
      isCorrect: id === 'C',
      explanation: { es: `Explicación ${id}`, en: `Explanation ${id}` },
      figure: figure(`opcion-${id}`),
    })),
    tags: ['engine', 'series'],
    provenance: {
      family: 'series',
      seed: 's1',
      difficulty: 4,
      contentHash: '00ff',
      engineVersion: '0.1.0',
    },
    ...overrides,
  }
}

/** El SVG que pinta una <img>, leído de vuelta de su URL de datos. */
const svgOf = (img: Element) => decodeURIComponent(img.getAttribute('src')!.split(',')[1])

const renderEngine = (
  q: Question,
  props: { revealed?: boolean; selectedOptionId?: string | null; hidePrompt?: boolean } = {},
) =>
  render(
    <QuestionCard
      question={q}
      selectedOptionId={props.selectedOptionId ?? null}
      revealed={props.revealed ?? false}
      hidePrompt={props.hidePrompt}
      onSelect={() => {}}
    />,
  )

describe('ejercicios del motor de figuras', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'es' })
    useTestLocaleStore.setState({ locale: 'es' })
  })

  it('pinta el tablero: cada casilla con su figura y la que falta marcada', () => {
    renderEngine(engineQuestion())
    const casillas = screen.getAllByRole('img', { name: /del tablero/ })
    expect(casillas.map((img) => svgOf(img).match(/<title>(.*)<\/title>/)![1])).toEqual([
      'casilla-1',
      'casilla-2',
    ])
    expect(screen.getByRole('img', { name: 'Casilla que falta' }).textContent).toBe('?')
  })

  it('cada opción es su propia figura, bajo su letra', () => {
    renderEngine(engineQuestion())
    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      const img = screen.getByRole('img', { name: `Figura ${id}` })
      expect(svgOf(img)).toContain(`<title>opcion-${id}</title>`)
      expect(img.closest('button')!.textContent).toContain(id)
    }
  })

  it('el rótulo de texto de la opción no se enseña', () => {
    // 'Figura A' existe para que el contenido no tenga huecos, no para leerse:
    // la figura ya es la opción.
    const { container } = renderEngine(engineQuestion())
    expect(container.textContent).not.toContain('Figura A')
  })

  it('no se lee como notación: no se dibuja ningún icono en su lugar', () => {
    // Leído como notación, 'Figura A' saldría como pie de texto de un panel.
    const { container } = renderEngine(engineQuestion())
    expect(container.querySelectorAll('svg')).toHaveLength(0)
  })

  it('las figuras nunca se insertan como marcado', () => {
    // Dentro de una <img> el SVG no ejecuta nada ni choca con los ids de otra
    // figura; insertado en el DOM perdería las dos cosas.
    const { container } = renderEngine(engineQuestion())
    expect(container.innerHTML).not.toContain('<circle')
    expect(container.querySelectorAll('img')).toHaveLength(7)
  })

  it('enseña el enunciado', () => {
    renderEngine(engineQuestion())
    expect(screen.getByText('¿Qué figura continúa la serie?')).toBeTruthy()
  })

  it('con el enunciado en la cabecera, oculta el texto pero no el tablero', () => {
    // El tablero es la figura, no el texto: sin él no hay pregunta.
    renderEngine(engineQuestion(), { hidePrompt: true })
    expect(screen.queryByText('¿Qué figura continúa la serie?')).toBeNull()
    expect(screen.getByRole('img', { name: 'Casilla que falta' })).toBeTruthy()
  })

  it('sin tablero —buscar la que sobra— sólo hay enunciado y opciones', () => {
    renderEngine(engineQuestion({ board: { cellSize: 100, rows: [] } }))
    expect(screen.queryByRole('img', { name: 'Casilla que falta' })).toBeNull()
    expect(screen.getAllByRole('img', { name: /^Figura [A-E]$/ })).toHaveLength(5)
  })

  it('al corregir enseña la explicación de la elegida y la de la buena, y ninguna más', () => {
    renderEngine(engineQuestion(), { revealed: true, selectedOptionId: 'A' })
    expect(screen.getByText('Explicación A')).toBeTruthy()
    expect(screen.getByText('Explicación C')).toBeTruthy()
    expect(screen.queryByText('Explicación B')).toBeNull()
  })

  it('las tarjetas de figura no llevan margen vertical que descuadre la última', () => {
    // Con `space-y-*` en el contenedor, cada tarjeta menos la última recibía
    // margen inferior y, al estirarse la fila, la última salía más alta.
    renderEngine(engineQuestion())
    const contenedor = screen.getByRole('img', { name: 'Figura A' }).closest('button')!.parentElement!
    expect(contenedor.className).not.toMatch(/space-y-[1-9]/)
  })

  it('en inglés, el enunciado y los textos alternativos salen en inglés', () => {
    useLocaleStore.setState({ locale: 'en' })
    useTestLocaleStore.setState({ locale: 'en' })
    renderEngine(engineQuestion())
    expect(screen.getByText('Which figure continues the series?')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Figure A' })).toBeTruthy()
  })
})
