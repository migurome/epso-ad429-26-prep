import { describe, it, expect } from 'vitest'
import { extractPromptFigures, parsePanel } from './abstractFigure'
import { QUESTIONS } from '../data/content.abstract.generated'
import { pick, type Locale } from './localeStore'

// Test de regresión (no exploratorio): si en el futuro se añade contenido de
// razonamiento abstracto con muchos símbolos no cubiertos por abstractFigure.ts,
// este test lo detecta sin necesidad de inspeccionar visualmente la app.
// Se comprueba en ambos idiomas porque la notación de figuras debe
// preservarse intacta en la traducción al español (solo cambia el texto
// explicativo alrededor).
describe('abstract figure parser coverage against real content', () => {
  const abstractQuestions = QUESTIONS.filter((q) => q.skill === 'abstract')

  it('has questions to check', () => {
    expect(abstractQuestions.length).toBeGreaterThan(100)
  })

  it.each(['en', 'es'] as Locale[])('recognises shapes in at least 75%% of options (%s)', (locale) => {
    let withShapes = 0
    let total = 0
    for (const q of abstractQuestions) {
      for (const opt of q.options) {
        total++
        if (parsePanel(pick(locale, opt.text)).shapes.length > 0) withShapes++
      }
    }
    expect(withShapes / total).toBeGreaterThan(0.75)
  })

  it.each(['en', 'es'] as Locale[])('never throws while parsing any real prompt or option (%s)', (locale) => {
    for (const q of abstractQuestions) {
      expect(() => extractPromptFigures(pick(locale, q.prompt))).not.toThrow()
      for (const opt of q.options) {
        expect(() => parsePanel(pick(locale, opt.text))).not.toThrow()
      }
    }
  })

  it('recognises the exact same shapes regardless of language (symbols must survive translation untouched)', () => {
    for (const q of abstractQuestions) {
      for (const opt of q.options) {
        const enPanel = parsePanel(pick('en', opt.text))
        const esPanel = parsePanel(pick('es', opt.text))
        expect(esPanel.shapes).toEqual(enPanel.shapes)
      }
    }
  })
})
