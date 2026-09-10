// Formación es una sección entera —portada, doce módulos, teoría, banco y
// simulacro por módulo— y estaba prácticamente sin probar: 21% de la portada y
// 15% de la página de módulo. Justo ahí viven dos guardas que deciden si el
// candidato ve algo o se va a otra parte (el ámbito elegido tiene curso o no; el
// módulo de la URL existe o no) y una regla que inventa el formato del
// simulacro a partir del tamaño del módulo.
//
// Se monta sobre el contenido real, no sobre un doble: el curso se genera desde
// Docs/ y lo que importa es que la portada y los módulos encajen con lo que el
// generador produce de verdad.
import { Suspense } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CoursePage } from './CoursePage'
import { CourseModulePage } from './CourseModulePage'
import { useCompetitionStore } from '../lib/competitionStore'
import { useLocaleStore } from '../lib/localeStore'
import { useProgressStore } from '../lib/progressStore'
import { usePracticeStore } from '../lib/practiceStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, useStudyStore } from '../lib/studyStore'
import { loadCourseContent } from '../data/contentLoader'
import { courseModules, moduleNumber } from '../lib/course'
import { FIELD_MCQ_FORMAT } from '../data/competition'
import { DICT } from '../lib/dictionary'
import type { Field } from '../types/content'

const es = (key: keyof typeof DICT) => DICT[key].es
const FALLBACK = 'cargando-curso'

/** El curso existe para ciberseguridad, que es de la AD8. Elegir el ámbito por
 * el perfil (y no tocando la convocatoria) es como lo hace la aplicación. */
function chooseField(field: Field, competition: 'ad7' | 'ad8') {
  useCompetitionStore.setState({ competition })
  useStudyStore.setState({
    profile: { ...DEFAULT_PROFILE, preferredFields: { [competition]: field } },
    settings: { ...DEFAULT_SETTINGS },
    dayLog: {},
  })
}

async function mount(ui: React.ReactNode, path = '/formacion') {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <MemoryRouter initialEntries={[path]}>
        <Suspense fallback={<div>{FALLBACK}</div>}>
          <Routes>
            <Route path="/formacion" element={<CoursePage />} />
            <Route path="/formacion/:moduleId" element={<CourseModulePage />} />
            {ui}
          </Routes>
        </Suspense>
      </MemoryRouter>,
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

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useTestLocaleStore.setState({ locale: 'es' })
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
  usePracticeStore.setState({ answers: {}, orderSeed: {} })
  chooseField('cybersecurity', 'ad8')
})

afterEach(cleanup)

describe('la portada del curso se ciñe al ámbito elegido', () => {
  it('con ciberseguridad enseña los módulos', async () => {
    const { container } = await mount(null)
    expect(screen.getByText(es('course_title'))).toBeTruthy()
    expect(container.querySelectorAll('ol > li').length).toBeGreaterThanOrEqual(12)
  })

  it('con otro ámbito dice que el curso no es para el suyo', async () => {
    // Enseñarle un temario de ciberseguridad a quien se presenta por ciencia de
    // datos es material que no le toca compitiendo por su atención.
    chooseField('data-science', 'ad7')
    await mount(null)
    expect(screen.getByText(es('course_empty_title'))).toBeTruthy()
    expect(screen.getByText(es('course_other_field'))).toBeTruthy()
  })

  it('con otro ámbito no llega a pedir el bloque de contenido', async () => {
    // La guarda va FUERA del componente que carga: si estuviera dentro, se
    // descargarían cientos de kilobytes para no enseñarlos.
    chooseField('ict-infrastructure', 'ad7')
    const { container } = await mount(null)
    expect(container.textContent).not.toContain(FALLBACK)
    expect(container.querySelector('ol')).toBeNull()
  })

  it('cada módulo enlaza a su propia página, numerado', async () => {
    const { container } = await mount(null)
    const enlaces = [...container.querySelectorAll('ol a')].map((a) => a.getAttribute('href'))
    expect(enlaces[0]).toBe('/formacion/1')
    expect(new Set(enlaces).size).toBe(enlaces.length)
  })

  it('los números de módulo van en orden y sin huecos', async () => {
    const { QUESTIONS, THEORY_DOCS } = await loadCourseContent('cybersecurity')
    const numeros = courseModules(THEORY_DOCS, QUESTIONS).map((m) => moduleNumber(m.doc.id))
    expect(numeros).toEqual(numeros.map((_, i) => i + 1))
  })

  it('la introducción del curso se pinta antes de la lista', async () => {
    const { container } = await mount(null)
    const intro = container.querySelector('section')
    expect(intro).toBeTruthy()
    expect(intro!.textContent!.length).toBeGreaterThan(200)
  })

  it('el resumen cuenta módulos y preguntas de verdad', async () => {
    const { QUESTIONS, THEORY_DOCS } = await loadCourseContent('cybersecurity')
    const modules = courseModules(THEORY_DOCS, QUESTIONS)
    const { container } = await mount(null)
    expect(container.textContent).toContain(String(modules.length))
    expect(container.textContent).toContain(String(QUESTIONS.length))
  })

  it('en inglés la portada sale en inglés', async () => {
    useLocaleStore.setState({ locale: 'en' })
    await mount(null)
    expect(screen.getByText(DICT.course_title.en)).toBeTruthy()
  })
})

