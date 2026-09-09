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
import { useAuthStore } from './lib/authStore'
import { CONTENT_TARGETS } from './lib/selfCheck'
import pkg from '../package.json'
import { DEFAULT_PROFILE, useStudyStore } from './lib/studyStore'
import { hasCourse } from './data/contentLoader'
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
  // La aplicación entera vive detrás de la portada de acceso; sin sesión no se
  // monta ninguna ruta y todas estas pruebas mirarían el formulario de entrada.
  useAuthStore.setState({ user: 'migurome' })
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
      // El marco (barra lateral, cabecera) pinta antes que la ruta, y una ruta
      // que redirige tarda un render más. Sin esperar al contenido de `main`,
      // la comprobación pasaría mirando sólo el marco.
      expect(mainText(container)).toBeTruthy()
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

describe('Field-Related MCQ y Formación se ciñen al ámbito elegido', () => {
  // El candidato se presenta por un ámbito. Los demás son material que no va a
  // examinar, y ocupaban la portada de la fase y un enlace en la navegación.
  beforeEach(() => {
    useStudyStore.setState({ profile: { ...DEFAULT_PROFILE } })
  })

  it.each(COMPETITION_ORDER.flatMap((key) => COMPETITIONS[key].fields.map((f) => [key, f.id] as const)))(
    '/campo lleva directamente al ámbito elegido (%s → %s)',
    async (key, fieldId) => {
      useCompetitionStore.setState({ competition: key })
      useStudyStore.setState({
        profile: { ...DEFAULT_PROFILE, preferredFields: { [key]: fieldId } },
      })
      const { container } = await visit('/campo')
      await waitForContent(container, 'es')

      await waitFor(() => expect(window.location.hash).toBe(`#/campo/${fieldId}`))
      const field = COMPETITIONS[key].fields.find((f) => f.id === fieldId)!
      expect(container.textContent).toContain(field.label.es)
    },
  )

  it('sin ámbito elegido cae en el de la convocatoria, no en una portada vacía', async () => {
    useCompetitionStore.setState({ competition: 'ad8' })
    const { container } = await visit('/campo')
    await waitForContent(container, 'es')
    await waitFor(() => expect(window.location.hash).toBe(`#/campo/${COMPETITIONS.ad8.userField}`))
  })

  it('los demás ámbitos ya no se enlazan desde la fase', async () => {
    useCompetitionStore.setState({ competition: 'ad8' })
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, preferredFields: { ad8: 'cybersecurity' } },
    })
    const { container } = await visit('/campo')
    await waitForContent(container, 'es')

    const others = COMPETITIONS.ad8.fields.filter((f) => f.id !== 'cybersecurity')
    for (const other of others) {
      expect(container.querySelector(`a[href$="/campo/${other.id}"]`)).toBeNull()
    }
  })

  it('un ámbito sin curso no encuentra en Formación el temario de otro', async () => {
    // Enseñar aquí el curso de ciberseguridad a quien se presenta por IA sería
    // material equivocado presentado como suyo.
    const noCourse = COMPETITIONS.ad8.fields.find((f) => !hasCourse(f.id))!
    useCompetitionStore.setState({ competition: 'ad8' })
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, preferredFields: { ad8: noCourse.id } },
    })
    const { container } = await visit('/formacion')
    await waitForContent(container, 'es')

    expect(container.textContent).toContain(DICT.course_other_field.es)
    expect(container.textContent).not.toContain(DICT.nav_course.es + ' —')
  })

  it('y tampoco lo enlaza la navegación, ni dentro de su sección', async () => {
    const noCourse = COMPETITIONS.ad8.fields.find((f) => !hasCourse(f.id))!
    useCompetitionStore.setState({ competition: 'ad8' })
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, preferredFields: { ad8: noCourse.id } },
    })
    const { container } = await visit(`/campo/${noCourse.id}`)
    await waitForContent(container, 'es')
    expect(container.querySelector('a[href$="/formacion"]')).toBeNull()
  })

  it('con un ámbito que sí tiene curso, cuelga del test de ámbito', async () => {
    // Ya no es una fase a la misma altura: es material de apoyo del test de
    // ámbito, así que sólo aparece con esa sección abierta.
    useCompetitionStore.setState({ competition: 'ad8' })
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, preferredFields: { ad8: 'cybersecurity' } },
    })
    const { container } = await visit('/campo/cybersecurity')
    await waitForContent(container, 'es')
    expect(container.querySelector('a[href$="/formacion"]')).toBeTruthy()
  })
})

