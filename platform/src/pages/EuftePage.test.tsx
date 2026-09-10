// La página de EUFTE tenía el 28% de ramas cubiertas, y la rama que más
// importa es la menos obvia: el acordeón de temas mantiene MONTADO el redactor
// de cada tema que se haya abierto, y sólo lo esconde con CSS al cerrarlo.
// Desmontarlo perdía el borrador en curso, el cronómetro y las notas de
// autorrevisión sin avisar, en la prueba escrita, que es la fase donde el
// candidato invierte cuarenta minutos de una sentada.
//
// Se monta sobre el contenido real de EUFTE, igual que el resto de páginas que
// cargan su bloque bajo demanda.
import { Suspense } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EuftePage } from './EuftePage'
import { loadEufteContent } from '../data/contentLoader'
import { useCompetitionStore } from '../lib/competitionStore'
import { useLocaleStore } from '../lib/localeStore'
import { useProgressStore } from '../lib/progressStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { DICT } from '../lib/dictionary'
import type { EssayAttempt } from '../types/content'

const es = (key: keyof typeof DICT) => DICT[key].es
const FALLBACK = 'cargando-eufte'

async function mount() {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <Suspense fallback={<div>{FALLBACK}</div>}>
        <EuftePage />
      </Suspense>,
    )
  })
  await waitFor(
    () => {
      expect(result.container.textContent).toBeTruthy()
      expect(result.container.textContent).not.toContain(FALLBACK)
    },
    { timeout: 5000 },
  )
  return result
}

const tab = (name: string | RegExp) => screen.getByRole('button', { name })

/** El botón que arranca el cronómetro de una redacción: 'Empezar (40 min)'.
 * Se escribe a mano en vez de derivarlo del diccionario porque la plantilla
 * lleva paréntesis, que en una expresión regular son un grupo. */
const START = /^Empezar \(\d+ min\)$/
const openTab = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.click(tab(name))
  })
}

/** Las cabeceras de los temas del acordeón, que son los botones que no son
 * pestañas ni controles del redactor. */
function promptHeaders(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll('div.space-y-2 > div > button')] as HTMLButtonElement[]
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useTestLocaleStore.setState({ locale: 'es' })
  useCompetitionStore.setState({ competition: 'ad7' })
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
})

afterEach(cleanup)

describe('la página monta las tres pestañas', () => {
  it('ofrece teoría, temas de práctica e historial', async () => {
    await mount()
    expect(tab(es('tab_theory'))).toBeTruthy()
    expect(tab(new RegExp(es('tab_practice_prompts')))).toBeTruthy()
    expect(tab(new RegExp(es('tab_history')))).toBeTruthy()
  })

  it('la pestaña de temas dice cuántos hay', async () => {
    const { ESSAY_PROMPTS } = await loadEufteContent()
    await mount()
    expect(
      tab(`${es('tab_practice_prompts')} (${ESSAY_PROMPTS.length})`),
    ).toBeTruthy()
  })

  it('la teoría se pinta como texto, no como marcado crudo', async () => {
    const { container } = await mount()
    expect(container.querySelector('h2, h3, p')).toBeTruthy()
    expect(container.textContent).not.toContain('##')
  })

  it('el formato del examen se anuncia arriba', async () => {
    // Cuarenta minutos y un solo ejercicio: es la fase que más se infravalora,
    // y el formato es justo lo que hay que tener delante.
    const { container } = await mount()
    expect(container.textContent).toMatch(/40 min/)
  })
})

describe('el historial', () => {
  const attempt = (id: string): EssayAttempt => ({
    id,
    promptId: 'cualquiera',
    startedAt: '2026-03-01T10:00:00.000Z',
    text: 'Texto de la redacción',
    timeSpentSeconds: 2400,
  })

  it('sin intentos, la pestaña no lleva contador', async () => {
    await mount()
    expect(tab(es('tab_history')).textContent).toBe(es('tab_history'))
  })

  it('con intentos, la pestaña los cuenta', async () => {
    useProgressStore.setState({ testAttempts: [], essayAttempts: [attempt('e1'), attempt('e2')] })
    await mount()
    expect(tab(`${es('tab_history')} (2)`)).toBeTruthy()
  })
})

