// La procedencia decide qué ve el candidato por defecto y cómo filtra: banco
// real, bonus redactado por IA y figuras generadas por el motor. Mezclarlas sin
// decirlo le daría una idea falsa de cuánto material oficial ha trabajado.
import { describe, it, expect } from 'vitest'
import { SOURCE_LABEL_KEY, SOURCE_ORDER, defaultSource, sourceOf, sourcesIn } from './questionSource'
import { DICT } from './dictionary'
import type { Question } from '../types/content'

const q = (id: string, tags?: string[]): Question => ({
  id,
  phase: 'reasoning',
  skill: 'abstract',
  prompt: { es: id, en: id },
  options: [],
  ...(tags ? { tags } : {}),
})

describe('de qué banco viene una pregunta', () => {
  it.each([
    [['real'], 'real'],
    [['ai-generated'], 'ai-generated'],
    [['engine', 'series'], 'engine'],
  ] as const)('%j es %s', (tags, source) => {
    expect(sourceOf([...tags])).toBe(source)
  })

  it('sin etiquetas no tiene procedencia', () => {
    expect(sourceOf(undefined)).toBeNull()
    expect(sourceOf([])).toBeNull()
  })

  it('las etiquetas que no son de procedencia no cuentan', () => {
    // Las del motor llevan también su familia; las del curso, su módulo.
    expect(sourceOf(['series', 'grid3x3'])).toBeNull()
  })
})

describe('qué procedencias hay en un banco', () => {
  it('las lista en el orden de oferta, sin repetir', () => {
    const banco = [q('e1', ['engine']), q('r1', ['real']), q('e2', ['engine']), q('a1', ['ai-generated'])]
    expect(sourcesIn(banco)).toEqual(['real', 'ai-generated', 'engine'])
  })

  it('ignora las preguntas sin procedencia', () => {
    expect(sourcesIn([q('x'), q('r1', ['real'])])).toEqual(['real'])
  })

  it('un banco vacío no tiene ninguna', () => {
    expect(sourcesIn([])).toEqual([])
  })
})

describe('dónde arranca el filtro', () => {
  it('con una sola procedencia, en todo: no hay nada que filtrar', () => {
    // Aunque esa única procedencia sea la real: filtrar por ella no quita nada.
    expect(defaultSource(['real'])).toBe('all')
    expect(defaultSource(['engine'])).toBe('all')
    expect(defaultSource([])).toBe('all')
  })

  it('con el banco real presente, en el real: es lo que se examina', () => {
    expect(defaultSource(['real', 'engine'])).toBe('real')
    expect(defaultSource(['real', 'ai-generated', 'engine'])).toBe('real')
  })

  it('sin banco real, en todo, aunque haya dos procedencias', () => {
    // Arrancar en «bonus» o en «generadas» escondería la mitad del banco sin
    // que haya un motivo para preferir una a la otra.
    expect(defaultSource(['ai-generated', 'engine'])).toBe('all')
  })
})

describe('las etiquetas del filtro', () => {
  it('cada procedencia tiene su texto, en los dos idiomas', () => {
    for (const source of SOURCE_ORDER) {
      const label = DICT[SOURCE_LABEL_KEY[source]]
      expect(label.es.trim()).not.toBe('')
      expect(label.en.trim()).not.toBe('')
    }
  })

  it('ninguna procedencia comparte texto con otra', () => {
    // «Bonus (generado)» y «Generadas» en el mismo filtro no se distinguen:
    // por eso el bonus pasó a llamarse «Bonus (IA)».
    for (const locale of ['es', 'en'] as const) {
      const labels = SOURCE_ORDER.map((source) => DICT[SOURCE_LABEL_KEY[source]][locale])
      expect(new Set(labels).size).toBe(labels.length)
    }
  })
})
