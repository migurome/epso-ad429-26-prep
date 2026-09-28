// El gráfico de una pregunta numérica.
//
// Lo que se vigila, por orden de gravedad:
//
//   1. Que la tabla NO desaparezca. Es la vía accesible y el respaldo de unos
//      colores claros sobre fondo claro; un SVG de barras no lo lee nadie con
//      un lector de pantalla.
//   2. Que no se pinte ningún valor. Leerlo de la cuadrícula es lo que se
//      examina: una cifra sobre la barra regala la respuesta.
//   3. Que un hueco de la tabla no salga como una barra de altura cero, que
//      diría «cero» donde lo que hay es la ausencia de dato.
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PromptWithChart, segmentsOf, slicePath, slicesOf } from './QuestionChart'
import { useTestLocaleStore } from '../lib/testLocaleStore'

const PROMPT = [
  'Pesca en Zogland:',
  '',
  '<!-- chart: bar x="Año" unit="toneladas" -->',
  '',
  '| Año | Bacalao | Merluza |',
  '| --- | --- | --- |',
  // En formato español, que es como están escritos los números del documento
  // español: los miles con punto. Escribirlo con coma aquí hacía que el propio
  // test leyera 1,25 y pidiera una cuadrícula distinta.
  '| 2008 | ~500 | ~1.250 |',
  '| 2009 | ~750 | |',
  '',
  '*¿Cuánto varió?*',
].join('\n')

beforeEach(() => useTestLocaleStore.setState({ locale: 'es' }))
afterEach(cleanup)

describe('un enunciado con gráfico', () => {
  it('dibuja el gráfico y deja la tabla debajo', () => {
    const { container } = render(<PromptWithChart>{PROMPT}</PromptWithChart>)
    expect(container.querySelector('svg')).toBeTruthy()
    // La tabla sigue ahí: es por donde entra un lector de pantalla.
    expect(container.querySelector('table')).toBeTruthy()
    expect(screen.getByText('Pesca en Zogland:')).toBeTruthy()
  })

  it('no escribe ningún valor sobre las barras', () => {
    // Un número encima de la barra convierte la pregunta en leer una etiqueta.
    // Los que sí hay son los de la cuadrícula —el instrumento de medida— y los
    // del eje; se comprueba nombrándolos todos, que es lo que impide que se
    // cuele uno nuevo sin que nadie lo note.
    const { container } = render(<PromptWithChart>{PROMPT}</PromptWithChart>)
    const svg = container.querySelector('svg')!
    const textos = [...svg.querySelectorAll('text')].map((t) => t.textContent)
    // Calculados igual que los pinta el componente: escribirlos a mano ata el
    // test a la configuración regional de quien lo ejecute.
    const cuadricula = [0, 250, 500, 750, 1000, 1250].map((n) => n.toLocaleString('es-ES'))
    // Cada eje dice lo suyo por separado: la unidad arriba, junto a los
    // números que la llevan, y la categoría bajo sus etiquetas.
    const ejes = ['2008', '2009', 'Año', 'toneladas']
    expect(textos.sort()).toEqual([...cuadricula, ...ejes].sort())
  })

  it('nombra las series en la leyenda: el color no es la única pista', () => {
    const { container } = render(<PromptWithChart>{PROMPT}</PromptWithChart>)
    const leyenda = container.querySelector('figcaption')!
    expect(leyenda.textContent).toContain('Bacalao')
    expect(leyenda.textContent).toContain('Merluza')
  })

  it('un hueco de la tabla no se dibuja', () => {
    // 2009 no tiene merluza: tres celdas con número, tres barras.
    const { container } = render(<PromptWithChart>{PROMPT}</PromptWithChart>)
    expect(container.querySelectorAll('svg rect')).toHaveLength(3)
  })

  it('sin directiva es exactamente un Markdown', () => {
    const { container } = render(<PromptWithChart>{'Un enunciado sin gráfico.'}</PromptWithChart>)
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByText('Un enunciado sin gráfico.')).toBeTruthy()
  })
})

describe('los tramos de una línea', () => {
  it('un hueco parte la línea en vez de saltárselo', () => {
    // Unir el punto de antes con el de después dibujaría una pendiente entre
    // dos años que nadie midió, y la pendiente es justo lo que se lee.
    expect(segmentsOf([1, 2, null, 4, 5])).toEqual([
      [
        { g: 0, value: 1 },
        { g: 1, value: 2 },
      ],
      [
        { g: 3, value: 4 },
        { g: 4, value: 5 },
      ],
    ])
  })

  it('un punto suelto no es un tramo: no hay nada que trazar', () => {
    expect(segmentsOf([null, 7, null])).toEqual([])
  })

  it('una serie entera sin huecos es un solo tramo', () => {
    expect(segmentsOf([1, 2, 3])).toHaveLength(1)
  })
})