describe('el acordeón de temas', () => {
  it('arranca con todos cerrados: ningún redactor montado', async () => {
    const { container } = await mount()
    await openTab(new RegExp(es('tab_practice_prompts')))
    expect(promptHeaders(container).length).toBeGreaterThan(1)
    expect(container.querySelector('textarea')).toBeNull()
  })

  it('abrir un tema monta su redactor', async () => {
    const { container } = await mount()
    await openTab(new RegExp(es('tab_practice_prompts')))
    await act(async () => {
      fireEvent.click(promptHeaders(container)[0])
    })
    expect(screen.getByRole('button', { name: START })).toBeTruthy()
  })

  it('abrir un segundo tema cierra el primero', async () => {
    // Dos redactores visibles a la vez darían dos cronómetros corriendo y
    // ninguna pista de cuál cuenta.
    const { container } = await mount()
    await openTab(new RegExp(es('tab_practice_prompts')))
    const headers = promptHeaders(container)

    await act(async () => fireEvent.click(headers[0]))
    const visiblesTrasUno = container.querySelectorAll('div.border-t:not(.hidden)').length
    await act(async () => fireEvent.click(headers[1]))
    const visiblesTrasDos = container.querySelectorAll('div.border-t:not(.hidden)').length

    expect(visiblesTrasUno).toBe(1)
    expect(visiblesTrasDos).toBe(1)
  })

  it('volver a pulsar la cabecera cierra el tema', async () => {
    const { container } = await mount()
    await openTab(new RegExp(es('tab_practice_prompts')))
    const cabecera = promptHeaders(container)[0]

    await act(async () => fireEvent.click(cabecera))
    expect(container.querySelectorAll('div.border-t:not(.hidden)')).toHaveLength(1)
    await act(async () => fireEvent.click(cabecera))
    expect(container.querySelectorAll('div.border-t:not(.hidden)')).toHaveLength(0)
  })
})

describe('cerrar un tema NO tira el borrador', () => {
  /** Deja el primer tema empezado y con texto escrito. */
  async function startWriting(container: HTMLElement) {
    await openTab(new RegExp(es('tab_practice_prompts')))
    await act(async () => fireEvent.click(promptHeaders(container)[0]))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: START }))
    })
    const area = container.querySelector('textarea')!
    fireEvent.change(area, { target: { value: 'Mi borrador a medio escribir' } })
    return area
  }

  it('el texto sigue ahí al cerrar y volver a abrir', async () => {
    // Ésta es la razón de que el redactor no se desmonte. Sin ella, cerrar el
    // acordeón sin guardar borraba cuarenta minutos de trabajo en silencio.
    const { container } = await mount()
    await startWriting(container)
    const cabecera = promptHeaders(container)[0]

    await act(async () => fireEvent.click(cabecera))
    await act(async () => fireEvent.click(cabecera))

    expect(container.querySelector('textarea')!.value).toBe('Mi borrador a medio escribir')
  })

  it('el redactor sigue en el documento mientras está cerrado, sólo oculto', async () => {
    const { container } = await mount()
    await startWriting(container)

    await act(async () => fireEvent.click(promptHeaders(container)[0]))

    // Sigue montado (el texto no se ha perdido) pero su contenedor va oculto.
    expect(container.querySelector('textarea')!.value).toBe('Mi borrador a medio escribir')
    expect(container.querySelectorAll('div.border-t.hidden')).toHaveLength(1)
  })

  it('abrir otro tema tampoco tira el borrador del primero', async () => {
    const { container } = await mount()
    await startWriting(container)

    await act(async () => fireEvent.click(promptHeaders(container)[1]))

    const areas = [...container.querySelectorAll('textarea')].map((a) => a.value)
    expect(areas).toContain('Mi borrador a medio escribir')
  })
})

describe('idioma', () => {
  it('el idioma del enunciado es independiente del de la interfaz', async () => {
    // En el examen la redacción va en Lengua 2, pero conviene poder practicar
    // en el otro idioma sin cambiar toda la interfaz.
    const { container } = await mount()
    await openTab(new RegExp(es('tab_practice_prompts')))
    const enEspanol = promptHeaders(container)[0].textContent

    cleanup()
    useTestLocaleStore.setState({ locale: 'en' })
    const segundo = await mount()
    await openTab(new RegExp(es('tab_practice_prompts')))
    const enIngles = promptHeaders(segundo.container)[0].textContent

    expect(enIngles).not.toBe(enEspanol)
    // La interfaz sigue en español: las pestañas no han cambiado de idioma.
    expect(tab(es('tab_theory'))).toBeTruthy()
  })
})
