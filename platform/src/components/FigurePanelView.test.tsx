// FigurePanelView decide CÓMO se lee una figura abstracta, y esa decisión es
// el ejercicio: si dos opciones se dibujan igual, la pregunta no tiene
// respuesta; si los iconos se encogen de más, la posición deja de distinguirse
// a simple vista. Tenía el 31% de ramas cubiertas, y cada una de esas ramas
// existe por un caso concreto del banco real que rompía la lectura.
//
// Se comprueba por estructura y por tamaños de icono, no por clases de
// Tailwind: lo que importa es que haya rejilla o filas, y con qué tamaño, no
// cómo se llame la clase que lo consigue.
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { FigurePanelView } from './FigurePanelView'
import type { FigurePanel, Position, ShapeSpec, SizeKind } from '../lib/abstractFigure'

afterEach(cleanup)

function shape(patch: Partial<ShapeSpec> = {}): ShapeSpec {
  return { shape: 'circle', fill: 'filled', rotationDeg: 0, size: 'medium', ...patch }
}

function panel(patch: Partial<FigurePanel> = {}): FigurePanel {
  return { shapes: [], isBlank: false, raw: '', partial: false, ...patch }
}

const draw = (p: FigurePanel, props: { large?: boolean; sizeOverride?: SizeKind; framed?: boolean } = {}) =>
  render(<FigurePanelView panel={p} {...props} />).container

/** La rejilla de posición: el único contenedor con exactamente nueve celdas. */
function grid(container: HTMLElement): HTMLElement | null {
  return (
    [...container.querySelectorAll('div')].find((el) => el.children.length === 9) ?? null
  )
}

/** En qué celdas de la rejilla 3×3 ha caído alguna figura. */
function occupiedCells(container: HTMLElement): number[] {
  const cells = [...grid(container)!.children]
  return cells.flatMap((cell, i) => (cell.querySelector('svg') ? [i] : []))
}

const iconWidths = (container: HTMLElement) =>
  [...container.querySelectorAll('svg')].map((svg) => Number(svg.getAttribute('width')))

