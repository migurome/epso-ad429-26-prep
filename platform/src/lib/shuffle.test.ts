// `shuffle` elige las preguntas de cada simulacro. Un fallo aquí no se ve: el
// test se hace igual, pero con preguntas repetidas, con menos de las pedidas o
// siempre con las mismas. Las tres cosas invalidan el simulacro sin romper nada
// visible, así que se comprueban como invariantes y no de vista.
import { describe, it, expect } from 'vitest'
import { shuffle, shuffleWithSeed } from './shuffle'
import { formatClock } from './time'

const ITEMS = Array.from({ length: 12 }, (_, i) => i)

describe('shuffle', () => {
  it('devuelve una permutación: mismos elementos, misma cantidad', () => {
    for (let run = 0; run < 200; run += 1) {
      const out = shuffle(ITEMS)
      expect(out).toHaveLength(ITEMS.length)
      expect([...out].sort((a, b) => a - b)).toEqual(ITEMS)
    }
  })

  it('no modifica el array original', () => {
    const original = [...ITEMS]
    shuffle(ITEMS)
    expect(ITEMS).toEqual(original)
  })

  it('devuelve un array nuevo', () => {
    expect(shuffle(ITEMS)).not.toBe(ITEMS)
  })

  it('soporta los casos degenerados', () => {
    expect(shuffle([])).toEqual([])
    expect(shuffle(['x'])).toEqual(['x'])
  })

  it('todo elemento puede acabar en cualquier posición', () => {
    const seen = ITEMS.map(() => new Set<number>())
    for (let run = 0; run < 2000; run += 1) {
      shuffle(ITEMS).forEach((value, position) => seen[value].add(position))
    }
    for (const positions of seen) {
      expect(positions.size).toBe(ITEMS.length)
    }
  })

  // El error clásico al escribir Fisher–Yates es sortear j sobre TODO el array
  // en vez de sobre 0..i. El resultado sigue siendo una permutación y sigue
  // alcanzando todas las posiciones, así que las comprobaciones anteriores lo
  // dejan pasar: lo único que delata ese fallo es que unas permutaciones salen
  // mucho más a menudo que otras.
  //
  // Medido sobre esta implementación, la razón entre la permutación más y la
  // menos frecuente es ~1,03; con el sorteo mal hecho sube a ~5,0. El umbral de
  // 1,5 separa las dos con holgura por los dos lados: ni parpadea por ruido
  // estadístico ni deja pasar el sesgo.
  it('reparte las permutaciones de forma uniforme', () => {
    const items = [0, 1, 2, 3]
    const runs = 60_000
    const counts = new Map<string, number>()
    for (let run = 0; run < runs; run += 1) {
      const key = shuffle(items).join('')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    // 4! = 24 permutaciones, y ninguna debe faltar.
    expect(counts.size).toBe(24)
    const frequencies = [...counts.values()]
    const ratio = Math.max(...frequencies) / Math.min(...frequencies)
    expect(ratio, `permutación más frecuente / menos frecuente = ${ratio.toFixed(2)}`).toBeLessThan(
      1.5,
    )
  })
})

describe('shuffleWithSeed', () => {
  // El banco de práctica baraja al empezar una vuelta nueva y ese orden tiene
  // que sobrevivir a recargar la página. Con Math.random no puede: hace falta
  // que la misma semilla dé siempre el mismo orden.
  it('la misma semilla da siempre el mismo orden', () => {
    expect(shuffleWithSeed(ITEMS, 42)).toEqual(shuffleWithSeed(ITEMS, 42))
  })

  it('semillas distintas dan órdenes distintos', () => {
    // Con doce elementos, dos semillas que coincidieran serían un fallo del
    // generador, no mala suerte.
    const seen = new Set(
      Array.from({ length: 30 }, (_, i) => shuffleWithSeed(ITEMS, i + 1).join(',')),
    )
    expect(seen.size).toBeGreaterThan(25)
  })

  it('la semilla cero deja el orden del documento', () => {
    expect(shuffleWithSeed(ITEMS, 0)).toEqual(ITEMS)
  })

  it('sigue siendo una permutación, no una selección', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const out = shuffleWithSeed(ITEMS, seed)
      expect([...out].sort((a, b) => a - b)).toEqual(ITEMS)
    }
  })

  it('no modifica el array original', () => {
    const original = [...ITEMS]
    shuffleWithSeed(ITEMS, 7)
    expect(ITEMS).toEqual(original)
  })

  it('reparte cada elemento por todas las posiciones', () => {
    // Un generador con poca entropía puede dar «órdenes distintos» que en
    // realidad dejan casi todo en su sitio. Aquí se mira la distribución.
    const counts = ITEMS.map(() => new Array(ITEMS.length).fill(0))
    for (let seed = 1; seed <= 2000; seed += 1) {
      shuffleWithSeed(ITEMS, seed).forEach((value, position) => {
        counts[value][position] += 1
      })
    }
    const flat = counts.flat()
    expect(Math.max(...flat) / Math.min(...flat)).toBeLessThan(1.5)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [60, '1:00'],
    [90, '1:30'],
    [599, '9:59'],
    [2400, '40:00'],
    [3600, '60:00'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected)
  })

  it('nunca muestra tiempo negativo', () => {
    // El cronómetro puede pasarse de cero entre dos ticks; enseñar «-1:59»
    // en un examen sería alarmante y falso.
    expect(formatClock(-30)).toBe('0:00')
  })

  it('redondea los segundos fraccionarios', () => {
    expect(formatClock(59.6)).toBe('1:00')
  })
})
