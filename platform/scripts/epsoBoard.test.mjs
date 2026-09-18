// Lo que tiene que aguantar el lector del tablón. Tres cosas se comprueban con
// más saña que el resto, porque son las que harían daño de verdad:
//
//  1. Que un cambio de plantilla en EPSO **falle**, en vez de devolver una
//     lista vacía que el tablón enseñaría como «no hay convocatorias».
//  2. Que emparejar las tres listas no cuelgue a una convocatoria el número de
//     otra: ese número es el que manda al candidato al anuncio oficial.
//  3. Que fundir lo nuevo con lo guardado no pierda nada: `firstSeen` no se
//     toca y lo que desaparece de los listados se conserva.
import { describe, expect, it } from 'vitest'

// Las páginas reales, tal como las sirve EPSO, importadas como texto: así el
// test no depende de desde qué carpeta se lance vitest.
import CLOSED from './__fixtures__/epso-closed.html?raw'
import DETAIL from './__fixtures__/epso-competition-detail.html?raw'
import IN_PROGRESS from './__fixtures__/epso-in-progress.html?raw'
import OPEN from './__fixtures__/epso-open-competitions.html?raw'
import {
  BOARD_FORMAT,
  BoardStructureError,
  LISTINGS,
  buildFile,
  combineListings,
  keyOf,
  mergeNotices,
  pagerLinks,
  parseListing,
  parseOpenedOn,
  slug,
  textOf,
  yearOf,
} from './lib/epsoBoard.mjs'

const listing = (stage) => LISTINGS.find((l) => l.stage === stage)
const parse = (html, stage) =>
  parseListing(html, { sourceUrl: listing(stage).url, expect: listing(stage).expect })

/** Una tabla con las columnas de la lista de abiertas y las filas que le pases. */
const openPage = (rows) => `
<table class="cols-4 responsive-enabled">
  <thead><tr>
    <th class="views-field views-field-title" scope="col">Job title</th>
    <th class="views-field views-field-field-epso-grade" scope="col">Grade</th>
    <th class="views-field views-field-field-epso-location" scope="col">Location(s)</th>
    <th class="views-field views-field-field-epso-deadline" scope="col">Deadline</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`

const openRow = ({
  title = '<a href="/en/x">Cybersecurity</a>',
  grade = 'AD 8',
  location = 'Brussels (Belgium)',
  deadline = '<time datetime="2026-10-13T10:00:00Z">13/10/2026 - 12:00</time>',
} = {}) => `
  <tr class="job-row">
    <td class="views-field views-field-title">${title}</td>
    <td class="views-field views-field-field-epso-grade">${grade}</td>
    <td class="views-field views-field-field-epso-location">${location}</td>
    ${deadline === null ? '' : `<td class="views-field views-field-field-epso-deadline">${deadline}</td>`}
  </tr>`

describe('la lista de convocatorias abiertas', () => {
  const notices = parse(OPEN, 'open')

  it('saca las dos abiertas', () => {
    expect(notices.map((n) => n.title)).toEqual(['Artificial intelligence (AI)', 'Cybersecurity'])
  })

  it('lee grado, plazo y enlace', () => {
    expect(notices[0]).toMatchObject({
      grade: 'AD 8',
      deadline: '2026-10-13T10:00:00Z',
      deadlineText: '13/10/2026 - 12:00',
      url: 'https://eu-careers.europa.eu/en/apply-ict-competition-ad8',
    })
  })

  it('separa las sedes sin partir los paréntesis', () => {
    // Partir por comas a lo bruto dejaría «Brussels (Belgium» y «Belgium)».
    expect(notices[0].locations).toEqual([
      'Brussels (Belgium)',
      'Luxembourg (Luxembourg)',
      'Strasbourg (France)',
    ])
  })

  it('no trae número de convocatoria, porque esa lista no lo publica', () => {
    expect(notices[0].reference).toBeUndefined()
  })
})

