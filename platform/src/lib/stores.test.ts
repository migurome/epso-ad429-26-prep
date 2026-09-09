// Los stores guardan TODO lo que el usuario ha hecho, y lo guardan en el
// navegador: no hay servidor del que recuperarlo si se corrompen. Un fallo aquí
// no rompe la pantalla, se lleva el historial por delante.
//
// Interesa sobre todo la rehidratación: `persist` lee lo que quedó guardado de
// una versión anterior de la aplicación, y el `merge` de studyStore es lo que
// decide si un usuario con datos antiguos conserva sus ajustes o se encuentra
// campos vacíos.
import { describe, it, expect, beforeEach } from 'vitest'
import type { EssayAttempt, TestAttempt } from '../types/content'
import { useProgressStore } from './progressStore'
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  preferredFieldFor,
  useStudyStore,
  type CandidateProfile,
} from './studyStore'
import { useCompetitionStore } from './competitionStore'
import { useLocaleStore } from './localeStore'
import { useTestLocaleStore } from './testLocaleStore'
import { COMPETITIONS } from '../data/competition'
import { dayKey } from './studyCalendar'

function attempt(id: string, seconds = 600): TestAttempt {
  return {
    id,
    phase: 'reasoning',
    skill: 'verbal',
    startedAt: '2026-09-09T10:00:00.000Z',
    finishedAt: '2026-09-09T10:10:00.000Z',
    results: [],
    totalQuestions: 20,
    timeSpentSeconds: seconds,
  }
}

function essay(id: string): EssayAttempt {
  return {
    id,
    promptId: 'p1',
    startedAt: '2026-09-09T10:00:00.000Z',
    text: 'texto',
    timeSpentSeconds: 2400,
  }
}

beforeEach(() => {
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
  useStudyStore.setState({ profile: DEFAULT_PROFILE, settings: DEFAULT_SETTINGS, dayLog: {} })
})

describe('progressStore', () => {
  it('acumula los intentos sin perder los anteriores', () => {
    const { addTestAttempt } = useProgressStore.getState()
    addTestAttempt(attempt('a1'))
    addTestAttempt(attempt('a2'))
    expect(useProgressStore.getState().testAttempts.map((a) => a.id)).toEqual(['a1', 'a2'])
  })

  it('guarda tests y redacciones por separado', () => {
    useProgressStore.getState().addTestAttempt(attempt('a1'))
    useProgressStore.getState().addEssayAttempt(essay('e1'))
    const state = useProgressStore.getState()
    expect(state.testAttempts).toHaveLength(1)
    expect(state.essayAttempts).toHaveLength(1)
  })

  it('no muta el array anterior al añadir', () => {
    useProgressStore.getState().addTestAttempt(attempt('a1'))
    const before = useProgressStore.getState().testAttempts
    useProgressStore.getState().addTestAttempt(attempt('a2'))
    // Si mutara en vez de reemplazar, React no vería el cambio y el historial
    // no se repintaría hasta el siguiente render por otro motivo.
    expect(useProgressStore.getState().testAttempts).not.toBe(before)
    expect(before).toHaveLength(1)
  })

  it('clearAll vacía las dos colecciones', () => {
    useProgressStore.getState().addTestAttempt(attempt('a1'))
    useProgressStore.getState().addEssayAttempt(essay('e1'))
    useProgressStore.getState().clearAll()
    expect(useProgressStore.getState()).toMatchObject({ testAttempts: [], essayAttempts: [] })
  })
})

describe('studyStore — registro de uso', () => {
  it('acumula segundos en el día indicado', () => {
    const when = new Date(2026, 8, 9, 10)
    useStudyStore.getState().addActiveSeconds(15, when)
    useStudyStore.getState().addActiveSeconds(30, when)
    expect(useStudyStore.getState().dayLog[dayKey(when)]).toBe(45)
  })

  it('separa los días', () => {
    useStudyStore.getState().addActiveSeconds(60, new Date(2026, 8, 9))
    useStudyStore.getState().addActiveSeconds(90, new Date(2026, 8, 10))
    expect(useStudyStore.getState().dayLog).toEqual({ '2026-09-09': 60, '2026-09-10': 90 })
  })

  it('ignora incrementos nulos o negativos', () => {
    useStudyStore.getState().addActiveSeconds(0, new Date(2026, 8, 9))
    useStudyStore.getState().addActiveSeconds(-30, new Date(2026, 8, 9))
    expect(useStudyStore.getState().dayLog).toEqual({})
  })

  it('setDaySeconds corrige un día a mano', () => {
    useStudyStore.getState().addActiveSeconds(60, new Date(2026, 8, 9))
    useStudyStore.getState().setDaySeconds('2026-09-09', 3600)
    expect(useStudyStore.getState().dayLog['2026-09-09']).toBe(3600)
  })

  it('setDaySeconds a cero elimina el día en vez de dejar un cero', () => {
    useStudyStore.getState().setDaySeconds('2026-09-09', 3600)
    useStudyStore.getState().setDaySeconds('2026-09-09', 0)
    expect('2026-09-09' in useStudyStore.getState().dayLog).toBe(false)
  })

  it('clearDayLog no toca los ajustes ni el perfil', () => {
    useStudyStore.getState().updateSettings({ weeklyGoalHours: 12 })
    useStudyStore.getState().updateProfile({ displayName: 'Miguel' })
    useStudyStore.getState().addActiveSeconds(60, new Date(2026, 8, 9))
    useStudyStore.getState().clearDayLog()
    const state = useStudyStore.getState()
    expect(state.dayLog).toEqual({})
    expect(state.settings.weeklyGoalHours).toBe(12)
    expect(state.profile.displayName).toBe('Miguel')
  })
})

