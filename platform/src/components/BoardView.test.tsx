// El tablón tal como lo lee el candidato. Tres cosas que tienen que salir bien
// sí o sí: el verde marca lo publicado en el último mes (y sólo eso), el plazo
// se enseña con la hora de EPSO —si lo tradujéramos a la zona del navegador,
// alguien podría llegar tarde por nuestra culpa—, y las convocatorias que ya
// no están abiertas siguen en el tablón, porque el año entero es el archivo.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BoardView } from './BoardView'
import { DICT } from '../lib/dictionary'
import { useLocaleStore } from '../lib/localeStore'
import type { BoardFile, BoardNotice } from '../types/board'

const es = (key: keyof typeof DICT) => DICT[key].es
const withDays = (days: number) => es('board_days_left').replace('{days}', String(days))
const SINCE = '2026-09-18'

function notice(overrides: Partial<BoardNotice> = {}): BoardNotice {
  return {
    id: 'epso-ad-430-26-2',
    reference: 'EPSO/AD/430/26 - 2',
    title: 'Cybersecurity',
    year: 2026,
    stage: 'open',
    url: 'https://eu-careers.europa.eu/en/apply-ict-competition-ad8',
    grade: 'AD 8',
    locations: ['Brussels (Belgium)', 'Luxembourg (Luxembourg)'],
    deadline: '2026-10-13T10:00:00Z',
    deadlineText: '13/10/2026 - 12:00',
    openedOn: '2026-09-08',
    firstSeen: SINCE,
    ...overrides,
  }
}

function board(notices: BoardNotice[], overrides: Partial<BoardFile> = {}): BoardFile {
  return {
    format: 2,
    sources: [
      { stage: 'open', url: 'https://eu-careers.europa.eu/en/open-competition-permanent-staff' },
      { stage: 'in-progress', url: 'https://eu-careers.europa.eu/en/job-opportunities/in-progress' },
      { stage: 'closed', url: 'https://eu-careers.europa.eu/en/job-opportunities/closed' },
    ],
    year: 2026,
    since: SINCE,
    notices,
    ...overrides,
  }
}

/** La tarjeta que contiene ese título, para mirarle el color. */
const cardOf = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  // El verde y los días que faltan se cuentan contra el reloj: sin fijarlo,
  // estos tests empezarían a fallar solos al pasar el mes.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-18T09:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('una convocatoria', () => {
  it('enseña número oficial, título, grado y sedes', () => {
    render(<BoardView board={board([notice()])} />)
    expect(screen.getByText('EPSO/AD/430/26 - 2')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Cybersecurity' })).toBeTruthy()
    expect(screen.getByText('AD 8')).toBeTruthy()
    expect(screen.getByText(/Brussels \(Belgium\) · Luxembourg \(Luxembourg\)/)).toBeTruthy()
  })

  it('enseña el plazo con la hora de EPSO, no convertida', () => {
    render(<BoardView board={board([notice()])} />)
    expect(screen.getByText('13/10/2026 - 12:00')).toBeTruthy()
  })

  it('dice cuántos días quedan', () => {
    // Del 18/09 a las 09:00 al 13/10 a las 12:00 hay 25 días y tres horas, y
    // un día empezado cuenta: 26.
    render(<BoardView board={board([notice()])} />)
    expect(screen.getByText(withDays(26))).toBeTruthy()
  })

  it('el último día se dice en singular', () => {
    render(<BoardView board={board([notice({ deadline: '2026-09-18T23:00:00Z' })])} />)
    expect(screen.getByText(es('board_day_left'))).toBeTruthy()
  })

  it('un plazo pasado se dice, no se disimula', () => {
    render(<BoardView board={board([notice({ deadline: '2026-09-01T10:00:00Z' })])} />)
    expect(screen.getByText(es('board_deadline_passed'))).toBeTruthy()
  })

  it('dice cuándo se publicó', () => {
    render(<BoardView board={board([notice()])} />)
    expect(screen.getByText(es('board_opened_on').replace('{date}', '08/09/2026'))).toBeTruthy()
  })

  it('lleva al anuncio de EPSO en otra pestaña', () => {
    render(<BoardView board={board([notice()])} />)
    const link = screen.getByRole('link', { name: es('board_apply') }) as HTMLAnchorElement
    expect(link.href).toBe('https://eu-careers.europa.eu/en/apply-ict-competition-ad8')
    expect([link.target, link.rel]).toEqual(['_blank', 'noreferrer'])
  })

  it('las que no están abiertas no enseñan plazo ni días', () => {
    render(<BoardView board={board([notice({ stage: 'in-progress', deadline: undefined, deadlineText: undefined })])} />)
    expect(screen.queryByText('13/10/2026 - 12:00')).toBeNull()
    expect(screen.queryByText(withDays(26))).toBeNull()
  })
})

