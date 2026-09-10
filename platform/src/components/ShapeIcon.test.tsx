// ShapeIcon dibuja las figuras del razonamiento abstracto, y su `switch` no
// tiene rama por defecto: una forma declarada en SHAPE_KINDS pero olvidada allí
// compila sin queja y sale como un SVG vacío. En una pregunta de examen eso es
// un panel en blanco donde debería haber una figura, y el candidato no tiene
// forma de saber si la pregunta es así o si la web se ha roto.
//
// De ahí el recorrido completo de abajo: no busca porcentaje de cobertura, sino
// cerrar la puerta a esa omisión concreta.
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { ShapeIcon } from './ShapeIcon'
import { SHAPE_KINDS, type FillKind, type ShapeKind, type SizeKind } from '../lib/abstractFigure'

afterEach(cleanup)

/** Elementos SVG que de verdad pintan algo. Un `<g>` vacío o unos `<defs>`
 * sueltos no cuentan: son justo lo que queda cuando falta la geometría. */
const DRAWS = 'circle, rect, polygon, polyline, path, line, ellipse'

function draw(shape: ShapeKind, extra: Partial<Parameters<typeof ShapeIcon>[0]['spec']> = {}) {
  const { container } = render(
    <ShapeIcon spec={{ shape, fill: 'filled', rotationDeg: 0, size: 'medium', ...extra }} />,
  )
  return container
}

describe('toda forma declarada se dibuja', () => {
  it('la lista de formas no está vacía ni se ha quedado a medias', () => {
    // Si SHAPE_KINDS se vaciara, el `it.each` de abajo no ejecutaría ni un
    // caso y el archivo pasaría en verde sin comprobar nada.
    expect(SHAPE_KINDS.length).toBeGreaterThanOrEqual(39)
  })

  it.each(SHAPE_KINDS)('«%s» produce geometría, no un SVG vacío', (shape) => {
    const container = draw(shape)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg!.querySelectorAll(DRAWS).length).toBeGreaterThan(0)
  })

  it.each(SHAPE_KINDS)('«%s» se dibuja dentro del marco de 100×100', (shape) => {
    // Todas comparten el mismo viewBox; una figura definida en otra escala se
    // saldría del marco y se montaría sobre el texto de al lado.
    const svg = draw(shape).querySelector('svg')
    expect(svg!.getAttribute('viewBox')).toBe('0 0 100 100')
  })
})

describe('el relleno cambia lo que se pinta', () => {
  const FILLS: FillKind[] = ['filled', 'empty', 'grey', 'hatched']

  it.each(FILLS)('«%s» sale distinto de los demás rellenos', (fill) => {
    // Cuatro rellenos que produjeran el mismo SVG serían cuatro etiquetas
    // decorativas: el banco distingue «círculo negro» de «círculo blanco».
    const otros = FILLS.filter((f) => f !== fill).map(
      (f) => draw('circle', { fill: f }).querySelector('svg')!.innerHTML,
    )
    const propio = draw('circle', { fill }).querySelector('svg')!.innerHTML
    expect(otros).not.toContain(propio)
  })

  it('el rayado lleva su propio patrón y conserva el contorno', () => {
    // Sin contorno, un rombo rayado y un rectángulo rayado eran la misma
    // mancha de líneas diagonales.
    const svg = draw('diamond', { fill: 'hatched' }).querySelector('svg')!
    expect(svg.querySelector('pattern')).toBeTruthy()
    const figura = svg.querySelector('polygon')!
    expect(figura.getAttribute('stroke')).toBeTruthy()
    expect(Number(figura.getAttribute('stroke-width'))).toBeGreaterThan(0)
  })

  it('el hueco no se pinta: sólo contorno', () => {
    const figura = draw('square', { fill: 'empty' }).querySelector('rect')!
    expect(figura.getAttribute('fill')).toBe('none')
    expect(Number(figura.getAttribute('stroke-width'))).toBeGreaterThan(0)
  })
})

