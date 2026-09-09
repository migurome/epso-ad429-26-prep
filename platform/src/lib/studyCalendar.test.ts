// El calendario es aritmética de fechas, que es donde se esconden los errores
// que nadie ve hasta que el resultado ya está mal: semanas que empiezan en el
// día equivocado, actividad de la noche contada en el día siguiente, y tiempo
// contado dos veces porque un test ocurre dentro del tiempo de uso.
import { describe, it, expect } from 'vitest'
import type { EssayAttempt, TestAttempt } from '../types/content'
import {
  addDays,
  buildMonth,
  completedWeekStreak,
  currentWeek,
  dayKey,
  formatDuration,
  startOfWeek,
  toEvents,
  type CalendarInput,
} from './studyCalendar'

/** Un intento cerrado a una hora local concreta. */
function test_(at: string, seconds: number, extra: Partial<TestAttempt> = {}): TestAttempt {
  return {
    id: `t-${at}-${seconds}`,
    phase: 'reasoning',
    skill: 'verbal',
    startedAt: at,
    finishedAt: at,
    results: [{ questionId: 'q1', selectedOptionId: 'A', correct: true }],
    totalQuestions: 1,
    timeSpentSeconds: seconds,
    ...extra,
  }
}

function essay_(at: string, seconds: number, text = 'una dos tres'): EssayAttempt {
  return { id: `e-${at}`, promptId: 'p1', startedAt: at, finishedAt: at, text, timeSpentSeconds: seconds }
}

/** Fecha local, sin que la zona horaria la mueva de día. */
function local(y: number, m: number, d: number, h = 12, min = 0): Date {
  return new Date(y, m - 1, d, h, min)
}

const EMPTY: CalendarInput = { tests: [], essays: [], dayLog: {}, weeklyGoalHours: 5 }

describe('semanas', () => {
  it('empiezan en lunes', () => {
    // 2026-09-09 es miércoles.
    expect(dayKey(startOfWeek(local(2026, 9, 9)))).toBe('2026-09-07')
    // Un domingo pertenece a la semana que empezó el lunes anterior, no a la
    // siguiente: es el error clásico de usar getDay() sin rotar.
    expect(dayKey(startOfWeek(local(2026, 9, 13)))).toBe('2026-09-07')
    expect(dayKey(startOfWeek(local(2026, 9, 14)))).toBe('2026-09-14')
  })

  it('el lunes es su propio inicio de semana', () => {
    expect(dayKey(startOfWeek(local(2026, 9, 7)))).toBe('2026-09-07')
  })
})

describe('agrupación por día', () => {
  it('usa la fecha local, no UTC', () => {
    // A las 23:30 en España es ya el día siguiente en UTC. La actividad tiene
    // que quedar registrada en el día que el candidato ha vivido.
    const at = local(2026, 9, 9, 23, 30).toISOString()
    const [event] = toEvents([test_(at, 600)], [])
    expect(dayKey(new Date(event.at))).toBe('2026-09-09')
  })

  it('prefiere el cierre al inicio', () => {
    const [event] = toEvents(
      [
        {
          ...test_(local(2026, 9, 9).toISOString(), 60),
          startedAt: local(2026, 9, 8).toISOString(),
          finishedAt: local(2026, 9, 9).toISOString(),
        },
      ],
      [],
    )
    expect(dayKey(new Date(event.at))).toBe('2026-09-09')
  })
})

describe('tiempo de un día', () => {
  const day = '2026-09-09'
  const at = local(2026, 9, 9, 10).toISOString()

  function dayOf(input: CalendarInput) {
    return buildMonth(2026, 8, input)
      .flatMap((w) => w.days)
      .find((d) => d.key === day)!
  }

  it('no suma el tiempo del test al tiempo de uso: el test ocurre dentro', () => {
    const d = dayOf({
      ...EMPTY,
      tests: [test_(at, 1800)],
      dayLog: { [day]: 3600 },
      now: local(2026, 9, 9),
    })
    expect(d.activeSeconds).toBe(3600)
    expect(d.eventSeconds).toBe(1800)
    // Lo que cuenta son 3600, no 5400.
    expect(d.seconds).toBe(3600)
  })

  it('si el seguimiento se quedó corto, manda el tiempo de los tests', () => {
    const d = dayOf({
      ...EMPTY,
      tests: [test_(at, 2400)],
      dayLog: { [day]: 600 },
      now: local(2026, 9, 9),
    })
    expect(d.seconds).toBe(2400)
  })

  it('cuenta el uso aunque no haya ningún test', () => {
    const d = dayOf({ ...EMPTY, dayLog: { [day]: 5400 }, now: local(2026, 9, 9) })
    expect(d.seconds).toBe(5400)
    expect(d.events).toEqual([])
  })
})