describe('la página de un módulo', () => {
  it('enseña el módulo pedido con su posición en el curso', async () => {
    await mount(null, '/formacion/3')
    expect(screen.getByText(/Módulo 3 de \d+/)).toBeTruthy()
  })

  it('ofrece teoría, banco de práctica y test cronometrado', async () => {
    await mount(null, '/formacion/1')
    expect(screen.getByRole('button', { name: es('tab_theory') })).toBeTruthy()
    expect(screen.getByRole('button', { name: new RegExp(es('tab_practice_bank')) })).toBeTruthy()
    expect(screen.getByRole('button', { name: es('tab_timed_test') })).toBeTruthy()
  })

  it('el banco del módulo dice cuántas preguntas trae', async () => {
    const { QUESTIONS, THEORY_DOCS } = await loadCourseContent('cybersecurity')
    const primero = courseModules(THEORY_DOCS, QUESTIONS)[0]
    await mount(null, '/formacion/1')
    expect(
      screen.getByRole('button', {
        name: `${es('tab_practice_bank')} (${primero.questions.length})`,
      }),
    ).toBeTruthy()
  })

  it('un módulo que no existe devuelve a la portada', async () => {
    // La URL la escribe cualquiera; sin esta guarda se leería `undefined` y la
    // página quedaría en blanco.
    await mount(null, '/formacion/99')
    expect(screen.getByText(es('course_title'))).toBeTruthy()
    expect(screen.queryByText(/Módulo \d+ de/)).toBeNull()
    expect(screen.queryByRole('button', { name: es('tab_theory') })).toBeNull()
  })

  it('un módulo que no es un número devuelve a la portada', async () => {
    await mount(null, '/formacion/pepito')
    expect(screen.queryByRole('button', { name: es('tab_theory') })).toBeNull()
  })

  it('con un ámbito sin curso devuelve a la portada, que es donde se explica', async () => {
    chooseField('data-science', 'ad7')
    await mount(null, '/formacion/1')
    expect(screen.getByText(es('course_other_field'))).toBeTruthy()
  })
})

describe('navegación entre módulos', () => {
  it('el primero no tiene anterior: ofrece volver a la lista', async () => {
    const { container } = await mount(null, '/formacion/1')
    const nav = container.querySelector('nav')!
    expect(nav.textContent).toContain(es('course_all_modules'))
  })

  it('un módulo intermedio enlaza al anterior y al siguiente', async () => {
    const { container } = await mount(null, '/formacion/5')
    const destinos = [...container.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))
    expect(destinos).toContain('/formacion/4')
    expect(destinos).toContain('/formacion/6')
  })

  it('el último no ofrece siguiente', async () => {
    const { QUESTIONS, THEORY_DOCS } = await loadCourseContent('cybersecurity')
    const total = courseModules(THEORY_DOCS, QUESTIONS).length
    const { container } = await mount(null, `/formacion/${total}`)
    const destinos = [...container.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))
    expect(destinos).toContain(`/formacion/${total - 1}`)
    expect(destinos).not.toContain(`/formacion/${total + 1}`)
  })
})

describe('el simulacro se ajusta al tamaño del módulo', () => {
  /** Lo que el simulacro del módulo promete al candidato antes de empezar. */
  async function announced(moduleId: number) {
    const { container } = await mount(null, `/formacion/${moduleId}`)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: es('tab_timed_test') }))
    })
    const frase = container.textContent!.match(/(\d+) preguntas en (\d+) minutos/)
    expect(frase).toBeTruthy()
    return { questions: Number(frase![1]), minutes: Number(frase![2]) }
  }

  it('no promete el examen de campo entero para un módulo corto', async () => {
    // El formato real son 30 preguntas en 40 minutos. Un módulo de diez no
    // puede llenar eso, y anunciarlo daría una idea falsa del ritmo de examen.
    const { questions, minutes } = await announced(1)
    expect(questions).toBeLessThan(FIELD_MCQ_FORMAT.questions)
    expect(minutes).toBeLessThan(FIELD_MCQ_FORMAT.minutes)
  })

  it('cronometra en proporción al número de preguntas del módulo', async () => {
    const { questions, minutes } = await announced(1)
    const proporcional = Math.round(
      (FIELD_MCQ_FORMAT.minutes / FIELD_MCQ_FORMAT.questions) * questions,
    )
    expect(minutes).toBe(Math.max(5, proporcional))
  })

  it('nunca baja de cinco minutos, por corto que sea el módulo', async () => {
    // Proporcional a secas podría dar dos o tres minutos, que no es un
    // simulacro sino un susto.
    const { minutes } = await announced(1)
    expect(minutes).toBeGreaterThanOrEqual(5)
  })

  it('anuncia tantas preguntas como tiene el módulo, ni una más', async () => {
    const { QUESTIONS, THEORY_DOCS } = await loadCourseContent('cybersecurity')
    const primero = courseModules(THEORY_DOCS, QUESTIONS)[0]
    const { questions } = await announced(1)
    expect(questions).toBe(primero.questions.length)
  })

  it('dos módulos de distinto tamaño no comparten cronómetro', async () => {
    const { QUESTIONS, THEORY_DOCS } = await loadCourseContent('cybersecurity')
    const modules = courseModules(THEORY_DOCS, QUESTIONS)
    const distinto = modules.findIndex((m) => m.questions.length !== modules[0].questions.length)
    if (distinto === -1) return // todos iguales: nada que distinguir

    const primero = await announced(1)
    const otro = await announced(distinto + 1)
    expect(otro.questions).not.toBe(primero.questions)
  })
})
