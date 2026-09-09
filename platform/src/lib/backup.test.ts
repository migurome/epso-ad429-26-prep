// El progreso vive en el `localStorage` de cada navegador, así que el PC y el
// móvil no comparten nada: el fichero exportado es el único puente. Lo que se
// asegura aquí es que ese puente no pierde trabajo y no lo inventa — que un
// fichero se puede leer, que combinar suma sin borrar, que reemplazar sustituye
// de verdad, y sobre todo que importar el mismo fichero dos veces deja el
// dispositivo exactamente igual que importarlo una.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  SNAPSHOT_FORMAT,
  applySnapshot,
  createSnapshot,
  describeSnapshot,
  mergeAnswers,
  mergeAttempts,
  mergeDayLog,
  readSnapshot,
  snapshotFilename,
  snapshotText,
  type Snapshot,
} from './backup'
import { useCompetitionStore } from './competitionStore'
import { useLocaleStore } from './localeStore'
import { usePracticeStore } from './practiceStore'
import { useProgressStore } from './progressStore'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, useStudyStore } from './studyStore'
import { useTestLocaleStore } from './testLocaleStore'
import type { TestAttempt } from '../types/content'

function test(id: string, startedAt: string): TestAttempt {
  return {
    id,
    phase: 'reasoning',
    startedAt,
    results: [],
    totalQuestions: 0,
    timeSpentSeconds: 60,
  }
}

/** Un dispositivo vacío, para que cada caso parta de lo mismo. */
function blank() {
  useStudyStore.setState({
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
    dayLog: {},
  })
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
  usePracticeStore.setState({ answers: {}, orderSeed: {} })
  useCompetitionStore.setState({ competition: 'ad8' })
  useLocaleStore.setState({ locale: 'es' })
  useTestLocaleStore.setState({ locale: 'es' })
}

/** Lo que trae el fichero del otro dispositivo. Se construye a mano y no con
 * `createSnapshot`, que leería los almacenes de ESTE y borraría el montaje del
 * caso justo antes de usarlo. */
const EMPTY_FILE: Snapshot = {
  app: 'epso-prep',
  format: SNAPSHOT_FORMAT,
  exportedAt: '2026-01-01T09:00:00.000Z',
  appVersion: '1.0',
  profile: DEFAULT_PROFILE,
  settings: DEFAULT_SETTINGS,
  dayLog: {},
  testAttempts: [],
  essayAttempts: [],
  practiceAnswers: {},
  practiceOrder: {},
  competition: 'ad8',
  uiLocale: 'es',
  testLocale: 'es',
}

function fileFrom(patch: Partial<Snapshot>): Snapshot {
  return { ...EMPTY_FILE, ...patch }
}

beforeEach(blank)

describe('el fichero', () => {
  it('recoge todo lo que el candidato no puede reconstruir de memoria', () => {
    useProgressStore.setState({ testAttempts: [test('t1', '2026-01-02')], essayAttempts: [] })
    usePracticeStore.setState({ answers: { q1: 'a' }, orderSeed: { banco: 7 } })
    useStudyStore.setState({ dayLog: { '2026-01-02': 900 } })
    useCompetitionStore.setState({ competition: 'ad7' })

    const snapshot = createSnapshot()

    expect(snapshot.testAttempts).toHaveLength(1)
    expect(snapshot.practiceAnswers).toEqual({ q1: 'a' })
    expect(snapshot.practiceOrder).toEqual({ banco: 7 })
    expect(snapshot.dayLog).toEqual({ '2026-01-02': 900 })
    expect(snapshot.competition).toBe('ad7')
  })

  it('se vuelve a leer tal cual salió', () => {
    useStudyStore.setState({ dayLog: { '2026-03-01': 1800 } })
    const result = readSnapshot(snapshotText(createSnapshot()))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.snapshot.dayLog).toEqual({ '2026-03-01': 1800 })
  })

  it('lleva la fecha en el nombre, para que varias copias se ordenen solas', () => {
    expect(snapshotFilename(new Date('2026-02-07T10:00:00Z'))).toBe('epso-prep-2026-02-07.json')
  })

  it('dice cuántas cosas trae', () => {
    const snapshot = fileFrom({
      testAttempts: [test('t1', '2026-01-01'), test('t2', '2026-01-02')],
      dayLog: { '2026-01-01': 60 },
      practiceAnswers: { q1: 'a', q2: 'b', q3: 'c' },
    })
    expect(describeSnapshot(snapshot)).toEqual({ tests: 2, essays: 0, days: 1, practice: 3 })
  })
})