describe('la lista de procesos en curso', () => {
  const notices = parse(IN_PROGRESS, 'in-progress')

  it('saca las diecinueve con su número oficial', () => {
    expect(notices).toHaveLength(19)
    expect(notices[0]).toMatchObject({
      title: 'Cybersecurity',
      reference: 'EPSO/AD/430/26 - 2',
      url: 'https://eu-careers.europa.eu/en/job-opportunities/cybersecurity',
    })
  })

  it('incluye las cuatro de la AD7, que es la del candidato', () => {
    const ad7 = notices.filter((n) => n.reference.startsWith('EPSO/AD/429/26'))
    expect(ad7.map((n) => n.title).sort()).toEqual([
      'Clouds and networks',
      'Data science',
      'ICT infrastructure',
      'ICT project management',
    ])
  })

  it('no inventa plazo donde la lista no lo da', () => {
    expect(notices[0].deadline).toBeUndefined()
    expect(notices[0].deadlineText).toBeUndefined()
  })
})

describe('la lista de terminadas', () => {
  it('se lee igual, y trae su paginador', () => {
    const notices = parse(CLOSED, 'closed')
    expect(notices.length).toBeGreaterThan(0)
    expect(notices[0].reference).toMatch(/^EPSO\//)
    expect(pagerLinks(CLOSED, { sourceUrl: listing('closed').url })).toEqual([
      `${listing('closed').url}?page=1`,
      `${listing('closed').url}?page=2`,
      `${listing('closed').url}?page=5`,
    ])
  })
})

describe('cuando la página no es la que esperamos', () => {
  it('revienta si no hay tabla ni marca de listado vacío', () => {
    expect(() => parse('<div><p>Job opportunities</p></div>', 'open')).toThrow(BoardStructureError)
  })

  it('revienta si la tabla no declara una columna que esperábamos', () => {
    // La lista de en curso leída con las columnas de abiertas: le faltan tres.
    expect(() => parse(IN_PROGRESS, 'open')).toThrow(BoardStructureError)
  })

  it('revienta si a una fila le falta una columna declarada', () => {
    expect(() => parse(openPage(openRow({ deadline: null })), 'open')).toThrow(/no trae deadline/)
  })

  it('revienta si una fila no enlaza a la convocatoria', () => {
    expect(() => parse(openPage(openRow({ title: 'Cybersecurity' })), 'open')).toThrow(/no enlaza/)
  })

  it('el motivo dice qué pasa y a qué obliga, no sólo que falló', () => {
    try {
      parse('<div>otra cosa</div>', 'open')
      expect.unreachable()
    } catch (error) {
      expect(error.message).toMatch(/cambiado de forma/)
      expect(error.message).toMatch(/tablón/)
    }
  })
})

describe('una lista vacía de verdad', () => {
  it('no es un error: EPSO puede no tener nada abierto', () => {
    const vacia = '<div class="view-empty"><p>There are currently no open competitions.</p></div>'
    expect(parse(vacia, 'open')).toEqual([])
  })

  it('una tabla con cabecera y sin filas tampoco', () => {
    expect(parse(openPage(''), 'open')).toEqual([])
  })
})

describe('el año de una convocatoria', () => {
  it('sale de su número oficial', () => {
    expect(yearOf('EPSO/AD/430/26 - 2')).toBe(2026)
    expect(yearOf('EPSO/AST/157/25 - 3')).toBe(2025)
    expect(yearOf('EPSO/AD/424/25 – IT')).toBe(2025)
  })

  it('los números permanentes no tienen año', () => {
    // Los agentes contractuales (CAST) están siempre abiertos; no son la
    // convocatoria de un año y no deben colarse en el tablón por año.
    expect(yearOf('EPSO/CAST/P/1/2017, EPSO/CAST/P/2/2017')).toBeNull()
    expect(yearOf(null)).toBeNull()
  })
})

describe('juntar las tres listas', () => {
  const byStage = {
    open: parse(OPEN, 'open'),
    'in-progress': parse(IN_PROGRESS, 'in-progress'),
    closed: [],
  }

  it('una abierta hereda el número que publica la otra lista', () => {
    const combined = combineListings(byStage)
    const cyber = combined.find((n) => n.title === 'Cybersecurity')
    expect(cyber).toMatchObject({
      reference: 'EPSO/AD/430/26 - 2',
      stage: 'open',
      year: 2026,
      grade: 'AD 8',
    })
  })

  it('lo abierto manda sobre lo que también sale como en curso', () => {
    const combined = combineListings(byStage)
    // Las dos abiertas salen además en la lista de en curso: una sola entrada.
    expect(combined.filter((n) => n.title === 'Cybersecurity')).toHaveLength(1)
    expect(combined.filter((n) => n.stage === 'open')).toHaveLength(2)
  })

  it('con el título repetido NO adivina el número', () => {
    // Un número equivocado mandaría al candidato al anuncio de otra oposición,
    // que es peor que no darle ninguno.
    const ambiguo = {
      open: parse(openPage(openRow()), 'open'),
      'in-progress': [
        { title: 'Cybersecurity', reference: 'EPSO/AD/430/26 - 2', url: 'https://x/1' },
        { title: 'Cybersecurity', reference: 'EPSO/AD/999/26', url: 'https://x/2' },
      ],
      closed: [],
    }
    const abierta = combineListings(ambiguo).find((n) => n.stage === 'open')
    expect(abierta.reference).toBeNull()
  })

  it('guarda la ficha aparte del enlace de inscripción', () => {
    // La lista de abiertas enlaza a la página de inscripción, que es la que le
    // sirve al candidato, pero el calendario con la fecha de publicación está
    // en la ficha. Confundirlas dejó a las dos abiertas sin fecha.
    const cyber = combineListings(byStage).find((n) => n.title === 'Cybersecurity')
    expect(cyber.url).toContain('/apply-ict-competition-ad8')
    expect(cyber.infoUrl).toContain('/job-opportunities/cybersecurity')
  })

  it('el identificador sale del número cuando lo hay, y del título cuando no', () => {
    expect(keyOf({ title: 'Cybersecurity', reference: 'EPSO/AD/430/26 - 2' })).toBe('epso-ad-430-26-2')
    expect(keyOf({ title: 'Cybersecurity' })).toBe('cybersecurity')
  })
})

describe('fundir lo leído con lo guardado', () => {
  const hoy = '2026-09-18'
  const leida = (extra = {}) => ({
    id: 'epso-ad-430-26-2',
    reference: 'EPSO/AD/430/26 - 2',
    title: 'Cybersecurity',
    year: 2026,
    stage: 'open',
    url: 'https://eu-careers.europa.eu/en/x',
    deadline: '2026-10-13T10:00:00Z',
    deadlineText: '13/10/2026 - 12:00',
    ...extra,
  })

  it('lo que no estaba es nuevo, y queda fechado', () => {
    const { notices, added } = mergeNotices([], [leida()], hoy, { year: 2026 })
    expect(added).toEqual(['epso-ad-430-26-2'])
    expect(notices[0]).toMatchObject({ firstSeen: hoy, stage: 'open' })
  })

  it('publica el año que se vigila aunque ya no esté abierto', () => {
    const cerrada = leida({ id: 'epso-ad-427-26', reference: 'EPSO/AD/427/26', stage: 'in-progress' })
    const { notices } = mergeNotices([], [cerrada], hoy, { year: 2026 })
    expect(notices).toHaveLength(1)
  })

  it('de otros años sólo entra lo que esté abierto ahora', () => {
    const vieja = leida({ id: 'epso-ad-424-25-it', reference: 'EPSO/AD/424/25 – IT', year: 2025, stage: 'closed' })
    const viejaAbierta = leida({ id: 'epso-ad-426-25', reference: 'EPSO/AD/426/25', year: 2025, stage: 'open' })
    const { notices } = mergeNotices([], [vieja, viejaAbierta], hoy, { year: 2026 })
    expect(notices.map((n) => n.id)).toEqual(['epso-ad-426-25'])
  })

  it('lo que ya estaba conserva el día en que se vio por primera vez', () => {
    const antes = [{ ...leida(), firstSeen: '2026-01-02' }]
    const { notices, added, updated } = mergeNotices(antes, [leida()], hoy, { year: 2026 })
    expect([added, updated]).toEqual([[], []])
    expect(notices[0].firstSeen).toBe('2026-01-02')
    expect(notices[0].updatedOn).toBeUndefined()
  })

  it('pasar de abierta a en curso se fecha como cambio de fase', () => {
    const antes = [{ ...leida(), firstSeen: '2026-01-02' }]
    const { notices, updated } = mergeNotices(antes, [leida({ stage: 'in-progress' })], hoy, { year: 2026 })
    expect(updated).toEqual(['epso-ad-430-26-2'])
    expect(notices[0]).toMatchObject({ stage: 'in-progress', stageChangedOn: hoy })
  })

  it('un plazo que cambia se marca, porque al candidato le importa', () => {
    const antes = [{ ...leida(), firstSeen: '2026-01-02' }]
    const { notices, updated } = mergeNotices(antes, [leida({ deadline: '2026-11-30T10:00:00Z' })], hoy, {
      year: 2026,
    })
    expect(updated).toEqual(['epso-ad-430-26-2'])
    expect(notices[0]).toMatchObject({ deadline: '2026-11-30T10:00:00Z', updatedOn: hoy })
  })

  it('lo que desaparece de los listados se conserva, no se borra', () => {
    // El tablón es también el archivo de lo que ha pasado este año.
    const antes = [{ ...leida(), firstSeen: '2026-01-02' }]
    const { notices } = mergeNotices(antes, [], hoy, { year: 2026 })
    expect(notices).toHaveLength(1)
    expect(notices[0].firstSeen).toBe('2026-01-02')
  })

  it('lo abierto va delante de lo demás, y por plazo', () => {
    const encurso = leida({ id: 'epso-ad-427-26', reference: 'EPSO/AD/427/26', stage: 'in-progress' })
    const tarde = leida({ id: 'tarde', deadline: '2026-12-01T10:00:00Z' })
    const pronto = leida({ id: 'pronto', deadline: '2026-10-01T10:00:00Z' })
    const { notices } = mergeNotices([], [encurso, tarde, pronto], hoy, { year: 2026 })
    expect(notices.map((n) => n.id)).toEqual(['pronto', 'tarde', 'epso-ad-427-26'])
  })

  it('el mismo listado dos veces da exactamente el mismo fichero', () => {
    // Si no, el cron commitearía a diario aunque no haya novedades.
    const una = mergeNotices([], [leida()], hoy, { year: 2026 }).notices
    const otra = mergeNotices(una, [leida()], '2026-09-19', { year: 2026 }).notices
    expect(JSON.stringify(otra)).toBe(JSON.stringify(una))
  })
})

describe('el fichero que se guarda', () => {
  it('apunta el año publicado, las fuentes y el día en que empezamos a vigilar', () => {
    const file = buildFile(null, [], '2026-09-18', { year: 2026 })
    expect(file).toMatchObject({ format: BOARD_FORMAT, year: 2026, since: '2026-09-18' })
    expect(file.sources.map((s) => s.stage)).toEqual(['open', 'in-progress', 'closed'])
  })

  it('no vuelve a fechar ese día nunca más', () => {
    // Si `since` se moviera, el tablón dejaría de saber qué llegó después de
    // ponerse en marcha y marcaría como nuevo lo que ya estaba.
    const file = buildFile({ since: '2026-09-18' }, [], '2027-03-01', { year: 2027 })
    expect(file.since).toBe('2026-09-18')
  })
})

describe('la ficha de una convocatoria', () => {
  it('da el día en que se abrió el plazo', () => {
    // Los listados no publican fecha de publicación; el calendario de la ficha
    // sí, y es lo que permite decir «publicada hace menos de un mes».
    expect(parseOpenedOn(DETAIL)).toBe('2026-09-08')
  })

  it('no confunde la apertura con los otros plazos del calendario', () => {
    // La misma ficha trae «Deadline to submit supporting documents: 14/01/2027».
    expect(parseOpenedOn(DETAIL)).not.toBe('2027-01-14')
  })

  it('sin calendario no inventa una fecha, y no revienta', () => {
    // Aquí NO aplica la regla de reventar de los listados: una ficha sin
    // calendario no puede hacernos creer que no hay convocatorias, y las más
    // antiguas no lo traen.
    expect(parseOpenedOn('<div>otra cosa</div>')).toBeNull()
  })
})

describe('las piezas pequeñas', () => {
  it('el texto pierde etiquetas y entidades', () => {
    expect(textOf('<td> Data&nbsp;science &amp; AI&#039;s <b>edge</b> </td>')).toBe("Data science & AI's edge")
  })

  it('el identificador aguanta acentos y símbolos', () => {
    expect(slug('Auditoría & Análisis (AD 7)')).toBe('auditoria-analisis-ad-7')
  })
})