describe('el verde de lo recién publicado', () => {
  it('lo publicado hace diez días va en verde y marcado', () => {
    render(<BoardView board={board([notice({ openedOn: '2026-09-08' })])} />)
    expect(cardOf('Cybersecurity').className).toContain('emerald')
    expect(screen.getByText(es('board_new'))).toBeTruthy()
  })

  it('lo publicado hace cuatro meses NO', () => {
    render(<BoardView board={board([notice({ title: 'Data science', openedOn: '2026-05-06' })])} />)
    expect(cardOf('Data science').className).not.toContain('emerald')
    expect(screen.queryByText(es('board_new'))).toBeNull()
  })

  it('destaca sólo las del último mes cuando hay de todo', () => {
    render(
      <BoardView
        board={board([
          notice({ id: 'nueva', title: 'Cybersecurity', openedOn: '2026-09-08' }),
          notice({ id: 'vieja', title: 'Data science', openedOn: '2026-05-06', stage: 'in-progress' }),
        ])}
      />,
    )
    expect(cardOf('Cybersecurity').className).toContain('emerald')
    expect(cardOf('Data science').className).not.toContain('emerald')
  })

  it('la leyenda explica qué significa el verde', () => {
    render(<BoardView board={board([notice()])} />)
    expect(screen.getByText(es('board_fresh_legend'))).toBeTruthy()
  })
})

describe('el año entero, no sólo lo abierto', () => {
  it('reparte las convocatorias por fase, con su título de sección', () => {
    render(
      <BoardView
        board={board([
          notice({ id: 'a', title: 'Cybersecurity', stage: 'open' }),
          notice({ id: 'b', title: 'Data science', stage: 'in-progress' }),
          notice({ id: 'c', title: 'Graduate administrators', stage: 'closed' }),
        ])}
      />,
    )
    for (const key of ['board_stage_open', 'board_stage_in_progress', 'board_stage_closed'] as const) {
      expect(screen.getAllByText(es(key)).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('heading', { name: 'Graduate administrators' })).toBeTruthy()
  })

  it('un cambio de fase se fecha', () => {
    render(<BoardView board={board([notice({ stage: 'in-progress', stageChangedOn: '2026-10-14' })])} />)
    expect(screen.getByText(es('board_stage_changed').replace('{date}', '14/10/2026'))).toBeTruthy()
  })
})

describe('cuando el tablón está vacío', () => {
  it('lo dice en vez de dejar la página en blanco', () => {
    render(<BoardView board={board([])} />)
    expect(screen.getByText(es('board_empty_title'))).toBeTruthy()
    expect(screen.getByText(es('board_empty_body'))).toBeTruthy()
  })

  it('si el bot no ha corrido nunca, se dice eso y no se enlaza a ninguna parte', () => {
    render(<BoardView board={board([], { sources: [], year: null, since: null })} />)
    expect(screen.getByText(es('board_never_checked'))).toBeTruthy()
    expect(screen.queryByRole('link', { name: es('board_stage_open') })).toBeNull()
  })
})

describe('la procedencia de los datos', () => {
  it('enlaza los tres listados que vigila el bot', () => {
    render(<BoardView board={board([notice()])} />)
    expect(screen.getByRole('link', { name: es('board_stage_open') })).toBeTruthy()
    expect(screen.getByRole('link', { name: es('board_stage_in_progress') })).toBeTruthy()
    expect(screen.getByRole('link', { name: es('board_stage_closed') })).toBeTruthy()
  })

  it('dice el año publicado, desde cuándo se vigila y la última novedad', () => {
    // La convocatoria se vio dos días después de empezar a vigilar, para que
    // se vea que «vigilando desde» y «última novedad» no son la misma fecha.
    render(<BoardView board={board([notice({ firstSeen: '2026-09-20' })])} />)
    expect(screen.getByText('2026')).toBeTruthy()
    expect(screen.getByText(es('board_watching_since'))).toBeTruthy()
    expect(screen.getByText('18/09/2026')).toBeTruthy()
    expect(screen.getByText(es('board_last_news'))).toBeTruthy()
    expect(screen.getByText('20/09/2026')).toBeTruthy()
  })
})

describe('en inglés', () => {
  it('todo el texto de la interfaz cambia, sin restos del español', () => {
    useLocaleStore.setState({ locale: 'en' })
    render(<BoardView board={board([notice()])} />)
    expect(screen.getByText(DICT.board_title.en)).toBeTruthy()
    expect(screen.queryByText(es('board_title'))).toBeNull()
    // El título de la convocatoria es lo que publica EPSO: ése no se traduce.
    expect(screen.getByRole('heading', { name: 'Cybersecurity' })).toBeTruthy()
  })
})
