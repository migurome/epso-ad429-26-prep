// El editor de la redacción libre. Lo que hay que asegurar es el contador:
// es la única defensa contra que el formulario de EPSO recorte el texto sin
// decir nada al pegarlo.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ApplicationEditor } from './ApplicationEditor'
import { CHAR_LIMIT, NEAR_LIMIT, SECTIONS } from '../lib/application'
import { EMPTY_TEXTS } from '../lib/applicationStore'
import { useLocaleStore } from '../lib/localeStore'
import { DICT } from '../lib/dictionary'

const de = (n: number) => 'x'.repeat(n)

beforeEach(() => useLocaleStore.setState({ locale: 'es' }))
afterEach(cleanup)

describe('los cuatro apartados', () => {
  it('sale uno por apartado del formulario, con su enunciado', () => {
    render(<ApplicationEditor texts={EMPTY_TEXTS} onChange={() => {}} />)
    for (const section of SECTIONS) {
      expect(screen.getByLabelText(section.label.es), `falta ${section.id}`).toBeTruthy()
    }
  })

  it('escribir avisa a quien lo tenga que guardar, con el apartado que toca', () => {
    const onChange = vi.fn()
    render(<ApplicationEditor texts={EMPTY_TEXTS} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(SECTIONS[1].label.es), {
      target: { value: 'Me presento porque' },
    })
    expect(onChange).toHaveBeenCalledWith(SECTIONS[1].id, 'Me presento porque')
  })
})

describe('el contador', () => {
  const soloEn = (id: string, text: string) => ({ ...EMPTY_TEXTS, [id]: text })
  const fill = (key: 'application_counter' | 'application_over' | 'application_near', v: Record<string, string>) =>
    Object.entries(v).reduce((text, [k, val]) => text.replace('{' + k + '}', val), DICT[key].es)

  it('dice cuánto llevas de los 2 000', () => {
    // En español un número de cuatro cifras no lleva separador de millares
    // ("1933", no "1.933"), así que se compara con el mismo formateo que usa
    // la interfaz y no con un literal escrito a mano.
    const { container } = render(
      <ApplicationEditor texts={soloEn('experience', de(1933))} onChange={() => {}} />,
    )
    expect(container.textContent).toContain(
      fill('application_counter', {
        used: (1933).toLocaleString('es-ES'),
        limit: CHAR_LIMIT.toLocaleString('es-ES'),
      }),
    )
  })

  it('pasarse dice por cuánto, que es lo que hay que recortar', () => {
    const { container } = render(
      <ApplicationEditor texts={soloEn('experience', de(CHAR_LIMIT + 67))} onChange={() => {}} />,
    )
    expect(container.textContent).toContain(fill('application_over', { over: '67' }))
  })

  it('cerca del límite avisa antes de chocar', () => {
    const { container } = render(
      <ApplicationEditor texts={soloEn('experience', de(NEAR_LIMIT))} onChange={() => {}} />,
    )
    expect(container.textContent).toContain(fill('application_near', { left: '100' }))
  })
})

describe('copiar al formulario', () => {
  it('un apartado en blanco no se puede copiar', () => {
    render(<ApplicationEditor texts={EMPTY_TEXTS} onChange={() => {}} />)
    const botones = screen.getAllByRole('button', { name: DICT.application_copy.es })
    expect(botones.every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('con texto sí, y lleva al portapapeles lo de ESE apartado', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(
      <ApplicationEditor
        texts={{ ...EMPTY_TEXTS, contribution: 'Lo que aporto' }}
        onChange={() => {}}
      />,
    )
    const botones = screen.getAllByRole('button', { name: DICT.application_copy.es })
    const activo = botones.find((b) => !(b as HTMLButtonElement).disabled)!
    fireEvent.click(activo)
    expect(writeText).toHaveBeenCalledWith('Lo que aporto')
  })
})