describe('tamaño y giro', () => {
  const SIZES: SizeKind[] = ['small', 'medium', 'large', 'extra-large']

  it('cada tamaño da un lado distinto, y crecen en orden', () => {
    const lados = SIZES.map((size) =>
      Number(draw('circle', { size }).querySelector('svg')!.getAttribute('width')),
    )
    expect(lados).toEqual([...lados].sort((a, b) => a - b))
    expect(new Set(lados).size).toBe(SIZES.length)
  })

  it('`px` manda sobre el tamaño declarado', () => {
    // Lo usa la rejilla 3×3 cuando varias figuras comparten celda: con el
    // tamaño normal se salían del marco.
    const { container } = render(
      <ShapeIcon
        spec={{ shape: 'circle', fill: 'filled', rotationDeg: 0, size: 'extra-large' }}
        px={11}
      />,
    )
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('11')
  })

  it('un giro se aplica como rotación real', () => {
    const svg = draw('arrow', { rotationDeg: 90 }).querySelector('svg')!
    expect(svg.innerHTML).toMatch(/rotate\(\s*90/)
  })

  it('sin giro no se emite ninguna rotación', () => {
    expect(draw('arrow').querySelector('svg')!.innerHTML).not.toMatch(/rotate\(/)
  })
})

describe('media figura sombreada', () => {
  /** Una mitad rellena, como la describe el banco: «círculo medio sombreado». */
  const half = (split: 'horizontal' | 'vertical' | 'diagonal', side: 'first' | 'second' = 'first') =>
    ({ fill: 'filled' as const, split, side })

  it('pinta la mitad y deja ver la línea divisoria', () => {
    // El banco real describe figuras «medio sombreadas»; sin la divisoria, una
    // mitad blanca no se distingue de una figura entera hueca.
    const svg = draw('circle', {
      fill: 'empty',
      halfFill: half('horizontal'),
    }).querySelector('svg')!
    expect(svg.querySelector('clipPath')).toBeTruthy()
    expect(svg.querySelectorAll('circle').length).toBeGreaterThan(1)
  })

  it.each(['horizontal', 'vertical', 'diagonal'] as const)(
    'la partición «%s» sale distinta de las otras',
    (split) => {
      const otras = (['horizontal', 'vertical', 'diagonal'] as const)
        .filter((s) => s !== split)
        .map((s) => draw('square', { halfFill: half(s) }).querySelector('svg')!.innerHTML)
      const propia = draw('square', { halfFill: half(split) }).querySelector('svg')!.innerHTML
      expect(otras).not.toContain(propia)
    },
  )

  it('qué mitad se rellena cambia el dibujo', () => {
    // «mitad superior rellena» y «mitad inferior rellena» son dos figuras
    // distintas del banco: si salieran iguales, dos opciones se confundirían.
    const primera = draw('circle', { halfFill: half('horizontal', 'first') })
      .querySelector('svg')!.innerHTML
    const segunda = draw('circle', { halfFill: half('horizontal', 'second') })
      .querySelector('svg')!.innerHTML
    expect(primera).not.toBe(segunda)
  })

  it('el relleno de la mitad se respeta', () => {
    const gris = draw('square', { halfFill: { fill: 'grey', split: 'vertical', side: 'first' } })
      .querySelector('svg')!.innerHTML
    const negra = draw('square', { halfFill: half('vertical') }).querySelector('svg')!.innerHTML
    expect(gris).not.toBe(negra)
  })

  it('una forma que no admite mitades se dibuja entera, sin reventar', () => {
    // `halfFill` viene del texto del banco y puede caer sobre cualquier forma;
    // sólo unas pocas tienen geometría para partirse.
    const svg = draw('snowflake', { halfFill: half('horizontal') }).querySelector('svg')!
    expect(svg.querySelectorAll(DRAWS).length).toBeGreaterThan(0)
  })
})

describe('el círculo con radios', () => {
  it('dibuja tantos radios como pide la especificación', () => {
    const pocos = draw('spiked-circle', { spikes: 4 }).querySelectorAll('line').length
    const muchos = draw('spiked-circle', { spikes: 9 }).querySelectorAll('line').length
    expect(muchos).toBeGreaterThan(pocos)
  })

  it('sin número de radios sigue dibujando el círculo', () => {
    const svg = draw('spiked-circle').querySelector('svg')!
    expect(svg.querySelectorAll(DRAWS).length).toBeGreaterThan(0)
  })
})
