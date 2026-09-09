// La redacción EUFTE es la otra vía por la que se escribe el historial, y la
// única donde se pierde trabajo del usuario si algo falla: el texto sólo existe
// en el navegador hasta que se pulsa guardar.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EssayRunner } from './EssayRunner'
import { useProgressStore } from '../lib/progressStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { DICT } from '../lib/dictionary'
import type { EssayPrompt } from '../types/content'

const PROMPT: EssayPrompt = {
  id: 'eufte-1',
  title: { es: 'Tema de prueba', en: 'Test prompt' },
  briefMd: { es: 'Redacta sobre la política de cohesión.', en: 'Write about cohesion policy.' },
  recommendedMinutes: 40,
}

const es = (key: keyof typeof DICT) => DICT[key].es
const clickButton = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))

/** El rótulo lleva paréntesis —«Empezar (40 min)»— así que se busca por
 * nombre exacto y no por expresión regular, donde los paréntesis serían un
 * grupo y no coincidirían con nada. */
const startLabel = (minutes: number) => es('start_minutes').replace('{n}', String(minutes))

function start() {
  clickButton(startLabel(40))
}

function write(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } })
}

beforeEach(() => {
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
  useTestLocaleStore.setState({ locale: 'es' })
})

afterEach(cleanup)

describe('recorrido de la redacción', () => {
  it('muestra el enunciado antes de empezar', () => {
    render(<EssayRunner prompt={PROMPT} />)
    expect(screen.getByText(/política de cohesión/)).toBeTruthy()
  })

  it('respeta el idioma elegido para el contenido del examen', () => {
    useTestLocaleStore.setState({ locale: 'en' })
    render(<EssayRunner prompt={PROMPT} />)
    expect(screen.getByText(/cohesion policy/)).toBeTruthy()
    expect(screen.queryByText(/política de cohesión/)).toBeNull()
  })

  it('abre el editor al empezar', () => {
    render(<EssayRunner prompt={PROMPT} />)
    start()
    expect(screen.getByRole('textbox')).toBeTruthy()
  })
})

describe('recuento de palabras', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['una', 1],
    ['una dos tres', 3],
    ['  espacios   de   sobra  ', 3],
    ['salto\nde\nlínea', 3],
  ])('«%s» son %i palabras', (text, expected) => {
    render(<EssayRunner prompt={PROMPT} />)
    start()
    write(text)
    expect(screen.getByText(es('n_words').replace('{n}', String(expected)))).toBeTruthy()
  })
})

describe('guardado', () => {
  it('registra el intento con el texto, el tema y las notas', () => {
    render(<EssayRunner prompt={PROMPT} />)
    start()
    write('Una redacción de prueba con seis palabras')
    clickButton(es('finish'))

    const notes = screen.getAllByRole('textbox').at(-1)!
    fireEvent.change(notes, { target: { value: 'Me faltó estructura' } })
    clickButton(es('save_attempt'))

    const [attempt] = useProgressStore.getState().essayAttempts
    expect(attempt.promptId).toBe('eufte-1')
    expect(attempt.text).toBe('Una redacción de prueba con seis palabras')
    expect(attempt.selfReviewNotes).toBe('Me faltó estructura')
    expect(attempt.finishedAt).toBeTruthy()
  })

  it('no guarda una cadena vacía como notas', () => {
    render(<EssayRunner prompt={PROMPT} />)
    start()
    write('texto')
    clickButton(es('finish'))
    clickButton(es('save_attempt'))

    // `undefined` y no `''`: el historial distingue «no anotó nada» de «anotó
    // algo vacío», y una cadena vacía pintaría una sección de notas en blanco.
    expect(useProgressStore.getState().essayAttempts[0].selfReviewNotes).toBeUndefined()
  })

  it('no guarda nada hasta que se pulsa guardar', () => {
    render(<EssayRunner prompt={PROMPT} />)
    start()
    write('texto que todavía no se ha guardado')
    clickButton(es('finish'))
    expect(useProgressStore.getState().essayAttempts).toHaveLength(0)
  })
})

describe('cronómetro', () => {
  it('al agotarse el tiempo cierra la redacción y conserva el texto', async () => {
    vi.useFakeTimers()
    try {
      render(<EssayRunner prompt={{ ...PROMPT, recommendedMinutes: 1 }} />)
      await act(async () => {
        screen.getByRole('button', { name: startLabel(1) }).click()
      })
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'texto en curso' } })

      await act(async () => {
        vi.advanceTimersByTime(61_000)
      })

      // Ya no se puede seguir escribiendo, pero lo escrito sigue ahí para
      // revisarlo y guardarlo: perder el texto al sonar el cronómetro sería
      // el peor fallo posible de esta pantalla.
      expect(screen.getByText(/texto en curso/)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})