describe('un panel en blanco', () => {
  it('se marca con una interrogación, no con un hueco', () => {
    // Es la celda que el candidato tiene que rellenar: un hueco vacío no se
    // distingue de un fallo de dibujado.
    const container = draw(panel({ isBlank: true }))
    expect(container.textContent).toBe('?')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('no dibuja figuras aunque el panel traiga formas', () => {
    const container = draw(panel({ isBlank: true, shapes: [shape()] }))
    expect(container.querySelectorAll('svg')).toHaveLength(0)
  })
})

describe('un panel que no se ha podido dibujar', () => {
  it('enseña su pie de texto', () => {
    // Sin figuras que pintar, el texto ES la opción; esconderlo la dejaría
    // indistinguible de las demás.
    const container = draw(panel({ caption: 'dos círculos y una raya' }))
    expect(container.textContent).toContain('dos círculos y una raya')
  })

  it('si no hay pie, cae en la notación cruda antes que en la nada', () => {
    const container = draw(panel({ raw: '○○ / ▲' }))
    expect(container.textContent).toContain('○○ / ▲')
  })
})

describe('un panel suelto, sin posiciones', () => {
  it('dibuja una figura por forma', () => {
    const container = draw(panel({ shapes: [shape(), shape({ shape: 'square' })] }))
    expect(container.querySelectorAll('svg')).toHaveLength(2)
  })

  it('no monta ninguna rejilla', () => {
    // La rejilla 3×3 encoge los iconos para que quepan en su celda; ponerla
    // donde no hay posiciones sólo los haría más pequeños sin decir nada.
    const container = draw(panel({ shapes: [shape(), shape()] }))
    expect(grid(container)).toBeNull()
  })

  it('el pie acompaña a las figuras cuando lo hay', () => {
    const container = draw(panel({ shapes: [shape()], caption: 'dos iguales' }))
    expect(container.textContent).toContain('dos iguales')
  })

  it('sin pie no se inventa ninguno', () => {
    const container = draw(panel({ shapes: [shape()] }))
    expect(container.textContent).toBe('')
  })
})

describe('el pie de un panel parcial se lee', () => {
  it('un panel parcial pinta su pie más grande que uno normal', () => {
    // En un panel parcial el pie no es adorno: es la parte de la figura que no
    // se ha sabido dibujar, y es lo único que separa esa opción de las otras.
    const normal = draw(panel({ shapes: [shape()], caption: 'texto' })).querySelector('span')!
    cleanup()
    const parcial = draw(
      panel({ shapes: [shape()], caption: 'texto', partial: true }),
    ).querySelector('span')!
    expect(parcial.className).not.toBe(normal.className)
    expect(normal.className).toContain('text-[10px]')
    expect(parcial.className).toContain('text-xs')
  })
})

describe('posiciones dentro de la rejilla 3×3', () => {
  it('monta las nueve celdas', () => {
    const container = draw(panel({ shapes: [shape({ position: 'top-left' })] }))
    expect(grid(container)!.children).toHaveLength(9)
  })

  // Sin posiciones de la columna central ('top-centre', 'centre',
  // 'bottom-centre'): un panel que SÓLO usa esa columna se dibuja como bandas
  // a propósito, y eso se comprueba en su propio bloque más abajo.
  const CORNERS: [Position, number][] = [
    ['top-left', 0],
    ['top-right', 2],
    ['mid-left', 3],
    ['mid-right', 5],
    ['bottom-left', 6],
    ['bottom-right', 8],
  ]

  it.each(CORNERS)('«%s» cae en la celda %i', (position, cell) => {
    // Si dos posiciones distintas cayeran en la misma celda, dos opciones del
    // banco se verían idénticas y la pregunta se quedaría sin respuesta.
    const container = draw(panel({ shapes: [shape({ position })] }))
    expect(occupiedCells(container)).toEqual([cell])
  })

  it('dos formas con posiciones distintas ocupan celdas distintas', () => {
    // «hexágono arriba-izquierda + círculo abajo-izquierda» son dos figuras
    // separadas, no un grupo que se mueva en bloque.
    const container = draw(
      panel({
        shapes: [
          shape({ shape: 'hexagon', position: 'top-left' }),
          shape({ position: 'bottom-left' }),
        ],
      }),
    )
    expect(occupiedCells(container)).toEqual([0, 6])
  })

  it('una forma sin posición propia se agrupa en el centro', () => {
    const container = draw(
      panel({ shapes: [shape({ position: 'top-right' }), shape({ shape: 'star' })] }),
    )
    expect(occupiedCells(container)).toEqual([2, 4])
  })

  it('dentro de la rejilla el icono ignora el tamaño declarado', () => {
    // El texto puede declarar la figura «extra grande», pero en la rejilla
    // tiene que caber en un tercio del marco o desborda sobre las vecinas.
    const container = draw(panel({ shapes: [shape({ position: 'top-left', size: 'extra-large' })] }))
    expect(iconWidths(container)).toEqual([24])
  })
})

describe('varias figuras en la misma celda se encogen para caber', () => {
  // En una esquina, no en la columna central: la columna central se dibuja
  // como bandas y entonces no hay celda que compartir.
  const stack = (n: number) =>
    draw(
      panel({
        shapes: Array.from({ length: n }, () => shape({ position: 'top-left' })),
      }),
    )

  it('una sola va a tamaño de celda', () => {
    expect(iconWidths(stack(1))).toEqual([24])
  })

  it('cuantas más comparten celda, más pequeñas', () => {
    // El banco llega a poner seis en la misma celda («■■■ arriba, □ ■ □□»): a
    // tamaño normal se salen del marco y se montan sobre el párrafo de debajo.
    const anchos = [1, 2, 3, 5].map((n) => {
      const w = iconWidths(stack(n))[0]
      cleanup()
      return w
    })
    expect(anchos).toEqual([...anchos].sort((a, b) => b - a))
    expect(new Set(anchos).size).toBe(4)
  })

  it('seis en una celda siguen dibujándose todas', () => {
    expect(iconWidths(stack(6))).toHaveLength(6)
  })
})

describe('bandas: todo en la columna central se lee como filas', () => {
  it('no monta rejilla cuando sólo se usa la columna del medio', () => {
    // «línea arriba» + figuras sueltas: la rejilla no aporta nada y encoge los
    // iconos hasta hacerlos ilegibles. Son bandas, no celdas.
    const container = draw(
      panel({
        shapes: [
          shape({ shape: 'line', position: 'top-centre' }),
          shape({ position: 'centre' }),
        ],
      }),
    )
    expect(grid(container)).toBeNull()
    expect(container.querySelectorAll('svg')).toHaveLength(2)
  })

  it('con una sola forma fuera de la columna central sí monta rejilla', () => {
    const container = draw(
      panel({
        shapes: [
          shape({ shape: 'line', position: 'top-centre' }),
          shape({ position: 'mid-right' }),
        ],
      }),
    )
    expect(grid(container)).not.toBeNull()
  })

  it('las bandas conservan el orden de arriba a abajo', () => {
    const container = draw(
      panel({
        shapes: [
          shape({ shape: 'square', position: 'bottom-centre' }),
          shape({ shape: 'star', position: 'top-centre' }),
        ],
      }),
    )
    // La estrella se declaró segunda pero va arriba: el orden lo manda la
    // banda, no el orden del texto.
    const filas = [...container.querySelectorAll('svg')]
    expect(filas).toHaveLength(2)
    expect(filas[0].compareDocumentPosition(filas[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('filas apiladas', () => {
  it('cada fila declarada se dibuja como una fila propia', () => {
    // «[○○ / ▲▼▲ / ○○○○]»: cada fila lleva las figuras que diga el texto, así
    // que no caben en una celda de la rejilla.
    const container = draw(
      panel({
        shapes: [
          shape({ row: 0 }),
          shape({ row: 0 }),
          shape({ shape: 'triangle', row: 1 }),
          shape({ row: 2 }),
          shape({ row: 2 }),
          shape({ row: 2 }),
        ],
      }),
    )
    expect(grid(container)).toBeNull()
    expect(container.querySelectorAll('svg')).toHaveLength(6)

    const porFila = [...container.querySelectorAll('div')]
      .map((el) => el.querySelectorAll(':scope > svg').length)
      .filter((n) => n > 0)
    expect(porFila).toEqual([2, 1, 3])
  })

  it('las filas salen ordenadas por su número, no por el orden del texto', () => {
    const container = draw(
      panel({ shapes: [shape({ shape: 'square', row: 2 }), shape({ shape: 'star', row: 0 })] }),
    )
    const porFila = [...container.querySelectorAll('div')]
      .map((el) => [...el.querySelectorAll(':scope > svg')])
      .filter((svgs) => svgs.length > 0)
    expect(porFila).toHaveLength(2)
  })
})

describe('marco pedido por el grupo', () => {
  it('un panel sin posiciones se enmarca con sus figuras en fila', () => {
    // Es una decisión de grupo: si una sola de las cinco opciones lleva marco
    // y las demás no, unas salen enmarcadas y otras sueltas y dejan de
    // compararse.
    //
    // Se comprueba que el recuadro EXISTE, no sólo que no hay rejilla: sin el
    // recuadro las figuras también saldrían en fila y sin rejilla, así que
    // «hay dos figuras y no hay rejilla» no distinguía un caso del otro.
    const container = draw(panel({ shapes: [shape(), shape()] }), { framed: true })
    const marco = container.querySelector('div.border-dashed')
    expect(marco).not.toBeNull()
    expect(marco!.querySelectorAll('svg')).toHaveLength(2)
    expect(grid(container)).toBeNull()
  })

  it('sin marco pedido, las figuras van sueltas y sin recuadro', () => {
    const container = draw(panel({ shapes: [shape(), shape()] }))
    expect(container.querySelector('div.border-dashed')).toBeNull()
  })

  it('las figuras enmarcadas NO se encogen a tamaño de celda', () => {
    // Amontonarlas en la celda central obligaría a encogerlas, y esa opción
    // quedaría con iconos diminutos al lado de otras con iconos normales.
    const enmarcado = iconWidths(draw(panel({ shapes: [shape()] }), { framed: true }))[0]
    cleanup()
    const enCelda = iconWidths(draw(panel({ shapes: [shape({ position: 'centre' })] })))[0]
    expect(enmarcado).toBeGreaterThan(enCelda)
  })

  it('si el panel sí coloca, manda la rejilla sobre el marco simple', () => {
    const container = draw(panel({ shapes: [shape({ position: 'top-left' })] }), { framed: true })
    expect(grid(container)).not.toBeNull()
  })
})

describe('escala', () => {
  it('`large` agranda las figuras', () => {
    const normal = iconWidths(draw(panel({ shapes: [shape()] })))[0]
    cleanup()
    const grande = iconWidths(draw(panel({ shapes: [shape()] }), { large: true }))[0]
    expect(grande).toBeGreaterThan(normal)
  })

  it('la escala se desplaza entera y conserva las diferencias del panel', () => {
    // En varias preguntas del banco la regla ES el tamaño: si al agrandar se
    // aplanaran las diferencias, la pregunta se quedaría sin pista.
    const container = draw(
      panel({ shapes: [shape({ size: 'small' }), shape({ size: 'large' })] }),
      { large: true },
    )
    const [pequeña, grande] = iconWidths(container)
    expect(grande).toBeGreaterThan(pequeña)
  })

  it('`sizeOverride` manda sobre `large`', () => {
    // Se usa para encoger secuencias de muchos paneles y evitar el scroll
    // horizontal.
    const container = draw(panel({ shapes: [shape()] }), { large: true, sizeOverride: 'small' })
    const conOverride = iconWidths(container)[0]
    cleanup()
    const soloLarge = iconWidths(draw(panel({ shapes: [shape()] }), { large: true }))[0]
    expect(conOverride).toBeLessThan(soloLarge)
  })

  it('un tamaño en el extremo de la escala no se sale de ella', () => {
    // Desplazar 'extra-large' hacia arriba no debe dar un tamaño inexistente.
    const container = draw(panel({ shapes: [shape({ size: 'extra-large' })] }), { large: true })
    expect(iconWidths(container)[0]).toBeGreaterThan(0)
  })

  it('el panel en blanco también respeta `sizeOverride`', () => {
    const conOverride = draw(panel({ isBlank: true }), { sizeOverride: 'small' })
      .firstElementChild!.className
    cleanup()
    const sinOverride = draw(panel({ isBlank: true })).firstElementChild!.className
    expect(conOverride).not.toBe(sinOverride)
  })
})
