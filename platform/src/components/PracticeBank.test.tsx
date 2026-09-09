// El banco de práctica es donde se estudia sin cronómetro. Lo que importa aquí
// es el filtro de procedencia: el banco real son preguntas de examen y el bonus
// son generadas, y mezclarlas sin decirlo daría al candidato una idea falsa de
// cuánto material oficial ha trabajado.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PracticeBank } from './PracticeBank'
import { usePracticeStore } from '../lib/practiceStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { DICT } from '../lib/dictionary'
import type { Question } from '../types/content'

const es = (key: keyof typeof DICT) => DICT[key].es
const clickButton = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))

function question(id: string, tags?: string[]): Question {
  return {
    id,
    phase: 'field-mcq',
    field: 'cybersecurity',
    prompt: { es: `Enunciado de ${id}`, en: `Prompt for ${id}` },
    options: ['A', 'B'].map((letter) => ({
      id: letter,
      text: { es: `Opción ${letter}`, en: `Option ${letter}` },
      isCorrect: letter === 'A',
      explanation: letter === 'A' ? { es: 'Porque sí', en: 'Because' } : undefined,
    })),
    ...(tags ? { tags } : {}),
  }
}

const MIXED = [
  question('real1', ['real']),
  question('real2', ['real']),
  question('bonus1', ['ai-generated']),
]

const count = (n: number) => es('n_questions').replace('{n}', String(n))

beforeEach(() => {
  useTestLocaleStore.setState({ locale: 'es' })
  usePracticeStore.setState({ answers: {}, orderSeed: {} })
})

afterEach(cleanup)

describe('filtro de procedencia', () => {
  it('con banco real y bonus, ofrece el filtro y arranca en el real', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    expect(screen.getByRole('button', { name: es('filter_real_bank') })).toBeTruthy()
    expect(screen.getByText(count(2))).toBeTruthy()
  })

  it('cambiar a bonus muestra sólo las generadas', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(es('filter_ai_bank'))
    expect(screen.getByText(count(1))).toBeTruthy()
    expect(screen.getByText(/Enunciado de bonus1/)).toBeTruthy()
    expect(screen.queryByText(/Enunciado de real1/)).toBeNull()
  })

  it('«todo» las muestra juntas', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(es('filter_all'))
    expect(screen.getByText(count(3))).toBeTruthy()
  })

  it('sin mezcla de procedencias no aparece el filtro', () => {
    // Un banco donde todo es generado no tiene nada que filtrar; enseñar un
    // selector con una sola opción útil sería ruido.
    render(<PracticeBank questions={[question('a', ['ai-generated']), question('b', ['ai-generated'])]} bankId="test" />)
    expect(screen.queryByRole('button', { name: es('filter_real_bank') })).toBeNull()
    expect(screen.getByText(count(2))).toBeTruthy()
  })

  it('las preguntas sin etiqueta de procedencia se muestran igualmente', () => {
    render(<PracticeBank questions={[question('a'), question('b')]} bankId="test" />)
    expect(screen.getByText(count(2))).toBeTruthy()
  })
})

describe('acordeón', () => {
  it('las preguntas empiezan cerradas', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    expect(screen.queryByText('Opción A')).toBeNull()
  })

  it('al abrir una pregunta se ven sus opciones', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    expect(screen.getByText('Opción A')).toBeTruthy()
  })

  it('abrir otra cierra la anterior, para no perder el sitio', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Enunciado de real2/)
    // Sólo un juego de opciones visible a la vez.
    expect(screen.getAllByText('Opción A')).toHaveLength(1)
  })

  it('volver a pulsar la cierra', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Enunciado de real1/)
    expect(screen.queryByText('Opción A')).toBeNull()
  })
})

describe('corrección', () => {
  it('responder revela la explicación', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    expect(screen.getByText(/Porque sí/)).toBeTruthy()
  })

  it('la respuesta dada sobrevive a cerrar y volver a abrir la pregunta', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    clickButton(/Enunciado de real1/)
    clickButton(/Enunciado de real1/)
    // Si se perdiera, el candidato repetiría preguntas ya trabajadas sin saberlo.
    expect(screen.getByText(/Porque sí/)).toBeTruthy()
  })
})

