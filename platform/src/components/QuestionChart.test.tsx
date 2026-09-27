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
import { PromptWithChart } from './QuestionChart'
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
    const ejes = ['2008', '2009', 'Año · toneladas']
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
