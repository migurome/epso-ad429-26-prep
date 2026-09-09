// Recorrido completo de rutas sobre la aplicación REAL, no sobre páginas
// sueltas.
//
// smoke.test.tsx monta cada página por separado con un <MemoryRouter>, lo que
// deja fuera todo lo que la envuelve: el Layout, su <Suspense>, la barra
// lateral, el selector de convocatoria y el atributo data-competition del que
// cuelga el color de toda la interfaz. Un fallo en cualquiera de esas piezas
// deja la web en blanco sin que ninguna prueba de página lo note.
//
// Aquí se monta <App /> tal cual, se navega por el hash igual que el
// navegador, y se comprueba en las dos lenguas y en las dos convocatorias que
// cada ruta pinta contenido real (no el indicador de carga, no un hueco).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import App from './App'
import { COMPETITIONS, COMPETITION_ORDER } from './data/competition'
import { useCompetitionStore } from './lib/competitionStore'
import { useLocaleStore } from './lib/localeStore'
import { useProgressStore } from './lib/progressStore'
import { DICT } from './lib/dictionary'

const FIELDS = COMPETITION_ORDER.flatMap((key) => COMPETITIONS[key].fields)

/** Toda ruta declarada en App.tsx, más una inexistente para comprobar que el
 * comodín redirige en vez de romper. */
const ROUTES = [
  '/',
  '/razonamiento',
  ...(['verbal', 'numerical', 'abstract'] as const).map((s) => `/razonamiento/${s}`),
  '/campo',
  ...FIELDS.map((f) => `/campo/${f.id}`),
  '/formacion',
  '/formacion/1',
  '/formacion/12',
  '/eufte',
  '/dia-del-examen',
  '/recursos',
  '/progreso',
  '/calendario',
  '/ajustes',
  '/verificacion',
  '/esta-ruta-no-existe',
]

beforeEach(() => {
  // Cada caso arranca del mismo sitio: los stores persisten en localStorage y
  // abrir un ámbito de la AD8 cambia la convocatoria activa, así que sin este
  // reinicio el orden de los tests decidiría el resultado.
  useLocaleStore.setState({ locale: 'es' })
  useCompetitionStore.setState({ competition: 'ad7' })
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
})

afterEach(cleanup)

/** Monta la aplicación en una ruta concreta. El primer render se suspende
 * (el chunk de contenido todavía no ha resuelto), y sin este `act` asíncrono
 * React no llega a confirmar en el DOM el render posterior. */
async function visit(route: string) {
  window.location.hash = `#${route}`
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(<App />)
  })
  return result
}

async function waitForContent(container: HTMLElement, locale: 'es' | 'en') {
  const loading = DICT.loading[locale]
  await waitFor(
    () => {
      // El chunk verbal ronda 1 MB; 5 s dan margen sin tapar un fallo real.
      expect(container.textContent?.trim()).toBeTruthy()
      expect(container.textContent).not.toContain(loading)
    },
    { timeout: 5000 },
  )
}

/** Un `main` sólo con el marco (cabecera y nada más) es exactamente el síntoma
 * de una página que ha reventado por dentro sin lanzar: se comprueba que hay
 * texto de verdad debajo del contenedor de la ruta. */
function mainText(container: HTMLElement): string {
  return container.querySelector('main')?.textContent?.trim() ?? ''
}

describe.each(['es', 'en'] as const)('rutas en %s', (locale) => {
  it.each(ROUTES)('%s se monta y pinta contenido', async (route) => {
    useLocaleStore.setState({ locale })
    const { container } = await visit(route)
    await waitForContent(container, locale)

    expect(container.querySelector('nav'), `${route}: sin barra de navegación`).not.toBeNull()
    expect(mainText(container).length, `${route}: el contenido principal está vacío`).toBeGreaterThan(
      40,
    )
  })
})

describe('la convocatoria activa manda en la interfaz', () => {
  it.each(COMPETITION_ORDER)('%s tiñe <html> y muestra su referencia oficial', async (key) => {
    useCompetitionStore.setState({ competition: key })
    const { container } = await visit('/')
    await waitForContent(container, 'es')

    expect(document.documentElement.dataset.competition).toBe(key)
    expect(container.textContent).toContain(COMPETITIONS[key].id)
  })

  // Abrir el ámbito por su URL tiene que arrastrar la convocatoria a la que
  // pertenece: si no, se leerían las plazas y los plazos de la otra.
  it.each(
    COMPETITION_ORDER.flatMap((key) =>
      COMPETITIONS[key].fields.map((f) => [f.id, key] as const),
    ),
  )('/campo/%s activa la convocatoria %s', async (fieldId, expected) => {
    // Se parte siempre de la otra, para que el cambio tenga que ocurrir.
    useCompetitionStore.setState({ competition: expected === 'ad7' ? 'ad8' : 'ad7' })
    const { container } = await visit(`/campo/${fieldId}`)
    await waitForContent(container, 'es')

    await waitFor(() => expect(useCompetitionStore.getState().competition).toBe(expected))
    expect(document.documentElement.dataset.competition).toBe(expected)
  })
})

describe('el idioma cambia todo el texto de la interfaz', () => {
  it('el panel usa el diccionario del idioma activo, sin restos del otro', async () => {
    useLocaleStore.setState({ locale: 'en' })
    const { container } = await visit('/')
    await waitForContent(container, 'en')

    expect(container.textContent).toContain(DICT.nav_dashboard.en)
    expect(container.textContent).not.toContain(DICT.nav_dashboard.es)
  })
})

describe('un ámbito todavía sin banco lo dice, en vez de fingir estar vacío', () => {
  const pending = FIELDS.filter((f) => f.bankPending)

  it.each(pending.length ? pending.map((f) => f.id) : ['(ninguno)'])(
    '%s muestra su alcance oficial',
    async (fieldId) => {
      if (fieldId === '(ninguno)') return
      const { container } = await visit(`/campo/${fieldId}`)
      await waitForContent(container, 'es')
      // Sin banco, la página tiene que seguir enseñando algo sustancial: el
      // anexo II de la convocatoria se publica como documento de teoría.
      expect(mainText(container).length).toBeGreaterThan(400)
    },
  )
})
