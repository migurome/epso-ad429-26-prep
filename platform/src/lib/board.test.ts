// La lógica del tablón. Lo que más se vigila aquí es qué cuenta como «nueva»,
// porque de eso depende el verde: usar el día en que el bot vio la convocatoria
// marcaría como nuevas, el primer día, ocho que llevaban meses publicadas.
import { describe, it, expect } from 'vitest'
import { FRESH_DAYS, byStage, daysLeft, formatDay, isFresh, lastNewsOn, publishedOn } from './board'
import type { BoardNotice } from '../types/board'

const SINCE = '2026-09-18'
const AHORA = new Date('2026-09-18T09:00:00Z')

function notice(overrides: Partial<BoardNotice> = {}): BoardNotice {
  return {
    id: 'epso-ad-430-26-2',
    reference: 'EPSO/AD/430/26 - 2',
    title: 'Cybersecurity',
    year: 2026,
    stage: 'open',
    url: 'https://eu-careers.europa.eu/en/apply-ict-competition-ad8',
    grade: 'AD 8',
    locations: ['Brussels (Belgium)'],
    deadline: '2026-10-13T10:00:00Z',
    deadlineText: '13/10/2026 - 12:00',
    openedOn: '2026-09-08',
    firstSeen: '2026-09-18',
    ...overrides,
  }
}

describe('cuándo se publicó una convocatoria', () => {
  it('lo dice la ficha de EPSO, no el día en que la vimos', () => {
    expect(publishedOn(notice(), SINCE)).toBe('2026-09-08')
  })

  it('sin fecha en la ficha vale el día en que apareció, si fue después de empezar', () => {
    expect(publishedOn(notice({ openedOn: null, firstSeen: '2026-10-02' }), SINCE)).toBe('2026-10-02')
  })

  it('sin fecha y vista el primer día, no se afirma nada', () => {
    // Las ocho del primer día llevaban meses publicadas: decir que salieron
    // ese día sería inventar.
    expect(publishedOn(notice({ openedOn: null, firstSeen: SINCE }), SINCE)).toBeNull()
  })
})

describe('el verde: publicadas en el último mes', () => {
  it('diez días es nueva', () => {
    expect(isFresh(notice({ openedOn: '2026-09-08' }), SINCE, AHORA)).toBe(true)
  })

  it('cuatro meses no', () => {
    expect(isFresh(notice({ openedOn: '2026-05-06' }), SINCE, AHORA)).toBe(false)
  })

  it('el mes es el límite, y se cuenta desde la publicación', () => {
    const justo = new Date(AHORA.getTime() - 1)
    const hace29 = notice({ openedOn: '2026-08-20' }) // 29 días
    const hace40 = notice({ openedOn: '2026-08-09' }) // 40 días
    expect([isFresh(hace29, SINCE, justo, FRESH_DAYS), isFresh(hace40, SINCE, justo, FRESH_DAYS)]).toEqual([
      true,
      false,
    ])
  })

  it('una que aún no ha abierto plazo también es nueva', () => {
    // Es lo más reciente que hay; esconderla sería lo contrario de lo que se
    // busca en un tablón.
    expect(isFresh(notice({ openedOn: '2026-10-01' }), SINCE, AHORA)).toBe(true)
  })

  it('sin fecha que afirmar, no se destaca', () => {
    expect(isFresh(notice({ openedOn: null, firstSeen: SINCE }), SINCE, AHORA)).toBe(false)
  })

  it('una fecha ilegible no destaca nada, y no revienta', () => {
    expect(isFresh(notice({ openedOn: 'pronto' }), SINCE, AHORA)).toBe(false)
  })
})

describe('los días que quedan de plazo', () => {
  const now = new Date('2026-10-01T09:00:00Z')

  it('cuenta el día en curso como uno', () => {
    expect(daysLeft('2026-10-13T10:00:00Z', now)).toBe(13)
  })

  it('el último día sigue siendo un día', () => {
    expect(daysLeft('2026-10-01T23:00:00Z', now)).toBe(1)
  })

  it('un plazo pasado no queda en cero, queda en negativo', () => {
    // Cero significaría «cierra hoy», y eso ya no es verdad.
    expect(daysLeft('2026-09-20T10:00:00Z', now)).toBeLessThan(0)
  })

  it('sin fecha en máquina no se inventa ninguna', () => {
    expect(daysLeft(null, now)).toBeNull()
    expect(daysLeft(undefined, now)).toBeNull()
    expect(daysLeft('el martes que viene', now)).toBeNull()
  })
})

describe('el orden del tablón', () => {
  it('lo abierto por plazo, lo que cierra antes arriba', () => {
    const { open } = byStage([
      notice({ id: 'tarde', deadline: '2026-12-01T10:00:00Z' }),
      notice({ id: 'pronto', deadline: '2026-10-05T10:00:00Z' }),
    ])
    expect(open.map((n) => n.id)).toEqual(['pronto', 'tarde'])
  })

  it('lo demás por número de convocatoria, de la más nueva a la más vieja', () => {
    const { 'in-progress': curso } = byStage([
      notice({ id: 'a', stage: 'in-progress', reference: 'EPSO/AD/427/26' }),
      notice({ id: 'b', stage: 'in-progress', reference: 'EPSO/AD/429/26 - 1' }),
    ])
    expect(curso.map((n) => n.reference)).toEqual(['EPSO/AD/429/26 - 1', 'EPSO/AD/427/26'])
  })

  it('cada fase en su grupo', () => {
    const groups = byStage([
      notice({ id: 'a', stage: 'open' }),
      notice({ id: 'b', stage: 'in-progress' }),
      notice({ id: 'c', stage: 'closed' }),
    ])
    expect([groups.open.length, groups['in-progress'].length, groups.closed.length]).toEqual([1, 1, 1])
  })
})

describe('la fecha de la última novedad', () => {
  it('es la más reciente de todas las que guarda una convocatoria', () => {
    const notices = [
      notice({ id: 'a', firstSeen: '2026-09-18' }),
      notice({ id: 'b', firstSeen: '2026-09-20', updatedOn: '2026-10-04' }),
      notice({ id: 'c', firstSeen: '2026-09-19', stageChangedOn: '2026-09-28' }),
    ]
    expect(lastNewsOn(notices)).toBe('2026-10-04')
  })

  it('sin convocatorias no hay fecha que enseñar', () => {
    expect(lastNewsOn([])).toBeNull()
  })
})

describe('las fechas de día suelto', () => {
  it('se escriben como las escribe EPSO', () => {
    expect(formatDay('2026-09-18')).toBe('18/09/2026')
  })

  it('no se desplazan un día por la zona del navegador', () => {
    // Construir `new Date('2026-01-01')` y pintarlo en hora local daría el 31
    // de diciembre en toda América.
    expect(formatDay('2026-01-01')).toBe('01/01/2026')
  })

  it('lo que no sea una fecha se deja tal cual, sin inventar', () => {
    expect(formatDay('pronto')).toBe('pronto')
  })
})