describe('un fichero que no vale', () => {
  it('distingue lo que ni siquiera es JSON', () => {
    expect(readSnapshot('esto no es json')).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('distingue un JSON de otra cosa', () => {
    expect(readSnapshot('{"app":"otra-app","format":1}')).toEqual({ ok: false, reason: 'foreign' })
  })

  it('distingue el escrito por una versión posterior', () => {
    const future = JSON.stringify({ app: 'epso-prep', format: SNAPSHOT_FORMAT + 1 })
    expect(readSnapshot(future)).toEqual({ ok: false, reason: 'newer' })
  })

  it('a un fichero antiguo le rellena los campos que no existían', () => {
    const result = readSnapshot('{"app":"epso-prep","format":1}')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Sin esto la interfaz recibiría `undefined` donde espera listas y mapas.
    expect(result.snapshot.testAttempts).toEqual([])
    expect(result.snapshot.practiceAnswers).toEqual({})
    expect(result.snapshot.settings).toEqual(DEFAULT_SETTINGS)
  })
})

describe('combinar dos dispositivos', () => {
  it('se queda con los intentos de los dos, en orden de fecha', () => {
    const merged = mergeAttempts(
      [test('pc', '2026-01-03')],
      [test('movil', '2026-01-01')],
    )
    expect(merged.map((a) => a.id)).toEqual(['movil', 'pc'])
  })

  it('no duplica un intento que ya estaba', () => {
    const merged = mergeAttempts([test('t1', '2026-01-01')], [test('t1', '2026-01-01')])
    expect(merged).toHaveLength(1)
  })

  it('en el calendario se queda con el mayor de los dos, no con la suma', () => {
    // La suma sería más fiel el día que de verdad se estudie en los dos sitios,
    // pero haría que reimportar el mismo fichero inflara el calendario.
    expect(mergeDayLog({ dia: 600 }, { dia: 900 })).toEqual({ dia: 900 })
    expect(mergeDayLog({ dia: 900 }, { dia: 600 })).toEqual({ dia: 900 })
  })

  it('trae los días que aquí no había', () => {
    expect(mergeDayLog({ lunes: 60 }, { martes: 120 })).toEqual({ lunes: 60, martes: 120 })
  })

  it('ante la misma pregunta respondida distinto, manda este dispositivo', () => {
    // Reescribir en silencio una respuesta que está en pantalla desconcierta
    // más que dejar fuera la del fichero.
    expect(mergeAnswers({ q1: 'aqui' }, { q1: 'alli', q2: 'nueva' })).toEqual({
      q1: 'aqui',
      q2: 'nueva',
    })
  })

  it('suma el trabajo de los dos y dice qué ha entrado', () => {
    useProgressStore.setState({ testAttempts: [test('pc', '2026-01-03')], essayAttempts: [] })
    usePracticeStore.setState({ answers: { q1: 'a' }, orderSeed: {} })
    useStudyStore.setState({ dayLog: { '2026-01-03': 600 } })

    const added = applySnapshot(
      fileFrom({
        testAttempts: [test('movil', '2026-01-01')],
        practiceAnswers: { q1: 'a', q2: 'b' },
        dayLog: { '2026-01-01': 300 },
      }),
      'merge',
    )

    expect(added).toEqual({ tests: 1, essays: 0, days: 1, practice: 1 })
    expect(useProgressStore.getState().testAttempts.map((a) => a.id)).toEqual(['movil', 'pc'])
    expect(useStudyStore.getState().dayLog).toEqual({ '2026-01-01': 300, '2026-01-03': 600 })
  })

  it('no toca los ajustes de este dispositivo', () => {
    // El candidato está recuperando su trabajo, no pidiendo que le cambien la
    // convocatoria ni el idioma bajo los pies.
    useStudyStore.setState({ settings: { ...DEFAULT_SETTINGS, weeklyGoalHours: 12 } })
    applySnapshot(
      fileFrom({
        settings: { ...DEFAULT_SETTINGS, weeklyGoalHours: 3 },
        competition: 'ad7',
        uiLocale: 'en',
      }),
      'merge',
    )
    expect(useStudyStore.getState().settings.weeklyGoalHours).toBe(12)
    expect(useCompetitionStore.getState().competition).toBe('ad8')
    expect(useLocaleStore.getState().locale).toBe('es')
  })

  it('no reordena un banco que ya se estaba trabajando aquí', () => {
    usePracticeStore.setState({ answers: {}, orderSeed: { banco: 111 } })
    applySnapshot(fileFrom({ practiceOrder: { banco: 999, otro: 222 } }), 'merge')
    expect(usePracticeStore.getState().orderSeed).toEqual({ banco: 111, otro: 222 })
  })

  it('importar el mismo fichero dos veces deja el dispositivo igual', () => {
    // Éste es el flujo real: se va y se viene entre dos dispositivos muchas
    // veces. Si la segunda pasada cambiara algo, el calendario y el histórico
    // se irían separando de la verdad un poco más cada semana.
    const file = fileFrom({
      testAttempts: [test('t1', '2026-01-01')],
      dayLog: { '2026-01-01': 900 },
      practiceAnswers: { q1: 'a' },
    })
    blank()

    applySnapshot(file, 'merge')
    const once = snapshotText(createSnapshot())
    const second = applySnapshot(file, 'merge')

    expect(second).toEqual({ tests: 0, essays: 0, days: 0, practice: 0 })
    expect(stripDate(snapshotText(createSnapshot()))).toEqual(stripDate(once))
  })
})

describe('reemplazar', () => {
  it('deja el dispositivo como copia exacta del fichero', () => {
    useProgressStore.setState({ testAttempts: [test('mio', '2026-01-05')], essayAttempts: [] })
    useStudyStore.setState({ dayLog: { '2026-01-05': 600 } })

    const summary = applySnapshot(
      fileFrom({
        testAttempts: [test('del-fichero', '2026-01-01')],
        dayLog: { '2026-01-01': 300 },
      }),
      'replace',
    )

    expect(summary.tests).toBe(1)
    expect(useProgressStore.getState().testAttempts.map((a) => a.id)).toEqual(['del-fichero'])
    expect(useStudyStore.getState().dayLog).toEqual({ '2026-01-01': 300 })
  })

  it('sí trae los ajustes, la convocatoria y los idiomas', () => {
    applySnapshot(
      fileFrom({
        settings: { ...DEFAULT_SETTINGS, weeklyGoalHours: 9 },
        competition: 'ad7',
        uiLocale: 'en',
        testLocale: 'en',
      }),
      'replace',
    )
    expect(useStudyStore.getState().settings.weeklyGoalHours).toBe(9)
    expect(useCompetitionStore.getState().competition).toBe('ad7')
    expect(useLocaleStore.getState().locale).toBe('en')
    expect(useTestLocaleStore.getState().locale).toBe('en')
  })
})

/** La hora de exportación cambia en cada llamada; el resto no debería. */
function stripDate(text: string): string {
  return text.replace(/"exportedAt": "[^"]*"/, '')
}

describe('el texto del fichero', () => {
  it('sale y vuelve idéntico, campo a campo', () => {
    // Redonda completa: lo exportado tiene que reconstruirse entero, no «casi».
    // Un campo que se pierda en la ida no se nota hasta que hace falta.
    useProgressStore.setState({
      testAttempts: [test('t1', '2026-01-01')],
      essayAttempts: [
        {
          id: 'e1',
          promptId: 'p1',
          startedAt: '2026-01-02',
          text: 'Texto de la redacción, que puede ser largo.',
          timeSpentSeconds: 2400,
        },
      ],
    })
    usePracticeStore.setState({ answers: { q1: 'a' }, orderSeed: { banco: 42 } })
    useStudyStore.setState({
      profile: { ...DEFAULT_PROFILE, displayName: 'Miguel', targetExamDate: '2026-06-01' },
      settings: { ...DEFAULT_SETTINGS, weeklyGoalHours: 8 },
      dayLog: { '2026-01-01': 1200 },
    })
    useCompetitionStore.setState({ competition: 'ad7' })
    useTestLocaleStore.setState({ locale: 'en' })

    const original = createSnapshot()
    const result = readSnapshot(snapshotText(original))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.snapshot).toEqual(original)
  })

  it('es JSON legible por una persona, no una sola línea', () => {
    // Se abre en el móvil, se manda por WhatsApp y a veces se mira. Que se
    // pueda leer cuesta unos bytes y ahorra un misterio el día que algo falle.
    expect(snapshotText(createSnapshot())).toContain('\n')
  })

  it('el texto de una redacción viaja entero', () => {
    const largo = 'palabra '.repeat(500).trim()
    useProgressStore.setState({
      testAttempts: [],
      essayAttempts: [
        { id: 'e1', promptId: 'p1', startedAt: '2026-01-02', text: largo, timeSpentSeconds: 60 },
      ],
    })
    const result = readSnapshot(snapshotText(createSnapshot()))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.snapshot.essayAttempts[0].text).toBe(largo)
  })
})

