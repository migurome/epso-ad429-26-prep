// La práctica a pantalla completa es la vista del razonamiento abstracto: una
// pregunta grande por vez en lugar del acordeón, porque las figuras necesitan
// tamaño. No tenía ni un test — se montaba en `/razonamiento/abstract` y
// cualquier rotura ahí (navegación fuera de rango, filtro que deja el índice
// apuntando a una pregunta que ya no está) dejaba la página en blanco sin que
// nada lo notara.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FullscreenPractice } from './FullscreenPractice'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { DICT } from '../lib/dictionary'
import type { Question } from '../types/content'

const es = (key: keyof typeof DICT) => DICT[key].es
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const clickButton = (name: string | RegExp) => fireEvent.click(button(name))

function question(id: string, tags?: string[]): Question {
  return {
    id,
    phase: 'reasoning',
    skill: 'abstract',
    prompt: { es: `Enunciado de ${id}`, en: `Prompt for ${id}` },
    options: ['A', 'B'].map((letter) => ({
      id: letter,
      text: { es: `Opción ${letter} de ${id}`, en: `Option ${letter} of ${id}` },
      isCorrect: letter === 'A',
      explanation: letter === 'A' ? { es: 'Explicación', en: 'Explanation' } : undefined,
    })),
    ...(tags ? { tags } : {}),
  }
}

const counter = (x: number, y: number) =>
  es('question_x_of_y').replace('{x}', String(x)).replace('{y}', String(y))

const THREE = [question('p1'), question('p2'), question('p3')]
const MIXED = [
  question('real1', ['real']),
  question('real2', ['real']),
  question('bonus1', ['ai-generated']),
]

beforeEach(() => useTestLocaleStore.setState({ locale: 'es' }))
afterEach(cleanup)

describe('una pregunta por vez', () => {
  it('enseña la primera y dice por dónde va', () => {
    render(<FullscreenPractice questions={THREE} />)
    expect(screen.getByText(counter(1, 3))).toBeTruthy()
    expect(screen.getByText(/Enunciado de p1/)).toBeTruthy()
    expect(screen.queryByText(/Enunciado de p2/)).toBeNull()
  })

  it('avanzar cambia de pregunta y actualiza el contador', () => {
    render(<FullscreenPractice questions={THREE} />)
    clickButton(new RegExp(es('next')))
    expect(screen.getByText(counter(2, 3))).toBeTruthy()
    expect(screen.getByText(/Enunciado de p2/)).toBeTruthy()
  })

  it('retroceder vuelve a la anterior', () => {
    render(<FullscreenPractice questions={THREE} />)
    clickButton(new RegExp(es('next')))
    clickButton(new RegExp(es('previous')))
    expect(screen.getByText(counter(1, 3))).toBeTruthy()
    expect(screen.getByText(/Enunciado de p1/)).toBeTruthy()
  })

  it('en la primera no se puede retroceder', () => {
    render(<FullscreenPractice questions={THREE} />)
    expect((button(new RegExp(es('previous'))) as HTMLButtonElement).disabled).toBe(true)
  })

  it('en la última no se puede avanzar', () => {
    render(<FullscreenPractice questions={THREE} />)
    clickButton(new RegExp(es('next')))
    clickButton(new RegExp(es('next')))
    expect(screen.getByText(counter(3, 3))).toBeTruthy()
    expect((button(new RegExp(es('next'))) as HTMLButtonElement).disabled).toBe(true)
  })

  it('con una sola pregunta los dos botones están cerrados', () => {
    render(<FullscreenPractice questions={[question('sola')]} />)
    expect((button(new RegExp(es('previous'))) as HTMLButtonElement).disabled).toBe(true)
    expect((button(new RegExp(es('next'))) as HTMLButtonElement).disabled).toBe(true)
  })

  it('sin preguntas no pinta nada, en vez de un marco vacío', () => {
    const { container } = render(<FullscreenPractice questions={[]} />)
    expect(container.textContent).toBe('')
  })
})

