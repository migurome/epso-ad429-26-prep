// Recorrido completo de rutas sobre la aplicación REAL, no sobre páginas
// sueltas.
//
// smoke.test.tsx monta cada página por separado con un <MemoryRouter>, lo que
// deja fuera todo lo que la envuelve: el Layout, su <Suspense>, la barra
// lateral, la lista de ámbitos y la referencia de la convocatoria que se
// deduce de ellos. Un fallo en cualquiera de esas piezas
// deja la web en blanco sin que ninguna prueba de página lo note.
//
// Aquí se monta <App /> tal cual, se navega por el hash igual que el
// navegador, y se comprueba en las dos lenguas y en las dos convocatorias que
// cada ruta pinta contenido real (no el indicador de carga, no un hueco).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import App from './App'
import { ALL_FIELDS, COMPETITIONS, COMPETITION_ORDER } from './data/competition'
import { useLocaleStore } from './lib/localeStore'
import { useProgressStore } from './lib/progressStore'
import { useAccountStore } from './lib/accountStore'
import { CONTENT_TARGETS } from './lib/selfCheck'
import pkg from '../package.json'
import { DEFAULT_PROFILE, useStudyStore } from './lib/studyStore'
import { hasCourse } from './data/contentLoader'
import { DICT } from './lib/dictionary'
import { REFERENCE_LINKS } from './data/content'

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
  '/candidaturas',
  '/recursos',
  '/tablon',
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
  // Dentro: sesión resuelta y cuenta aprobada. `App` es una función pura de
  // esto —la vigilancia de la sesión la arranca `main.tsx`—, así que fijar el
  // almacén basta y no sale ninguna petición a Supabase.
  useAccountStore.setState({
    started: true,
    userId: 'u1',
    email: 'yo@ejemplo.es',
    account: {
      userId: 'u1',
      email: 'yo@ejemplo.es',
      role: 'candidate',
      status: 'approved',
      createdAt: '2026-09-18T07:00:00.000Z',
      decidedAt: '2026-09-18T07:00:00.000Z',
    },
    failure: null,
  })
  useStudyStore.setState({
    profile: { ...DEFAULT_PROFILE, field: COMPETITIONS.ad7.userField },
  })
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

/**
 * Monta sin dejar avanzar nada asíncrono: la foto del primer pintado.
 *
 * `visit` envuelve el montaje en un `act` asíncrono, que vacía microtareas y
 * temporizadores; para una página que arranca trabajo sola —la verificación—
 * eso convierte cualquier aserción sobre «todavía no ha corrido» en una
 * carrera. Con `act` síncrono los efectos se ejecutan hasta su primer `await` y
 * ahí se paran, que es exactamente el instante que se quiere fotografiar.
 */
/** Pasa a mirar como administrador, que es quien alcanza /admin y /verificacion. */
function comoAdmin() {
  const account = useAccountStore.getState().account!
  useAccountStore.setState({ account: { ...account, role: 'admin' } })
}

