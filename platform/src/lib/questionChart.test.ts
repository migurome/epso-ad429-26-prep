// El gráfico de una pregunta numérica, leído del propio enunciado.
//
// Lo que más importa de aquí es lo que NO hace: ante cualquier duda devuelve
// null y la pregunta se queda con su tabla, que es lo que había antes y sigue
// siendo correcto. Un gráfico inventado a medias en una pregunta de examen es
// peor que no tener gráfico.
import { describe, it, expect } from 'vitest'
import { cellValue, niceScale, parsePromptChart, peakOf } from './questionChart'

const TABLA = [
  '<!-- chart: bar x="Año" unit="toneladas" -->',
  '',
  '| Año | Bacalao | Merluza |',
  '| --- | --- | --- |',
  '| 2008 | ~500 | ~1,250 |',
  '| 2009 | ~750 | ~1,000 |',
  '',
  '*¿Cuánto varió la pesca?*',
].join('\n')

describe('los números de una celda', () => {
  it('lee las formas en que están escritos en el documento', () => {
    expect(cellValue('~500')).toBe(500)
    expect(cellValue('≈ 32')).toBe(32)
    expect(cellValue('1,250')).toBe(1250)
    expect(cellValue('60%')).toBe(60)
    expect(cellValue('-3')).toBe(-3)
  })

  it('una celda sin dato es un hueco, nunca un cero', () => {
    // Un cero dibujado donde no hay dato es una barra que miente, y en una
    // pregunta de examen esa barra se lee y se contesta.
    expect(cellValue('')).toBeNull()
    expect(cellValue('—')).toBeNull()
    expect(cellValue('n/d')).toBeNull()
  })
})

describe('leer la directiva y su tabla', () => {
  it('saca el tipo, los rótulos, los puntos y las series', () => {
    const leido = parsePromptChart(TABLA)
    expect(leido).not.toBeNull()
    expect(leido!.spec.kind).toBe('bar')
    expect(leido!.spec.category).toBe('Año')
    expect(leido!.spec.unit).toBe('toneladas')
    expect(leido!.spec.points).toEqual(['2008', '2009'])
    expect(leido!.spec.series).toEqual([
      { label: 'Bacalao', values: [500, 750] },
      { label: 'Merluza', values: [1250, 1000] },
    ])
  })

  it('marca que los valores son lecturas de la cuadrícula', () => {
    // El libro no imprime las cifras en esos gráficos: se leen a ojo. Decirlo
    // evita que alguien piense que la web le está dando el dato exacto.
    expect(parsePromptChart(TABLA)!.spec.approx).toBe(true)
  })

  it('parte el enunciado por donde va el gráfico', () => {
    const conTexto = 'La pesca en Zogland:\n\n' + TABLA
    const leido = parsePromptChart(conTexto)!
    expect(leido.before).toBe('La pesca en Zogland:\n\n')
    expect(leido.after).toContain('| Año | Bacalao')
    // La tabla se queda en `after`: el gráfico va encima, no en su lugar.
    expect(leido.after).toContain('2008')
  })

  it('sin directiva no hay gráfico', () => {
    expect(parsePromptChart('| Año | Bacalao |\n| --- | --- |\n| 2008 | 500 |')).toBeNull()
  })

  it('un tipo que no se sabe dibujar se deja estar', () => {
    expect(parsePromptChart(TABLA.replace('chart: bar', 'chart: sankey'))).toBeNull()
  })

  it('una directiva sin tabla debajo no dibuja nada', () => {
    expect(parsePromptChart('<!-- chart: bar -->\n\nTexto suelto, sin tabla.')).toBeNull()
  })

  it('una tabla sin un solo número no dibuja nada', () => {
    const vacia = TABLA.replace('~500', 'n/d').replace('~1,250', 'n/d')
      .replace('~750', 'n/d').replace('~1,000', 'n/d')
    expect(parsePromptChart(vacia)).toBeNull()
  })

  it('sin x= toma la primera columna como eje', () => {
    const leido = parsePromptChart(TABLA.replace(' x="Año" unit="toneladas"', ''))!
    expect(leido.spec.category).toBe('Año')
    expect(leido.spec.unit).toBeUndefined()
  })
})

describe('la escala del eje', () => {
  it('empieza en cero y acaba en un número redondo', () => {
    // Un eje recortado exagera las diferencias, y las diferencias son justo lo
    // que se pregunta: media barra contra una entera tiene que ser la mitad.
    const escala = niceScale(1750)
    expect(escala.ticks[0]).toBe(0)
    expect(escala.max).toBeGreaterThanOrEqual(1750)
    expect(escala.max % escala.step).toBe(0)
  })

  it('las líneas caen en números que se pueden leer', () => {
    expect(niceScale(42).ticks).toEqual([0, 10, 20, 30, 40, 50])
    expect(niceScale(2000).ticks).toEqual([0, 500, 1000, 1500, 2000])
  })

  it('no arrastra decimales de la suma repetida', () => {
    // Acumulando 2,5 diez veces sale 24,999999999999996 y una etiqueta con
    // catorce decimales en medio del examen.
    for (const t of niceScale(23).ticks) expect(Number.isInteger(t * 10)).toBe(true)
  })

  it('un gráfico sin valores no revienta la escala', () => {
    expect(niceScale(0).ticks.length).toBeGreaterThan(1)
  })

  it('en las apiladas el tope es la suma de la columna, no la barra más alta', () => {
    const apilada = parsePromptChart(TABLA.replace('chart: bar', 'chart: stacked'))!
    // 500 + 1250 = 1750 en 2008; la barra más alta suelta es 1250.
    expect(peakOf(apilada.spec)).toBe(1750)
  })

  it('en las sueltas el tope es el mayor valor', () => {
    expect(peakOf(parsePromptChart(TABLA)!.spec)).toBe(1250)
  })
})

describe('los números según el idioma del enunciado', () => {
  it('seis mil trescientos se escribe distinto en cada documento', () => {
    // Con una sola regla, uno de los dos vale 6,3: una barra mil veces más
    // baja, en una pregunta cuya respuesta es precisamente ese número.
    expect(cellValue('6.300', 'es')).toBe(6300)
    expect(cellValue('6,300', 'en')).toBe(6300)
  })

  it('y los decimales también', () => {
    expect(cellValue('2,5', 'es')).toBe(2.5)
    expect(cellValue('2.5', 'en')).toBe(2.5)
  })

  it('la tabla entera se lee con el idioma que se le pase', () => {
    const esDoc = [
      '<!-- chart: bar -->',
      '',
      '| País | Candidatos |',
      '| --- | --- |',
      '| Denitz | ≈ 6.300 |',
      '| Crovaka | ≈ 7.900 |',
    ].join('\n')
    expect(parsePromptChart(esDoc, 'es')!.spec.series[0].values).toEqual([6300, 7900])
  })
})
