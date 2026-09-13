// El tablero de un ejercicio del motor. Se comprueba aquí y no en la tarjeta
// lo que es del tablero en sí: que una serie quepa entera en una fila del
// móvil —partida en dos líneas deja de leerse como secuencia, que es el
// ejercicio—, que la casilla que falta mida lo mismo que las figuras, y que se
// distinga de una figura por su forma y su nombre, no sólo por el color.
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { EngineBoardView, EngineSvg } from './EngineFigure'
import type { EngineBoard } from '../types/content'

afterEach(cleanup)

const figure = (label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>${label}</title><circle cx="50" cy="50" r="30"/></svg>`

const board = (rows: (string | null)[][]): EngineBoard => ({ cellSize: 100, rows })

const draw = (b: EngineBoard, large?: boolean) =>
  render(
    <EngineBoardView board={b} large={large} cellAlt={(r, c) => `F${r}C${c}`} unknownAlt="falta" />,
  ).container

/** Las clases de anchura de un elemento, para comparar tamaños sin CSS. */
const widthOf = (el: Element) =>
  [...el.classList].filter((c) => /^(sm:)?w-/.test(c)).sort().join(' ')

describe('el tablero', () => {
  it('sin filas no pinta nada, ni siquiera un contenedor vacío', () => {
    // Buscar la figura que sobra no tiene tablero: la pregunta entera está en
    // las opciones, y un recuadro vacío encima parecería una figura rota.
    expect(draw(board([])).innerHTML).toBe('')
  })

  it('cada casilla lleva su posición, contada desde 1', () => {
    draw(board([[figure('a'), figure('b')], [figure('c'), null]]))
    const alts = screen
      .getAllByRole('img')
      .filter((el) => el.tagName === 'IMG')
      .map((img) => img.getAttribute('alt'))
    expect(alts).toEqual(['F1C1', 'F1C2', 'F2C1'])
  })

  it('cada figura acaba en su casilla, en el orden de la fila', () => {
    const container = draw(board([[figure('primera'), figure('segunda'), null]]))
    const svgs = [...container.querySelectorAll('img')].map((img) =>
      decodeURIComponent(img.getAttribute('src')!.split(',')[1]),
    )
    expect(svgs[0]).toContain('<title>primera</title>')
    expect(svgs[1]).toContain('<title>segunda</title>')
  })

  it('la casilla que falta se marca con «?» y tiene nombre accesible', () => {
    draw(board([[figure('a'), null]]))
    const falta = screen.getByRole('img', { name: 'falta' })
    expect(falta.tagName).toBe('DIV')
    expect(falta.textContent).toBe('?')
  })

  it('la casilla que falta mide lo mismo que las figuras', () => {
    // Si el «?» fuera de otro tamaño, la fila dejaría de leerse como una
    // secuencia de casillas iguales.
    const container = draw(board([[figure('a'), figure('b'), null]]))
    const falta = screen.getByRole('img', { name: 'falta' })
    expect(widthOf(falta)).toBe(widthOf(container.querySelector('img')!))
  })

  it('una serie de seis no se parte en dos líneas', () => {
    const container = draw(
      board([[figure('1'), figure('2'), figure('3'), figure('4'), figure('5'), null]]),
    )
    const fila = container.querySelector('img')!.parentElement!
    expect(fila.className).toContain('flex-nowrap')
    // Seis casillas de 44 px y cinco huecos de 8 px caben en el ancho útil de
    // un móvil de 390 px; con casillas de 56 px ya no.
    for (const img of container.querySelectorAll('img')) {
      expect(img.classList.contains('w-11')).toBe(true)
    }
  })

  it('cuantas menos casillas por fila, más grandes', () => {
    const baseWidth = (rows: (string | null)[][]) => {
      const cls = [...draw(board(rows)).querySelector('img')!.classList].find((c) => /^w-\d+$/.test(c))!
      cleanup()
      return Number(cls.slice(2))
    }
    const seis = baseWidth([[figure('1'), figure('2'), figure('3'), figure('4'), figure('5'), null]])
    const tres = baseWidth([[figure('1'), figure('2'), null]])
    const dos = baseWidth([[figure('1'), null]])
    expect(seis).toBeLessThan(tres)
    expect(tres).toBeLessThan(dos)
  })

  it('el tamaño lo decide la fila más larga, para que todas casen', () => {
    const container = draw(board([[figure('1'), figure('2'), figure('3')], [figure('4'), null]]))
    const widths = [...container.querySelectorAll('img')].map(widthOf)
    expect(new Set(widths).size).toBe(1)
  })

  it('en grande, las casillas crecen a partir de la tableta', () => {
    const normal = widthOf(draw(board([[figure('1'), figure('2'), null]])).querySelector('img')!)
    cleanup()
    const grande = widthOf(draw(board([[figure('1'), figure('2'), null]]), true).querySelector('img')!)
    expect(grande).not.toBe(normal)
  })
})

describe('una figura', () => {
  it('se pinta como <img> con su texto alternativo', () => {
    render(<EngineSvg svg={figure('x')} alt="Figura A" />)
    const img = screen.getByRole('img', { name: 'Figura A' })
    expect(img.tagName).toBe('IMG')
    expect(decodeURIComponent(img.getAttribute('src')!.split(',')[1])).toContain('<title>x</title>')
  })

  it('nunca inserta el SVG como marcado', () => {
    const { container } = render(<EngineSvg svg={figure('x')} alt="Figura A" />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.innerHTML).not.toContain('<circle')
  })
})
