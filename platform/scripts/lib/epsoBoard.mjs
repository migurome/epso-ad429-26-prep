// Lectura de las convocatorias de EPSO para el tablón.
//
// EPSO no publica feed ni API: sus listados son tablas de una vista de Drupal.
// Hay tres, y cada una sabe algo que las otras no:
//
//   · abiertas     → grado, sedes y plazo de presentación, pero sin número
//   · en curso     → el número oficial (EPSO/AD/429/26 - 1), sin plazo
//   · cerradas     → el número oficial de lo ya terminado, paginado
//
// Una convocatoria se sigue por su número, que es como la nombra EPSO en el
// Diario Oficial, y la fase la dice la lista en la que aparece. Todo lo de
// aquí son funciones puras —sin red y sin disco— para que los tests puedan
// pasarles páginas guardadas.
//
// La regla que manda sobre todas: **si una página deja de tener la forma que
// esperamos, esto revienta**. Un raspador que ante un cambio de plantilla
// devuelve «cero convocatorias» es peor que uno roto, porque el tablón diría
// «no hay nada nuevo» y el candidato se quedaría sin enterarse de la
// convocatoria de su vida. Una lista vacía de verdad sí es legítima, y se
// distingue por la cabecera de la tabla, que sigue estando.

/** Versión del fichero del tablón; sube si cambia la forma de los datos. */
export const BOARD_FORMAT = 2

const SITE = 'https://eu-careers.europa.eu'

/**
 * Las tres listas, con lo que cada una tiene que declarar en su cabecera.
 *
 * `expect` es el contrato: si EPSO renombra o quita una de esas columnas, el
 * lector falla en vez de devolver convocatorias a medias.
 */
export const LISTINGS = [
  {
    stage: 'open',
    url: `${SITE}/en/open-competition-permanent-staff`,
    expect: ['title', 'grade', 'locations', 'deadline'],
    paged: false,
  },
  {
    stage: 'in-progress',
    url: `${SITE}/en/job-opportunities/in-progress`,
    expect: ['title', 'reference'],
    paged: false,
  },
  {
    stage: 'closed',
    url: `${SITE}/en/job-opportunities/closed`,
    expect: ['title', 'reference'],
    // Es la única paginada: 50 por página y las más recientes primero, así que
    // basta seguir mientras sigan saliendo convocatorias del año que se vigila.
    paged: true,
  },
]

/** De más avanzada a menos: si una convocatoria sale en dos listas, manda ésta. */
export const STAGES = ['open', 'in-progress', 'closed']

/** La página ya no tiene la forma que sabemos leer. */
export class BoardStructureError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BoardStructureError'
  }
}

// Nombres de campo de la vista, no clases de maquetación: `field-epso-deadline`
// es el nombre máquina del campo en Drupal y cambia mucho menos que el diseño.
const FIELDS = {
  title: 'views-field-title',
  grade: 'views-field-field-epso-grade',
  locations: 'views-field-field-epso-location',
  deadline: 'views-field-field-epso-deadline',
  reference: 'views-field-field-epso-reference-number',
  stepName: 'views-field-field-epso-plan-step-name',
  stepDate: 'views-field-field-epso-plan-step-date',
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
}