describe('la aplicación entera vive detrás de la portada de acceso', () => {
  it('sin sesión no se monta ninguna ruta', async () => {
    useAuthStore.setState({ user: null })
    const { container } = await visit('/progreso')
    expect(container.querySelector('nav')).toBeNull()
    expect(container.textContent).toContain(DICT.login_submit.es)
  })
})

describe('la barra lateral', () => {
  it('cuelga la formación del test de ámbito, no a su altura', async () => {
    useCompetitionStore.setState({ competition: 'ad8' })
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, preferredFields: { ad8: 'cybersecurity' } },
    })
    const { container } = await visit('/campo/cybersecurity')
    await waitForContent(container, 'es')

    const course = container.querySelector('a[href$="/formacion"]')!
    const field = container.querySelector('a[href$="/campo"]')!
    // El hijo vive dentro del bloque del padre, no como hermano suyo.
    expect(field.closest('div')?.parentElement?.contains(course)).toBe(true)
  })

  it('el desplegable se puede cerrar', async () => {
    useCompetitionStore.setState({ competition: 'ad8' })
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, preferredFields: { ad8: 'cybersecurity' } },
    })
    const { container } = await visit('/campo/cybersecurity')
    await waitForContent(container, 'es')

    const toggle = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${DICT.toggle_subsection.es.replace('{section}', DICT.nav_field_mcq.es)}"]`,
    )!
    await act(async () => {
      toggle.click()
    })
    expect(container.querySelector('a[href$="/formacion"]')).toBeNull()
  })

  it('el pie enseña la versión de la plataforma', async () => {
    const { container } = await visit('/')
    await waitForContent(container, 'es')
    expect(container.textContent).toContain(DICT.app_version.es.replace('{version}', pkg.version))
    // Y ya no el recuento de plazas, que estaba de adorno.
    expect(container.textContent).not.toContain('ámbitos')
  })
})

describe('el selector de convocatoria funciona dentro del test de ámbito', () => {
  // La URL de un ámbito arrastra su convocatoria, y eso dejaba el selector
  // muerto en toda esta fase: pulsarlo se deshacía en el mismo render.
  it('cambiar de convocatoria lleva al ámbito elegido en la otra', async () => {
    useCompetitionStore.setState({ competition: 'ad8' })
    useStudyStore.setState({
      profile: {
        ...DEFAULT_PROFILE,
        preferredFields: { ad8: 'cybersecurity', ad7: 'data-science' },
      },
    })
    const { container } = await visit('/campo/cybersecurity')
    await waitForContent(container, 'es')

    const ad7 = container.querySelector<HTMLButtonElement>(
      `button[aria-pressed="false"]`,
    )!
    await act(async () => {
      ad7.click()
    })
    await waitFor(() => expect(window.location.hash).toBe('#/campo/data-science'))
    await waitFor(() => expect(useCompetitionStore.getState().competition).toBe('ad7'))
  })
})

describe('la verificación enseña el guion antes de correrlo', () => {
  it('lista todas sus secciones desde el primer momento', async () => {
    // Antes aparecían una a una según terminaban, así que no había forma de
    // saber cuántas faltaban ni distinguir «va bien» de «no ha llegado ahí».
    const { container } = await visit('/verificacion')
    const sections = container.querySelectorAll('main [aria-expanded]')
    // Convocatorias + cada bloque de contenido + transversales + imágenes.
    expect(sections.length).toBe(CONTENT_TARGETS.length + 3)
  })

  it('las que todavía no ha corrido salen sin marcar', async () => {
    // Contar secciones no basta: si aparecieran ya marcadas, el panel volvería
    // a no distinguir «ha pasado» de «no ha llegado a hacerse». Las imágenes
    // son la última sección y aquí no llegan a descargarse nunca, así que
    // siguen pendientes de forma determinista.
    const { container } = await visit('/verificacion')
    const figures = [...container.querySelectorAll('main [aria-expanded]')].at(-1)!
    expect(figures.textContent).toContain(DICT.selfcheck_pending.es)
  })
})