function visitFirstPaint(route: string) {
  window.location.hash = `#${route}`
  let result!: ReturnType<typeof render>
  act(() => {
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

describe('el ámbito elegido decide la convocatoria', () => {
  // Ya no hay selector de convocatoria: se elige campo y la oposición viene
  // detrás, con sus plazos, sus plazas y su color.
  it.each(COMPETITION_ORDER)('el ámbito de la %s trae su referencia oficial', async (key) => {
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, field: COMPETITIONS[key].userField },
    })
    const { container } = await visit('/')
    await waitForContent(container, 'es')

    expect(container.textContent).toContain(COMPETITIONS[key].id)
    // Y la de la otra no está por ninguna parte: leer los plazos equivocados
    // es el error caro de toda esta parte.
    const otra = key === 'ad7' ? 'ad8' : 'ad7'
    expect(container.textContent).not.toContain(COMPETITIONS[otra].id)
  })

  // Abrir un ámbito es elegirlo: si no, se seguirían leyendo las plazas y los
  // plazos de la otra convocatoria mientras se estudia ésta.
  it.each(ALL_FIELDS.map((f) => [f.id, f.competition] as const))(
    '/campo/%s elige ese ámbito y activa la %s',
    async (fieldId, expected) => {
      // Se parte siempre de un ámbito de la otra, para que el cambio ocurra.
      const otra = expected === 'ad7' ? 'ad8' : 'ad7'
      useStudyStore.setState({
        profile: { ...DEFAULT_PROFILE, field: COMPETITIONS[otra].userField },
      })
      const { container } = await visit(`/campo/${fieldId}`)
      await waitForContent(container, 'es')

      await waitFor(() => expect(useStudyStore.getState().profile.field).toBe(fieldId))
      expect(container.textContent).toContain(COMPETITIONS[expected].id)
    },
  )
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

  it.each(ALL_FIELDS.map((f) => f.id))(
    '/campo lleva directamente al ámbito elegido (%s)',
    async (fieldId) => {
      useStudyStore.setState({ profile: { ...DEFAULT_PROFILE, field: fieldId } })
      const { container } = await visit('/campo')
      await waitForContent(container, 'es')

      await waitFor(() => expect(window.location.hash).toBe(`#/campo/${fieldId}`))
      const field = ALL_FIELDS.find((f) => f.id === fieldId)!
      expect(container.textContent).toContain(field.label.es)
    },
  )

  it('sin nada elegido cae en el ámbito por defecto, no en una portada vacía', async () => {
    const { container } = await visit('/campo')
    await waitForContent(container, 'es')
    await waitFor(() => expect(window.location.hash).toBe(`#/campo/${DEFAULT_PROFILE.field}`))
  })

  it('la navegación enlaza los ámbitos dados de alta, de las dos convocatorias', async () => {
    // Esta lista es lo que sustituye al selector de convocatoria: si volviera
    // a enseñar sólo los de una, habría que cambiar de oposición entera para
    // llegar al campo de al lado.
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, field: 'cybersecurity', activeFields: ['data-science', 'cybersecurity'] },
    })
    const { container } = await visit('/campo')
    await waitForContent(container, 'es')

    expect(container.querySelector('a[href$="/campo/cybersecurity"]')).toBeTruthy()
    expect(container.querySelector('a[href$="/campo/data-science"]')).toBeTruthy()
  })

  it('el ámbito que se está mirando está siempre en el menú, dado de alta o no', async () => {
    // Se llega a un ámbito también por enlace directo. Si el menú no lo
    // contuviera, la página abierta no aparecería en ninguna parte de la
    // navegación y no habría forma de volver a ella.
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, field: 'cybersecurity', activeFields: ['cybersecurity'] },
    })
    const { container } = await visit('/campo/ict-infrastructure')
    await waitForContent(container, 'es')

    expect(container.querySelector('a[href$="/campo/ict-infrastructure"]')).toBeTruthy()
  })

  it('y no enlaza los que no se han dado de alta', async () => {
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, field: 'cybersecurity', activeFields: ['cybersecurity'] },
    })
    const { container } = await visit('/campo')
    await waitForContent(container, 'es')

    for (const f of ALL_FIELDS.filter((f) => f.id !== 'cybersecurity')) {
      expect(
        container.querySelector(`a[href$="/campo/${f.id}"]`),
        `${f.id} no está dado de alta y aun así se enlaza`,
      ).toBeNull()
    }
  })

  it('un ámbito sin curso no encuentra en Formación el temario de otro', async () => {
    // Enseñar aquí el curso de ciberseguridad a quien se presenta por IA sería
    // material equivocado presentado como suyo.
    const noCourse = COMPETITIONS.ad8.fields.find((f) => !hasCourse(f.id))!
    useStudyStore.setState({ profile: { ...DEFAULT_PROFILE, field: noCourse.id } })
    const { container } = await visit('/formacion')
    await waitForContent(container, 'es')

    expect(container.textContent).toContain(DICT.course_other_field.es)
    expect(container.textContent).not.toContain(DICT.nav_course.es + ' —')
  })

  it('y tampoco lo enlaza la navegación, ni dentro de su sección', async () => {
    const noCourse = COMPETITIONS.ad8.fields.find((f) => !hasCourse(f.id))!
    useStudyStore.setState({ profile: { ...DEFAULT_PROFILE, field: noCourse.id } })
    const { container } = await visit(`/campo/${noCourse.id}`)
    await waitForContent(container, 'es')
    expect(container.querySelector('a[href$="/formacion"]')).toBeNull()
  })

  it('con un ámbito que sí tiene curso, cuelga del test de ámbito', async () => {
    // Ya no es una fase a la misma altura: es material de apoyo del test de
    // ámbito, así que sólo aparece con esa sección abierta.
    useStudyStore.setState({ profile: { ...DEFAULT_PROFILE, field: 'cybersecurity' } })
    const { container } = await visit('/campo/cybersecurity')
    await waitForContent(container, 'es')
    expect(container.querySelector('a[href$="/formacion"]')).toBeTruthy()
  })
})