describe('objetivo semanal', () => {
  it('se cumple al alcanzar las horas configuradas', () => {
    const now = local(2026, 9, 9)
    const week = currentWeek({
      ...EMPTY,
      weeklyGoalHours: 5,
      dayLog: { '2026-09-07': 3 * 3600, '2026-09-08': 2 * 3600 },
      now,
    })
    expect(week.seconds).toBe(5 * 3600)
    expect(week.complete).toBe(true)
    expect(week.ratio).toBe(1)
  })

  it('no se cumple por debajo, y el progreso es proporcional', () => {
    const week = currentWeek({
      ...EMPTY,
      weeklyGoalHours: 5,
      dayLog: { '2026-09-07': 2.5 * 3600 },
      now: local(2026, 9, 9),
    })
    expect(week.complete).toBe(false)
    expect(week.ratio).toBeCloseTo(0.5)
  })

  it('subir el objetivo puede descumplir una semana ya cumplida', () => {
    const dayLog = { '2026-09-07': 5 * 3600 }
    const now = local(2026, 9, 9)
    expect(currentWeek({ ...EMPTY, weeklyGoalHours: 5, dayLog, now }).complete).toBe(true)
    expect(currentWeek({ ...EMPTY, weeklyGoalHours: 8, dayLog, now }).complete).toBe(false)
  })

  it('el progreso nunca pasa del 100 % aunque se estudie de más', () => {
    const week = currentWeek({
      ...EMPTY,
      weeklyGoalHours: 5,
      dayLog: { '2026-09-07': 20 * 3600 },
      now: local(2026, 9, 9),
    })
    expect(week.ratio).toBe(1)
  })

  it('la actividad de la semana anterior no cuenta para la actual', () => {
    const week = currentWeek({
      ...EMPTY,
      weeklyGoalHours: 5,
      dayLog: { '2026-09-06': 10 * 3600 }, // domingo anterior
      now: local(2026, 9, 9),
    })
    expect(week.seconds).toBe(0)
  })
})

describe('racha de semanas cumplidas', () => {
  const now = local(2026, 9, 9) // miércoles

  it('cuenta las semanas anteriores cumplidas', () => {
    const dayLog = {
      '2026-08-31': 5 * 3600, // semana del 31/08
      '2026-09-01': 1 * 3600,
      '2026-08-24': 6 * 3600, // semana del 24/08
    }
    expect(completedWeekStreak({ ...EMPTY, dayLog, now })).toBe(2)
  })

  it('la semana en curso a medias no rompe la racha de las anteriores', () => {
    const dayLog = { '2026-09-07': 1 * 3600, '2026-08-31': 5 * 3600 }
    expect(completedWeekStreak({ ...EMPTY, dayLog, now })).toBe(1)
  })

  it('una semana anterior incumplida corta la racha', () => {
    const dayLog = {
      '2026-08-31': 1 * 3600, // incumplida
      '2026-08-24': 6 * 3600, // cumplida, pero ya no cuenta
    }
    expect(completedWeekStreak({ ...EMPTY, dayLog, now })).toBe(0)
  })

  it('sin objetivo no hay racha', () => {
    expect(completedWeekStreak({ ...EMPTY, weeklyGoalHours: 0, now })).toBe(0)
  })
})