describe('studyStore — ajustes y perfil', () => {
  it('updateSettings fusiona en vez de reemplazar', () => {
    useStudyStore.getState().updateSettings({ weeklyGoalHours: 8 })
    const state = useStudyStore.getState().settings
    expect(state.weeklyGoalHours).toBe(8)
    expect(state.idleTimeoutMinutes).toBe(DEFAULT_SETTINGS.idleTimeoutMinutes)
    expect(state.trackUsage).toBe(DEFAULT_SETTINGS.trackUsage)
  })

  it('resetSettings vuelve a los valores por defecto sin borrar el registro', () => {
    useStudyStore.getState().addActiveSeconds(60, new Date(2026, 8, 9))
    useStudyStore.getState().updateSettings({ weeklyGoalHours: 30, trackUsage: false })
    useStudyStore.getState().resetSettings()
    expect(useStudyStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    expect(useStudyStore.getState().dayLog['2026-09-09']).toBe(60)
  })

  it('updateProfile fusiona y conserva el ámbito elegido en la otra convocatoria', () => {
    useStudyStore.getState().updateProfile({ preferredFields: { ad7: 'data-science' } })
    useStudyStore.getState().updateProfile({ displayName: 'Miguel' })
    const profile = useStudyStore.getState().profile
    expect(profile.displayName).toBe('Miguel')
    expect(profile.preferredFields.ad7).toBe('data-science')
  })

  it('el objetivo semanal por defecto es el del enunciado', () => {
    expect(DEFAULT_SETTINGS.weeklyGoalHours).toBe(5)
  })
})

describe('studyStore — rehidratación de datos antiguos', () => {
  // El `merge` de persist se ejecuta con lo que había guardado de una versión
  // anterior. Si no completara los campos nuevos, el usuario que ya usaba la
  // plataforma vería huecos en los ajustes y un objetivo semanal indefinido.
  const merge = useStudyStore.persist.getOptions().merge!

  it('completa los campos que una versión anterior no guardaba', () => {
    const merged = merge(
      { profile: { displayName: 'Miguel' }, dayLog: { '2026-09-01': 600 } },
      useStudyStore.getState(),
    ) as { profile: CandidateProfile; settings: typeof DEFAULT_SETTINGS; dayLog: Record<string, number> }

    expect(merged.profile.displayName).toBe('Miguel')
    expect(merged.profile.email).toBe('')
    expect(merged.profile.preferredFields).toEqual({})
    expect(merged.settings).toEqual(DEFAULT_SETTINGS)
    expect(merged.dayLog).toEqual({ '2026-09-01': 600 })
  })

  it('respeta los ajustes guardados y sólo rellena los que faltan', () => {
    const merged = merge({ settings: { weeklyGoalHours: 12 } }, useStudyStore.getState()) as {
      settings: typeof DEFAULT_SETTINGS
    }
    expect(merged.settings.weeklyGoalHours).toBe(12)
    expect(merged.settings.trackUsage).toBe(DEFAULT_SETTINGS.trackUsage)
  })

  it('sobrevive a un almacenamiento vacío o corrupto', () => {
    for (const stored of [undefined, null, {}]) {
      const merged = merge(stored, useStudyStore.getState()) as {
        settings: typeof DEFAULT_SETTINGS
        dayLog: Record<string, number>
      }
      expect(merged.settings).toEqual(DEFAULT_SETTINGS)
      expect(merged.dayLog).toEqual({})
    }
  })
})

describe('ámbito preferido', () => {
  it('usa el elegido cuando pertenece a la convocatoria', () => {
    const profile = { ...DEFAULT_PROFILE, preferredFields: { ad7: 'clouds-networks' as const } }
    expect(preferredFieldFor(profile, COMPETITIONS.ad7)).toBe('clouds-networks')
  })

  it('ignora un ámbito que no está convocado en esa convocatoria', () => {
    // 'cybersecurity' es de la AD8: si quedó guardado bajo ad7 por un cambio
    // de datos, hay que caer al ámbito de la convocatoria y no a uno inexistente.
    const profile = { ...DEFAULT_PROFILE, preferredFields: { ad7: 'cybersecurity' as const } }
    expect(preferredFieldFor(profile, COMPETITIONS.ad7)).toBe(COMPETITIONS.ad7.userField)
  })

  it('sin elección, usa el ámbito de la convocatoria', () => {
    expect(preferredFieldFor(DEFAULT_PROFILE, COMPETITIONS.ad8)).toBe(COMPETITIONS.ad8.userField)
  })
})

describe('stores de preferencias', () => {
  it('la convocatoria por defecto es la que sigue abierta', () => {
    expect(useCompetitionStore.getState().competition).toBe('ad8')
  })

  it('el idioma de la interfaz y el del examen son independientes', () => {
    useLocaleStore.getState().setLocale('en')
    useTestLocaleStore.getState().setLocale('es')
    expect(useLocaleStore.getState().locale).toBe('en')
    expect(useTestLocaleStore.getState().locale).toBe('es')
    useLocaleStore.getState().setLocale('es')
  })

  it('cada store persiste bajo su propia clave', () => {
    const names = [
      useProgressStore.persist.getOptions().name,
      useStudyStore.persist.getOptions().name,
      useCompetitionStore.persist.getOptions().name,
      useLocaleStore.persist.getOptions().name,
      useTestLocaleStore.persist.getOptions().name,
    ]
    expect(new Set(names).size).toBe(names.length)
    expect(names.every((n) => n?.startsWith('epso-prep-'))).toBe(true)
  })
})