describe('la aplicación entera vive detrás de la puerta', () => {
  const sinCuenta = { started: true, userId: null, email: null, account: null, failure: null }

  it('sin sesión no se monta ninguna ruta', async () => {
    useAccountStore.setState(sinCuenta)
    const { container } = await visit('/progreso')
    expect(container.querySelector('nav')).toBeNull()
    expect(container.textContent).toContain(DICT.login_submit.es)
  })

  it('con la cuenta pendiente tampoco, aunque haya sesión', async () => {
    // Registrarse no da acceso: el contenido no llega a montarse.
    useAccountStore.setState({ ...sinCuenta, userId: 'u9', email: 'nuevo@ejemplo.es' })
    const { container } = await visit('/progreso')
    expect(container.querySelector('nav')).toBeNull()
    expect(container.textContent).toContain(DICT.access_pending_title.es)
  })

  it('si no se puede comprobar la cuenta, no se entra a ciegas', async () => {
    useAccountStore.setState({
      ...sinCuenta,
      userId: 'u9',
      email: 'yo@ejemplo.es',
      failure: "Could not find the table 'public.profiles'",
    })
    const { container } = await visit('/progreso')
    expect(container.querySelector('nav')).toBeNull()
    expect(container.textContent).toContain(DICT.access_unavailable_title.es)
    // Y se dice por qué, que es lo único que permite arreglarlo.
    expect(container.textContent).toContain("Could not find the table 'public.profiles'")
  })

  it('mientras se averigua si hay sesión no se enseña la puerta', async () => {
    // Enseñarla aquí la haría parpadear en cada recarga a quien ya está dentro.
    useAccountStore.setState({ ...sinCuenta, started: false })
    const { container } = await visit('/progreso')
    expect(container.querySelector('nav')).toBeNull()
    expect(container.textContent).not.toContain(DICT.login_submit.es)
  })
})

describe('lo del administrador no está para los demás', () => {
  it('un candidato que escriba /admin acaba en el panel', async () => {
    // No en una página vacía ni en un error: la ruta no existe para él.
    await visit('/admin')
    await waitFor(() => expect(window.location.hash).toBe('#/'))
  })

  it('y con /verificacion, igual', async () => {
    await visit('/verificacion')
    await waitFor(() => expect(window.location.hash).toBe('#/'))
  })

  it('al administrador sí le abren', async () => {
    comoAdmin()
    const { container } = await visit('/admin')
    await waitFor(() => expect(container.textContent).toContain(DICT.admin_title.es))
    expect(window.location.hash).toBe('#/admin')
  })

  it('un administrador revocado no llega ni al enrutador', async () => {
    // El papel sin el estado no basta en ninguna parte. Y revocado ni siquiera
    // se redirige al panel: no se monta ninguna ruta, se ve la pantalla de sin
    // acceso, que es lo que corresponde.
    const account = useAccountStore.getState().account!
    useAccountStore.setState({ account: { ...account, role: 'admin', status: 'revoked' } })
    const { container } = await visit('/admin')
    expect(container.textContent).toContain(DICT.access_revoked_title.es)
    expect(container.querySelector('nav')).toBeNull()
  })
})

