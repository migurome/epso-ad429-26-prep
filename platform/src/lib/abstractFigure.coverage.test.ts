import { describe, it, expect } from 'vitest'
import { extractPromptFigures, panelSignature, panelsDrawable, parsePanel } from './abstractFigure'
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

  // La queja concreta del alumno: una secuencia con unos paneles dibujados y
  // otros en un párrafo no se puede comparar, y el panel que se queda en texto
  // suele ser justo el que lleva la diferencia. Con el criterio todo-o-nada de
  // `panelsDrawable`, ninguna pregunta del banco puede acabar así.
  it.each(['en', 'es'] as Locale[])('never mixes drawn and prose panels in one question (%s)', (locale) => {
    const mixed: string[] = []
    for (const q of abstractQuestions) {
      const options = q.options.map((o) => parsePanel(pick(locale, o.text)))
      const figures = extractPromptFigures(pick(locale, q.prompt))
      const seen = new Map<string, string>()
      let collision = false
      options.forEach((panel, i) => {
        if (panel.shapes.length === 0) return
        const key = panelSignature(panel)
        const previous = seen.get(key)
        if (previous !== undefined && previous !== pick(locale, q.options[i].text)) collision = true
        seen.set(key, pick(locale, q.options[i].text))
      })
      const draws =
        panelsDrawable(options) && !collision && (figures === null || panelsDrawable(figures.panels))
      if (!draws) return
      const panels = [...options, ...(figures?.panels ?? [])]
      const drawn = panels.filter((p) => p.shapes.length > 0).length
      const prose = panels.filter((p) => p.shapes.length === 0 && !p.isBlank).length
      if (drawn > 0 && prose > 0) mixed.push(q.id)
    }
    expect(mixed).toEqual([])
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