describe('cabecera', () => {
  // Antes la cabecera cortaba el enunciado a 110 caracteres, así que la lista
  // se leía como una colección de frases a medias y había que abrir la
  // pregunta sólo para saber cuál era.
  const TAIL = 'y esta frase final sólo se lee si el enunciado va entero'
  const FILLER =
    'Frase de relleno que existe para pasar holgadamente de los ciento diez caracteres que antes se mostraban. '
  const LONG: Question = {
    ...question('largo'),
    prompt: { es: `${FILLER}${FILLER}${TAIL}.`, en: `${FILLER}${FILLER}${TAIL}.` },
  }

  it('muestra el enunciado entero, sin cortarlo', () => {
    render(<PracticeBank questions={[LONG]} bankId="test" />)
    expect(screen.getByText(new RegExp(TAIL))).toBeTruthy()
  })

  it('al desplegar no repite el enunciado: sólo aparecen las respuestas', () => {
    render(<PracticeBank questions={[LONG]} bankId="test" />)
    clickButton(new RegExp(TAIL))
    expect(screen.getAllByText(new RegExp(TAIL))).toHaveLength(1)
    expect(screen.getByText('Opción A')).toBeTruthy()
  })

  it('en razonamiento abstracto la cabecera lleva la prosa y la figura se queda en la tarjeta', () => {
    // Ahí el enunciado no es texto sino la secuencia; volcarla en la cabecera
    // sería una ristra de símbolos que no identifica nada.
    const abstract: Question = {
      ...question('abs'),
      skill: 'abstract',
      prompt: {
        es: 'La regla está en el relleno.\n\n▲ · ● · ?',
        en: 'The rule is in the fill.\n\n▲ · ● · ?',
      },
    }
    render(<PracticeBank questions={[abstract]} bankId="test" />)
    expect(screen.getByText(/La regla está en el relleno/)).toBeTruthy()
    clickButton(/La regla está en el relleno/)
    // La secuencia sigue estando, dentro de la tarjeta.
    expect(document.body.textContent).toContain('▲')
  })
})

describe('marca de pregunta ya evaluada', () => {
  // Plegada, una pregunta respondida y una sin tocar eran indistinguibles: no
  // había forma de ver qué quedaba por trabajar sin abrirlas una a una.
  it('sin responder no lleva veredicto', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    expect(screen.queryByText(es('answered_correct'))).toBeNull()
    expect(screen.queryByText(es('answered_wrong'))).toBeNull()
  })

  it('acertar la marca como acertada', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    expect(screen.getByText(es('answered_correct'))).toBeTruthy()
  })

  it('fallar la marca como fallada', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción B/)
    expect(screen.getByText(es('answered_wrong'))).toBeTruthy()
  })

  it('la marca sobrevive al plegar, que es cuando hace falta', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    clickButton(/Enunciado de real1/)
    expect(screen.queryByText('Opción A')).toBeNull()
    expect(screen.getByText(es('answered_correct'))).toBeTruthy()
  })

  it('sólo marca la pregunta respondida, no sus vecinas', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    expect(screen.getAllByText(es('answered_correct'))).toHaveLength(1)
  })
})

describe('lo respondido sobrevive a la recarga', () => {
  // El motivo de todo esto: las respuestas vivían en el estado del componente,
  // así que recargar la página devolvía todas las preguntas a «sin tocar» y el
  // candidato no tenía forma de saber cuáles había trabajado ya.
  it('una respuesta dada sigue ahí al volver a montar la página', () => {
    const { unmount } = render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    unmount()

    render(<PracticeBank questions={MIXED} bankId="test" />)
    expect(screen.getByText(es('answered_correct'))).toBeTruthy()
    expect(screen.getByText(es('practice_answered').replace('{done}', '1').replace('{total}', '3'))).toBeTruthy()
  })

  it('cuenta cuántas van respondidas sobre el total del banco', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    clickButton(/Enunciado de real2/)
    clickButton(/Opción B/)
    expect(screen.getByText(es('practice_answered').replace('{done}', '2').replace('{total}', '3'))).toBeTruthy()
  })
})