describe('la barra lateral', () => {
  it('cuelga la formación del test de ámbito, no a su altura', async () => {
    useStudyStore.setState({ profile: { ...DEFAULT_PROFILE, field: 'cybersecurity' } })
    const { container } = await visit('/campo/cybersecurity')
    await waitForContent(container, 'es')

    const course = container.querySelector('a[href$="/formacion"]')!
    const field = container.querySelector('a[href$="/campo"]')!
    // El hijo vive dentro del bloque del padre, no como hermano suyo.
    expect(field.closest('div')?.parentElement?.contains(course)).toBe(true)
  })

  it('el desplegable se puede cerrar', async () => {
    useStudyStore.setState({ profile: { ...DEFAULT_PROFILE, field: 'cybersecurity' } })
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

describe('se pasa de un ámbito al de la otra convocatoria sin salir de la fase', () => {
  // Antes esto necesitaba un selector de convocatoria aparte, y dentro de esta
  // fase el selector estaba muerto: la URL del ámbito le devolvía la
  // convocatoria en el mismo render. Ahora es un enlace más de la lista.
  it('desde ciberseguridad se llega a ciencia de datos, y la AD7 con él', async () => {
    useStudyStore.setState({
      profile: {
        ...DEFAULT_PROFILE,
        field: 'cybersecurity',
        activeFields: ['data-science', 'cybersecurity'],
      },
    })
    const { container } = await visit('/campo/cybersecurity')
    await waitForContent(container, 'es')

    const link = container.querySelector<HTMLAnchorElement>('a[href$="/campo/data-science"]')!
    await act(async () => {
      link.click()
    })
    await waitFor(() => expect(window.location.hash).toBe('#/campo/data-science'))
    await waitFor(() => expect(useStudyStore.getState().profile.field).toBe('data-science'))
    expect(container.textContent).toContain(COMPETITIONS.ad7.id)
  })
})

describe('la verificación enseña el guion antes de correrlo', () => {
  it('lista todas sus secciones desde el primer momento', async () => {
    // Antes aparecían una a una según terminaban, así que no había forma de
    // saber cuántas faltaban ni distinguir «va bien» de «no ha llegado ahí».
    comoAdmin()
    const { container } = await visit('/verificacion')
    const sections = container.querySelectorAll('main [aria-expanded]')
    // Convocatorias + cada bloque de contenido + transversales + imágenes.
    expect(sections.length).toBe(CONTENT_TARGETS.length + 3)
  })

  it('las que todavía no ha corrido salen sin marcar', () => {
    // Contar secciones no basta: si aparecieran ya marcadas, el panel volvería
    // a no distinguir «ha pasado» de «no ha llegado a hacerse».
    //
    // Se mira el primer pintado. Antes se dejaba correr la comprobación dando
    // por hecho que las imágenes «no llegan a descargarse nunca», y no era
    // verdad: la sección arranca igual y pasa a «0 / 240», así que el test
    // fallaba una de cada tres veces según lo que hubiera avanzado.
    comoAdmin()
    const { container } = visitFirstPaint('/verificacion')
    const figures = [...container.querySelectorAll('main [aria-expanded]')].at(-1)!
    expect(figures.textContent).toContain(DICT.selfcheck_pending.es)
  })
})

describe('los recursos ya no esconden los de la otra convocatoria', () => {
  // Con el selector AD7/AD8 se ocultaban once de los treinta y tres enlaces, y
  // para llegar a ellos había que cambiar de oposición entera. Pero el
  // razonamiento y la redacción son el mismo examen en las dos, así que casi
  // todo ese material sirve igual.
  it('están todos los enlaces, sea cual sea el ámbito elegido', async () => {
    useStudyStore.setState({ profile: { ...DEFAULT_PROFILE, field: 'cybersecurity' } })
    const { container } = await visit('/recursos')
    await waitForContent(container, 'es')

    for (const link of REFERENCE_LINKS) {
      expect(
        container.querySelector(`a[href="${link.url}"]`),
        `${link.id} no aparece en recursos`,
      ).toBeTruthy()
    }
  })

  it('y los que son de una convocatoria concreta lo dicen', async () => {
    const { container } = await visit('/recursos')
    await waitForContent(container, 'es')

    const specific = REFERENCE_LINKS.find((l) => l.competition === 'ad7')!
    const row = container.querySelector(`a[href="${specific.url}"]`)!
    expect(row.textContent).toContain(COMPETITIONS.ad7.grade)
  })
})