describe('el reparto de un círculo', () => {
  it('reparte sobre la suma real, no sobre cien', () => {
    // Los grupos sanguíneos de la pregunta 109 suman 101 %. Dividir entre 100
    // dejaría una rendija blanca de 3,6° que parecería un dato.
    const slices = slicesOf(['O', 'A', 'B', 'AB'], [42, 44, 11, 4])
    expect(slices[slices.length - 1].to).toBeCloseTo(360, 6)
    expect(slices[0].from).toBe(0)
  })

  it('los sectores van pegados, sin huecos ni solapes', () => {
    const slices = slicesOf(['a', 'b', 'c'], [1, 2, 3])
    for (let i = 1; i < slices.length; i += 1) {
      expect(slices[i].from).toBeCloseTo(slices[i - 1].to, 9)
    }
  })

  it('un hueco o un cero no se lleva un color', () => {
    const slices = slicesOf(['a', 'b', 'c'], [50, null, 0])
    expect(slices.map((s) => s.label)).toEqual(['a'])
  })

  it('sin nada que repartir no se dibuja un círculo vacío', () => {
    expect(slicesOf(['a'], [null])).toEqual([])
  })
})

describe('el trazado de un sector', () => {
  it('más de media vuelta usa el arco largo, o saldría el complementario', () => {
    const [grande] = slicesOf(['a', 'b'], [60, 40])
    expect(slicePath(grande, 100, 100, 50)).toContain(' 1 1 ')
  })

  it('menos de media vuelta usa el corto', () => {
    const [pequeno] = slicesOf(['a', 'b'], [40, 60])
    expect(slicePath(pequeno, 100, 100, 50)).toContain(' 0 1 ')
  })

  it('un único valor ocupa el círculo entero y se dibuja', () => {
    // Un arco de 360° tiene el mismo principio y final: trazado a la brava no
    // pintaría nada, y la tarta saldría en blanco.
    const [todo] = slicesOf(['a'], [100])
    expect(todo.to).toBeCloseTo(360, 6)
    expect(slicePath(todo, 100, 100, 50).length).toBeGreaterThan(20)
  })
})

describe('el gráfico de líneas encuadra el rango', () => {
  // La 89 del banco va de 21.000 a 24.000 accidentes. Con el eje desde cero
  // los cinco puntos caen sobre la misma raya y la variación —que es lo que
  // se pregunta— deja de poder leerse. Esto comprueba que el COMPONENTE elige
  // esa escala, no sólo que la función sepa calcularla.
  const LINEA = [
    'Accidentes:',
    '',
    '<!-- chart: line x="Año" unit="accidentes" -->',
    '',
    '| Año | Número |',
    '| --- | --- |',
    '| 2006 | 23.000 |',
    '| 2007 | 24.000 |',
    '| 2008 | 22.500 |',
    '| 2009 | 23.000 |',
    '| 2010 | 21.000 |',
    '',
  ].join('\n')

  it('la cuadrícula no arranca en cero cuando los datos están lejos de él', () => {
    const { container } = render(<PromptWithChart>{LINEA}</PromptWithChart>)
    // Sólo las etiquetas de la cuadrícula, que son las únicas alineadas contra
    // el eje. Mirar TODOS los textos del SVG metía los años en el recuento, y
    // con 2006 ahí dentro el mínimo era 2006 tanto con el eje desde cero como
    // sin él: el test pasaba siempre y no comprobaba nada.
    const rayas = [...container.querySelectorAll('svg text[text-anchor="end"]')].map((t) =>
      Number((t.textContent ?? '').split('.').join('')),
    )
    expect(Math.min(...rayas)).toBeGreaterThan(0)
    // Y el suelo cae justo debajo del menor dato, no muy por debajo.
    expect(rayas).toContain(21000)
  })

  it('los cinco puntos no caen sobre la misma raya', () => {
    // Lo mismo dicho sobre el dibujo y no sobre las etiquetas: entre el año
    // peor y el mejor tiene que quedar alto suficiente para ver la variación.
    // Con el eje desde cero los 3.000 accidentes de diferencia se quedan en
    // una octava parte del gráfico.
    const { container } = render(<PromptWithChart>{LINEA}</PromptWithChart>)
    const alturas = [...container.querySelectorAll('svg circle')].map((c) =>
      Number(c.getAttribute('cy')),
    )
    expect(alturas).toHaveLength(5)
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeGreaterThan(100)
  })

  it('dibuja una línea por serie, no barras', () => {
    const { container } = render(<PromptWithChart>{LINEA}</PromptWithChart>)
    expect(container.querySelectorAll('svg polyline').length).toBe(1)
    expect(container.querySelectorAll('svg rect').length).toBe(0)
  })
})