describe('rejilla del mes', () => {
  it('cubre el mes entero con semanas completas de siete días', () => {
    const weeks = buildMonth(2026, 8, { ...EMPTY, now: local(2026, 9, 9) }) // septiembre
    expect(weeks.every((w) => w.days.length === 7)).toBe(true)
    // Septiembre de 2026 empieza en martes y acaba en miércoles.
    expect(weeks[0].days[0].key).toBe('2026-08-31')
    expect(weeks.at(-1)!.days.at(-1)!.key).toBe('2026-10-04')
    const inMonth = weeks.flatMap((w) => w.days).filter((d) => d.inMonth)
    expect(inMonth).toHaveLength(30)
  })

  it('marca hoy, el futuro y los días de relleno', () => {
    const weeks = buildMonth(2026, 8, { ...EMPTY, now: local(2026, 9, 9) })
    const days = weeks.flatMap((w) => w.days)
    expect(days.filter((d) => d.isToday).map((d) => d.key)).toEqual(['2026-09-09'])
    expect(days.find((d) => d.key === '2026-09-10')!.isFuture).toBe(true)
    expect(days.find((d) => d.key === '2026-09-09')!.isFuture).toBe(false)
    expect(days.find((d) => d.key === '2026-08-31')!.inMonth).toBe(false)
  })

  it('no reprocha un 0 % a las semanas que todavía no han llegado', () => {
    const weeks = buildMonth(2026, 8, { ...EMPTY, now: local(2026, 9, 9) })
    // La semana en curso (7–13 de septiembre) contiene hoy y no es futura.
    expect(weeks.find((w) => w.key === '2026-09-07')!.isFuture).toBe(false)
    // Las siguientes sí, y la interfaz las deja en blanco en vez de en cero.
    expect(weeks.find((w) => w.key === '2026-09-14')!.isFuture).toBe(true)
    expect(weeks.find((w) => w.key === '2026-08-31')!.isFuture).toBe(false)
  })

  it('funciona en un cambio de año', () => {
    const weeks = buildMonth(2026, 11, { ...EMPTY, now: local(2026, 12, 15) }) // diciembre
    const days = weeks.flatMap((w) => w.days)
    expect(days.filter((d) => d.inMonth)).toHaveLength(31)
    expect(days.at(-1)!.date.getFullYear()).toBe(2027)
  })
})

describe('etiquetado de la actividad', () => {
  it('nombra la destreza de razonamiento y puntúa sobre su máximo', () => {
    const attempt: TestAttempt = {
      ...test_(local(2026, 9, 9).toISOString(), 900),
      skill: 'verbal',
      totalQuestions: 20,
      results: Array.from({ length: 20 }, (_, i) => ({
        questionId: `q${i}`,
        selectedOptionId: 'A',
        correct: i < 15,
      })),
    }
    const [event] = toEvents([attempt], [])
    expect(event.label.es).toBe('Razonamiento verbal')
    expect(event.detail.es).toBe('15 de 20 correctas')
    expect(event.score).toEqual({ value: 15, max: 20 })
  })

  it('nombra el ámbito en las pruebas de campo', () => {
    const [event] = toEvents(
      [
        {
          ...test_(local(2026, 9, 9).toISOString(), 900),
          phase: 'field-mcq',
          skill: undefined,
          field: 'cybersecurity',
        },
      ],
      [],
    )
    expect(event.label.es).toBe('Ciberseguridad')
    expect(event.label.en).toBe('Cybersecurity')
  })

  it('cuenta las palabras de una redacción', () => {
    const [event] = toEvents([], [essay_(local(2026, 9, 9).toISOString(), 2400, '  uno  dos tres cuatro ')])
    expect(event.kind).toBe('essay')
    expect(event.detail.es).toBe('4 palabras')
  })

  it('una redacción vacía son cero palabras, no una', () => {
    const [event] = toEvents([], [essay_(local(2026, 9, 9).toISOString(), 60, '   ')])
    expect(event.detail.es).toBe('0 palabras')
  })

  it('ordena la actividad del día por hora', () => {
    const events = toEvents(
      [test_(local(2026, 9, 9, 18).toISOString(), 60), test_(local(2026, 9, 9, 9).toISOString(), 60)],
      [essay_(local(2026, 9, 9, 12).toISOString(), 60)],
    )
    expect(events.map((e) => new Date(e.at).getHours())).toEqual([9, 12, 18])
  })
})

describe('formato de duración', () => {
  it.each([
    [0, '0 min'],
    [29, '0 min'],
    [59, '1 min'],
    [90, '2 min'],
    [3600, '1 h'],
    [3660, '1 h 1 min'],
    [18000, '5 h'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatDuration(seconds, 'es')).toBe(expected)
  })
})

describe('utilidades de fecha', () => {
  it('addDays cruza el cambio de mes', () => {
    expect(dayKey(addDays(local(2026, 8, 31), 1))).toBe('2026-09-01')
  })

  it('addDays cruza el cambio de hora sin desplazar el día', () => {
    // Último domingo de octubre: en España se atrasa el reloj. Sumar un día
    // con aritmética de milisegundos daría el mismo día otra vez.
    expect(dayKey(addDays(local(2026, 10, 25), 1))).toBe('2026-10-26')
  })
})