/** Texto visible de un trozo de HTML: sin etiquetas, sin entidades, sin sobras. */
export function textOf(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Identificador estable y legible: `epso-ad-430-26-2`, `cybersecurity`. */
export function slug(text) {
  return textOf(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * El año de una convocatoria, sacado de su número oficial.
 *
 * `EPSO/AD/430/26 - 2` es de 2026 y `EPSO/AST/157/25 - 3` de 2025. Los números
 * permanentes de agentes contractuales (`EPSO/CAST/P/1/2017`) no siguen ese
 * patrón y devuelven null a propósito: no son convocatorias de un año, están
 * siempre abiertas.
 */
export function yearOf(reference) {
  if (!reference) return null
  const found = /\b\d{2,3}\/(\d{2})\b/.exec(reference)
  // Dos cifras: EPSO las usa así desde hace décadas y seguirá mientras exista
  // este repositorio. 26 → 2026.
  return found ? 2000 + Number(found[1]) : null
}

function attr(tagHtml, name) {
  const m = tagHtml.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, 'i'))
  return m ? m[1] : null
}

function fieldOf(classList) {
  for (const [field, cls] of Object.entries(FIELDS)) {
    // Delimitado, para que `views-field-title` no se coma a un futuro
    // `views-field-title-something`.
    if (new RegExp(`(^|\\s)${cls}(\\s|$)`).test(classList)) return field
  }
  return null
}

/** Las sedes vienen en una sola celda: «Bruselas (Bélgica), Luxemburgo (Luxemburgo)». */
function splitLocations(text) {
  if (!text) return []
  return text
    .split(/,\s*(?![^()]*\))/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function tablesIn(html) {
  return html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) ?? []
}

/** Qué campos declara la cabecera de una tabla, por las clases de la vista. */
function headerFields(table) {
  const head = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1] ?? ''
  const fields = new Set()
  for (const th of head.match(/<th\b[^>]*>/gi) ?? []) {
    const field = fieldOf(attr(th, 'class') ?? '')
    if (field) fields.add(field)
  }
  return fields
}

/**
 * Las convocatorias de una página de listado.
 *
 * @param {string} html  La página tal como la sirve EPSO.
 * @param {{ sourceUrl: string, expect: string[] }} opts  Columnas que la lista debe declarar.
 * @returns {Array<object>} Una entrada por fila, en el orden de la página.
 * @throws {BoardStructureError} Si no aparece la tabla, o si a una fila le falta una columna declarada.
 */
export function parseListing(html, { sourceUrl, expect }) {
  const table = tablesIn(html).find((t) => {
    const fields = headerFields(t)
    return expect.every((field) => fields.has(field))
  })
  if (!table) {
    // Cuando una lista no tiene nada, la vista no pinta tabla: pinta su bloque
    // de «sin resultados». Eso es una lista vacía de verdad, y hay que
    // distinguirla de una plantilla cambiada, que es lo que significa no
    // encontrar ni tabla ni esa marca.
    if (/class="[^"]*view-empty[^"]*"/i.test(html)) return []
    throw new BoardStructureError(
      `${sourceUrl}: ninguna tabla declara las columnas ${expect.join(', ')} ` +
        `(${expect.map((f) => FIELDS[f]).join(', ')}), y tampoco hay marca de listado vacío. ` +
        'La página ha cambiado de forma y hay que revisar el lector antes de fiarse del tablón.',
    )
  }

  const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)
  if (!body) return []

  const rows = body[1].match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  return rows.map((row, i) => {
    const cells = {}
    for (const cell of row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? []) {
      const open = cell.match(/<td\b[^>]*>/i)[0]
      const field = fieldOf(attr(open, 'class') ?? '')
      if (field) cells[field] = cell
    }

    const missing = expect.filter((field) => !(field in cells))
    if (missing.length > 0) {
      throw new BoardStructureError(
        `${sourceUrl}: la fila ${i + 1} no trae ${missing.join(' ni ')}. ` +
          'La vista ha cambiado de columnas; revisa el listado antes de confiar en el tablón.',
      )
    }

    const href = attr(cells.title.match(/<a\b[^>]*>/i)?.[0] ?? '', 'href')
    if (!href) {
      throw new BoardStructureError(
        `${sourceUrl}: la fila ${i + 1} no enlaza a la convocatoria; sin enlace no hay dónde mandar al candidato.`,
      )
    }

    const notice = {
      title: textOf(cells.title),
      url: new URL(href, sourceUrl).href,
    }
    if (cells.reference) notice.reference = textOf(cells.reference)
    if (cells.grade) notice.grade = textOf(cells.grade)
    if (cells.locations) notice.locations = splitLocations(textOf(cells.locations))
    if (cells.deadline) {
      // `<time datetime>` es la fecha que publica EPSO en máquina, con su zona.
      // Si algún día no viniera, guardamos el texto tal cual antes que inventar
      // una hora: el tablón sabe enseñar el texto.
      notice.deadline = attr(cells.deadline.match(/<time\b[^>]*>/i)?.[0] ?? '', 'datetime') ?? null
      notice.deadlineText = textOf(cells.deadline)
    }
    return notice
  })
}