describe('un fichero con basura dentro', () => {
  it('descarta los días cuyo valor no es un número', () => {
    const result = readSnapshot(
      JSON.stringify({
        app: 'epso-prep',
        format: SNAPSHOT_FORMAT,
        dayLog: { bueno: 600, texto: 'mucho', nulo: null, infinito: Infinity },
      }),
    )
    expect(result.ok).toBe(true)
    // `Infinity` no sobrevive a JSON (sale `null`), y los otros dos se filtran:
    // un calendario con un `undefined` dentro rompe la suma de la semana.
    if (result.ok) expect(result.snapshot.dayLog).toEqual({ bueno: 600 })
  })

  it('descarta las respuestas que no son texto', () => {
    const result = readSnapshot(
      JSON.stringify({
        app: 'epso-prep',
        format: SNAPSHOT_FORMAT,
        practiceAnswers: { q1: 'a', q2: 7, q3: { raro: true } },
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.snapshot.practiceAnswers).toEqual({ q1: 'a' })
  })

  it('una convocatoria que no existe cae en la de por defecto', () => {
    const result = readSnapshot(
      JSON.stringify({ app: 'epso-prep', format: SNAPSHOT_FORMAT, competition: 'ad99' }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.snapshot.competition).toBe('ad8')
  })

  it('un idioma que no existe cae en español', () => {
    const result = readSnapshot(
      JSON.stringify({ app: 'epso-prep', format: SNAPSHOT_FORMAT, uiLocale: 'klingon' }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.snapshot.uiLocale).toBe('es')
  })

  it('una lista que viene como objeto no revienta la importación', () => {
    const result = readSnapshot(
      JSON.stringify({ app: 'epso-prep', format: SNAPSHOT_FORMAT, testAttempts: { no: 'soy lista' } }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.snapshot.testAttempts).toEqual([])
  })
})

describe('cargar sobre un dispositivo vacío', () => {
  it('combinar en un dispositivo limpio trae todo el fichero', () => {
    // El caso del móvil recién estrenado: no hay nada con lo que fusionar, así
    // que combinar tiene que dejarlo exactamente como el ordenador.
    const file = fileFrom({
      testAttempts: [test('t1', '2026-01-01'), test('t2', '2026-01-02')],
      essayAttempts: [
        { id: 'e1', promptId: 'p1', startedAt: '2026-01-03', text: 'algo', timeSpentSeconds: 90 },
      ],
      dayLog: { '2026-01-01': 600, '2026-01-02': 900 },
      practiceAnswers: { q1: 'a', q2: 'b' },
    })

    expect(applySnapshot(file, 'merge')).toEqual({ tests: 2, essays: 1, days: 2, practice: 2 })
    expect(describeSnapshot(createSnapshot())).toEqual(describeSnapshot(file))
  })

  it('reemplazar con un fichero vacío deja el dispositivo vacío', () => {
    // Es destructivo a propósito, y por eso en pantalla va detrás de un aviso.
    useProgressStore.setState({ testAttempts: [test('t1', '2026-01-01')], essayAttempts: [] })
    useStudyStore.setState({ dayLog: { '2026-01-01': 600 } })

    applySnapshot(fileFrom({}), 'replace')

    expect(useProgressStore.getState().testAttempts).toEqual([])
    expect(useStudyStore.getState().dayLog).toEqual({})
  })

  it('las redacciones se combinan por id, como los tests', () => {
    useProgressStore.setState({
      testAttempts: [],
      essayAttempts: [
        { id: 'aqui', promptId: 'p1', startedAt: '2026-01-05', text: 'mía', timeSpentSeconds: 60 },
      ],
    })
    const added = applySnapshot(
      fileFrom({
        essayAttempts: [
          { id: 'aqui', promptId: 'p1', startedAt: '2026-01-05', text: 'mía', timeSpentSeconds: 60 },
          { id: 'alli', promptId: 'p2', startedAt: '2026-01-04', text: 'otra', timeSpentSeconds: 60 },
        ],
      }),
      'merge',
    )
    expect(added.essays).toBe(1)
    expect(useProgressStore.getState().essayAttempts.map((e) => e.id)).toEqual(['alli', 'aqui'])
  })
})