describe('reactivar', () => {
  const shownOrder = () =>
    Array.from(document.querySelectorAll('[aria-expanded]')).map(
      (el) => (el.textContent ?? '').match(/Enunciado de (\S+)/)?.[1] ?? '?',
    )
  const many = Array.from({ length: 8 }, (_, i) => question(`q${i}`))

  it('sin nada respondido no hay nada que reactivar', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    expect(screen.queryByRole('button', { name: es('practice_reactivate_all') })).toBeNull()
    expect(screen.queryByRole('button', { name: es('practice_reactivate_one') })).toBeNull()
  })

  it('reactivar una pregunta la devuelve a sin responder', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    clickButton(/Enunciado de real1/) // plegar
    clickButton(es('practice_reactivate_one'))
    expect(screen.queryByText(es('answered_correct'))).toBeNull()
    expect(usePracticeStore.getState().answers.real1).toBeUndefined()
  })

  it('reactivar una mientras quedan otras respondidas NO baraja', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    clickButton(/Enunciado de real2/)
    clickButton(/Opción A/)
    fireEvent.click(screen.getAllByRole('button', { name: es('practice_reactivate_one') })[0])
    // Barajar a media vuelta movería de sitio las que aún quedan por hacer.
    expect(usePracticeStore.getState().orderSeed.test ?? 0).toBe(0)
  })

  it('reactivar la última que quedaba baraja el orden', () => {
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    fireEvent.click(screen.getAllByRole('button', { name: es('practice_reactivate_one') })[0])
    expect(usePracticeStore.getState().orderSeed.test).toBeGreaterThan(0)
    expect(screen.getByText(es('practice_reshuffled'))).toBeTruthy()
  })

  it('reactivar todas las borra de golpe y baraja', () => {
    render(<PracticeBank questions={many} bankId="test" />)
    const before = shownOrder()
    clickButton(/Enunciado de q0/)
    clickButton(/Opción A/)
    clickButton(/Enunciado de q1/)
    clickButton(/Opción B/)

    clickButton(es('practice_reactivate_all'))
    expect(Object.keys(usePracticeStore.getState().answers)).toHaveLength(0)
    expect(shownOrder()).not.toEqual(before)
  })

  it('reactivar todas no toca lo respondido en otro banco', () => {
    // Los ids de pregunta son únicos en todo el contenido y comparten un solo
    // mapa: si el borrado no se ciñese a este banco, se llevaría por delante el
    // trabajo hecho en los demás.
    usePracticeStore.setState({ answers: { otroBanco: 'A' }, orderSeed: {} })
    render(<PracticeBank questions={MIXED} bankId="test" />)
    clickButton(/Enunciado de real1/)
    clickButton(/Opción A/)
    clickButton(es('practice_reactivate_all'))
    expect(usePracticeStore.getState().answers.otroBanco).toBe('A')
  })

  it('el orden barajado se mantiene entre montajes', () => {
    // Si se rebarajara en cada montaje, cambiar de pestaña y volver movería
    // todas las preguntas de sitio.
    usePracticeStore.setState({ answers: {}, orderSeed: { test: 12345 } })
    const { unmount } = render(<PracticeBank questions={many} bankId="test" />)
    const first = shownOrder()
    unmount()
    render(<PracticeBank questions={many} bankId="test" />)
    expect(shownOrder()).toEqual(first)
  })

  it('la semilla del banco no reordena los demás', () => {
    usePracticeStore.setState({ answers: {}, orderSeed: { otro: 999 } })
    render(<PracticeBank questions={many} bankId="test" />)
    expect(shownOrder()).toEqual(many.map((q) => q.id))
  })
})

describe('idioma del contenido', () => {
  it('usa el idioma del examen, independiente del de la interfaz', () => {
    useTestLocaleStore.setState({ locale: 'en' })
    render(<PracticeBank questions={MIXED} bankId="test" />)
    expect(screen.getByText(/Prompt for real1/)).toBeTruthy()
    expect(screen.queryByText(/Enunciado de real1/)).toBeNull()
  })
})