/**
 * La fecha en que se abrió el plazo, leída de la ficha de la convocatoria.
 *
 * Los listados no publican fecha de publicación; la ficha sí trae el calendario
 * («Application period: 08/09/2026 - 13/10/2026»), y su primera fecha es el día
 * en que la convocatoria salió. Es lo que permite decir «publicada hace menos
 * de un mes» en vez de «la vimos hace menos de un mes», que no es lo mismo:
 * el día que el bot arranca ve convocatorias que llevan meses publicadas.
 *
 * Devuelve null sin protestar si la ficha no trae calendario —las más antiguas
 * no lo tienen—: el tablón se las arregla sin esa fecha. Aquí no aplica la
 * regla de reventar de los listados, porque una ficha sin fecha no puede
 * hacernos creer que no hay convocatorias.
 */
export function parseOpenedOn(html) {
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []
  for (const row of rows) {
    const cells = {}
    for (const cell of row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? []) {
      const field = fieldOf(attr(cell.match(/<td\b[^>]*>/i)[0], 'class') ?? '')
      if (field) cells[field] = textOf(cell)
    }
    if (!cells.stepName || !cells.stepDate) continue
    if (!/application period/i.test(cells.stepName)) continue
    const day = /(\d{2})\/(\d{2})\/(\d{4})/.exec(cells.stepDate)
    if (day) return `${day[3]}-${day[2]}-${day[1]}`
  }
  return null
}

/** Enlaces a las páginas siguientes del listado, si la vista pagina. */
export function pagerLinks(html, { sourceUrl }) {
  const links = new Set()
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, 'href')
    if (href && /[?&]page=\d+/.test(href)) links.add(new URL(href, sourceUrl).href)
  }
  return [...links]
}

/** Clave con la que se sigue una convocatoria: su número oficial si lo tiene. */
export function keyOf(notice) {
  return notice.reference ? slug(notice.reference) : slug(notice.title)
}

/**
 * Junta las tres listas en una sola tanda.
 *
 * La lista de abiertas no trae número de convocatoria y la de en curso sí, así
 * que las abiertas se emparejan **por título** con las otras para heredarlo. Si
 * un título apareciera repetido, se deja sin número en vez de adivinar: un
 * número equivocado mandaría al candidato al anuncio de otra oposición.
 *
 * @param {Record<string, Array<object>>} byStage  Filas leídas, por fase.
 */
export function combineListings(byStage) {
  const combined = new Map()
  // De la fase menos avanzada a la más avanzada, para que la más avanzada
  // sobrescriba: lo que está abierto manda sobre lo que está en curso.
  for (const stage of [...STAGES].reverse()) {
    for (const row of byStage[stage] ?? []) {
      const referenced =
        row.reference ??
        matchReference(row.title, byStage)
      const notice = { ...row, stage, reference: referenced ?? null }
      notice.year = yearOf(notice.reference)
      // La lista de abiertas enlaza a la página de inscripción, que es la que
      // le sirve al candidato, pero el calendario con la fecha de apertura está
      // en la ficha de la convocatoria, a la que enlazan las otras dos listas.
      // Se guardan las dos: `url` para el candidato, `infoUrl` para el bot.
      if (stage !== 'open') notice.infoUrl = row.url
      const key = keyOf(notice)
      const before = combined.get(key)
      combined.set(key, before ? { ...before, ...notice } : notice)
    }
  }
  return [...combined.values()].map((notice) => ({ id: keyOf(notice), ...notice }))
}