describe('responder', () => {
  it('marcar una opción enseña la corrección', () => {
    render(<FullscreenPractice questions={THREE} />)
    fireEvent.click(screen.getByText(/Opción A de p1/))
    expect(screen.getByText('Explicación')).toBeTruthy()
  })

  it('lo respondido sigue marcado al volver a la pregunta', () => {
    // Navegar adelante y atrás no debe borrar el trabajo: es el gesto normal
    // para comparar dos figuras parecidas.
    render(<FullscreenPractice questions={THREE} />)
    fireEvent.click(screen.getByText(/Opción A de p1/))
    clickButton(new RegExp(es('next')))
    expect(screen.queryByText('Explicación')).toBeNull()
    clickButton(new RegExp(es('previous')))
    expect(screen.getByText('Explicación')).toBeTruthy()
  })

  it('cada pregunta guarda su propia respuesta', () => {
    render(<FullscreenPractice questions={THREE} />)
    fireEvent.click(screen.getByText(/Opción B de p1/))
    clickButton(new RegExp(es('next')))
    fireEvent.click(screen.getByText(/Opción A de p2/))
    clickButton(new RegExp(es('previous')))
    // La de p1 era la incorrecta; si se hubieran mezclado, aquí se vería la
    // corrección de la buena.
    expect(screen.getByText(/Opción B de p1/).closest('button')).toBeTruthy()
    expect(screen.getByText('Explicación')).toBeTruthy()
  })
})

describe('filtro de procedencia', () => {
  it('sin mezcla no se ofrece el filtro', () => {
    // Un filtro con una sola opción posible es ruido: ocupa sitio y no decide
    // nada.
    render(<FullscreenPractice questions={THREE} />)
    expect(screen.queryByRole('button', { name: es('filter_real_bank') })).toBeNull()
  })

  it('con banco real y bonus arranca en el real', () => {
    // Mezclarlos sin decirlo daría una idea falsa de cuánto material oficial
    // se ha trabajado.
    render(<FullscreenPractice questions={MIXED} />)
    expect(screen.getByRole('button', { name: es('filter_real_bank') })).toBeTruthy()
    expect(screen.getByText(counter(1, 2))).toBeTruthy()
    expect(screen.getByText(/Enunciado de real1/)).toBeTruthy()
  })

  it('el bonus enseña sólo las generadas', () => {
    render(<FullscreenPractice questions={MIXED} />)
    clickButton(es('filter_ai_bank'))
    expect(screen.getByText(counter(1, 1))).toBeTruthy()
    expect(screen.getByText(/Enunciado de bonus1/)).toBeTruthy()
  })

  it('«Todo» enseña las tres', () => {
    render(<FullscreenPractice questions={MIXED} />)
    clickButton(es('filter_all'))
    expect(screen.getByText(counter(1, 3))).toBeTruthy()
  })

  it('cambiar de filtro vuelve a la primera pregunta', () => {
    // Sin reiniciar, el índice apuntaría a una posición del banco anterior y
    // el candidato aterrizaría en mitad del nuevo sin saber por qué.
    render(<FullscreenPractice questions={MIXED} />)
    clickButton(new RegExp(es('next')))
    expect(screen.getByText(counter(2, 2))).toBeTruthy()
    clickButton(es('filter_all'))
    expect(screen.getByText(counter(1, 3))).toBeTruthy()
  })

  it('una pregunta sin etiquetas cuenta como sin procedencia y sólo sale en «Todo»', () => {
    render(<FullscreenPractice questions={[...MIXED, question('suelta')]} />)
    expect(screen.getByText(counter(1, 2))).toBeTruthy()
    clickButton(es('filter_all'))
    expect(screen.getByText(counter(1, 4))).toBeTruthy()
  })
})

describe('el índice nunca apunta fuera de la lista', () => {
  it('si el banco se encoge, se queda en la última que hay', () => {
    // El índice vive en el componente y las preguntas llegan por props: si la
    // lista cambia bajo los pies, sin recortar el índice se leería `undefined`
    // y la vista quedaría en blanco.
    const { rerender } = render(<FullscreenPractice questions={THREE} />)
    clickButton(new RegExp(es('next')))
    clickButton(new RegExp(es('next')))
    expect(screen.getByText(counter(3, 3))).toBeTruthy()

    rerender(<FullscreenPractice questions={[question('p1')]} />)
    expect(screen.getByText(counter(1, 1))).toBeTruthy()
    expect(screen.getByText(/Enunciado de p1/)).toBeTruthy()
  })
})

describe('idioma del contenido', () => {
  it('el selector de idioma de las preguntas está disponible', () => {
    render(<FullscreenPractice questions={THREE} />)
    // En minúscula a propósito: el botón lleva el texto 'en' y las mayúsculas
    // las pone CSS (`uppercase`), que jsdom no aplica.
    expect(screen.getByRole('button', { name: 'en' })).toBeTruthy()
  })

  it('en inglés el enunciado sale en inglés', () => {
    useTestLocaleStore.setState({ locale: 'en' })
    render(<FullscreenPractice questions={THREE} />)
    expect(screen.getByText(/Prompt for p1/)).toBeTruthy()
  })
})