/** El número oficial de una convocatoria abierta, buscado por título en las otras listas. */
function matchReference(title, byStage) {
  const hits = new Set()
  for (const stage of ['in-progress', 'closed']) {
    for (const row of byStage[stage] ?? []) {
      if (row.reference && row.title.toLowerCase() === title.toLowerCase()) hits.add(row.reference)
    }
  }
  return hits.size === 1 ? [...hits][0] : null
}

/**
 * Funde lo leído hoy con lo que ya había guardado.
 *
 * Nunca borra: una convocatoria que deja de aparecer conserva su última fase
 * conocida, porque el tablón es también el archivo de lo que ha pasado. Y
 * `firstSeen` no se toca jamás, que es lo que permite decir «esto es nuevo».
 *
 * A propósito **no** se guarda ninguna marca de «revisado hoy»: si la hubiera,
 * el fichero cambiaría a diario y el repositorio se llenaría de commits que no
 * dicen nada. Que la revisión se hizo lo cuenta el historial de ejecuciones.
 *
 * @param {Array<object>} previous  Lo guardado.
 * @param {Array<object>} fetched   Lo leído hoy, ya combinado.
 * @param {string} today            AAAA-MM-DD.
 * @param {{ year: number }} opts   Año que se publica, además de todo lo abierto.
 */
export function mergeNotices(previous, fetched, today, { year }) {
  const before = new Map((previous ?? []).map((n) => [n.id, n]))
  const added = []
  const updated = []
  const result = []

  for (const notice of fetched) {
    const old = before.get(notice.id)
    // Del resto de años sólo entra lo que esté abierto ahora mismo; lo que ya
    // se guardó una vez se queda, que para eso es un archivo.
    if (!old && notice.stage !== 'open' && notice.year !== year) continue

    if (!old) {
      added.push(notice.id)
      result.push({ ...notice, firstSeen: today })
      continue
    }
    const merged = { ...old, ...notice, firstSeen: old.firstSeen ?? today }
    if (old.stage !== notice.stage) {
      merged.stageChangedOn = today
      updated.push(notice.id)
    } else if (
      ['deadline', 'grade', 'title', 'url', 'reference'].some(
        (k) => JSON.stringify(old[k] ?? null) !== JSON.stringify(merged[k] ?? null),
      ) ||
      JSON.stringify(old.locations ?? []) !== JSON.stringify(merged.locations ?? [])
    ) {
      merged.updatedOn = today
      updated.push(notice.id)
    }
    result.push(merged)
    before.delete(notice.id)
  }

  // Lo que ya no aparece en ninguna lista se conserva tal cual.
  for (const old of before.values()) result.push(old)

  // Orden estable: por fase, y dentro de cada fase lo que cierra antes o lo más
  // reciente. Así el fichero sólo cambia cuando cambia algo de verdad.
  result.sort(
    (a, b) =>
      STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) ||
      String(a.deadline ?? '').localeCompare(String(b.deadline ?? '')) ||
      String(b.reference ?? '').localeCompare(String(a.reference ?? '')) ||
      a.id.localeCompare(b.id),
  )

  return { notices: result, added, updated }
}

/**
 * El fichero del tablón, ya listo para guardar.
 *
 * `since` es el día en que este bot empezó a mirar, y se arrastra intacto de
 * una ejecución a otra. Sin él el tablón mentiría el primer día: enseñaría como
 * «nuevas» convocatorias que llevaban meses publicadas, porque lo único que
 * sabe `firstSeen` es cuándo las vimos nosotros. Con él, «nueva» significa
 * «apareció después de que empezáramos a vigilar», que es lo que el candidato
 * entiende al leerlo.
 */
export function buildFile(previous, notices, today, { year }) {
  return {
    format: BOARD_FORMAT,
    sources: LISTINGS.map((l) => ({ stage: l.stage, url: l.url })),
    year,
    since: previous?.since ?? today,
    notices,
  }
}
