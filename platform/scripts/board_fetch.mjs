#!/usr/bin/env node
// El bot del tablón: mira los listados de EPSO y apunta en
// `Docs/board/notices.json` lo que ve.
//
//   node scripts/board_fetch.mjs                  # lee la web y guarda
//   node scripts/board_fetch.mjs --dry-run        # lee y cuenta, sin escribir
//   node scripts/board_fetch.mjs --year 2026      # año que se publica entero
//   node scripts/board_fetch.mjs --from carpeta   # lee ficheros, sin red
//                                                 # (open.html, in-progress.html,
//                                                 #  closed.html, detail.html)
//
// Corre una vez al día desde GitHub Actions: tres peticiones para los listados
// y una más por cada convocatoria a la que todavía le falte la fecha de
// apertura, que se pide **una sola vez** y se guarda. En régimen normal son
// tres peticiones diarias. Van con su identificación, espaciadas, con
// reintentos y respetando `Retry-After`, porque el sitio limita el ritmo.
//
// Sale con código 1 si un listado cambió de forma o si no se pudo leer: en el
// cron eso se ve como ejecución fallida, que es exactamente lo que queremos.
// Lo que nunca hace es escribir un listado vacío por no haber entendido la
// página.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BOARD_FORMAT,
  BoardStructureError,
  LISTINGS,
  buildFile,
  combineListings,
  mergeNotices,
  pagerLinks,
  parseListing,
  parseOpenedOn,
  yearOf,
} from './lib/epsoBoard.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')
const OUT = resolve(REPO, 'Docs/board/notices.json')
const UA = 'epso-ad429-26-prep-board/1.0 (+https://github.com/migurome/epso-ad429-26-prep)'
const MAX_PAGES = 8
// Tope de fichas por ejecución: si algún día hubiera cien convocatorias nuevas
// de golpe, se piden hoy las primeras y mañana el resto, en vez de soltarle
// cien peticiones seguidas a EPSO.
const MAX_DETAILS = 12
const PAUSE = 1500

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

async function fetchPage(url, tries = 3) {
  for (let attempt = 1; ; attempt++) {
    let response
    try {
      response = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'text/html' },
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      })
    } catch (error) {
      if (attempt >= tries) throw new Error(`no se pudo pedir ${url}: ${error.message}`)
      await sleep(attempt * 5000)
      continue
    }
    if (response.ok) return await response.text()
    // 429 y 5xx son «vuelve luego»; el resto no mejora reintentando.
    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt >= tries) {
      throw new Error(`${url} respondió ${response.status} ${response.statusText}`)
    }
    const after = Number(response.headers.get('retry-after'))
    await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 60) * 1000 : attempt * 5000)
  }
}

/** Número de página de un enlace del paginador, para recorrerlas en orden. */
const pageNumber = (url) => Number(/[?&]page=(\d+)/.exec(url)?.[1] ?? 0)

/** Las tres listas, cada una con sus filas ya leídas. */
async function readListings(read, year, counter) {
  const byStage = {}

  for (const listing of LISTINGS) {
    const first = await read(listing.url, counter)
    const rows = parseListing(first, { sourceUrl: listing.url, expect: listing.expect })

    // Sólo la lista de cerradas pagina, y viene de más reciente a más antigua:
    // mientras una página traiga convocatorias del año que se publica, puede
    // haber más en la siguiente; cuando deja de traerlas, lo que queda es más
    // viejo y no hace falta seguir pidiendo páginas.
    if (listing.paged) {
      let keepGoing = rows.some((row) => yearOf(row.reference) === year)
      const pages = pagerLinks(first, { sourceUrl: listing.url })
        .sort((a, b) => pageNumber(a) - pageNumber(b))
        .slice(0, MAX_PAGES)
      for (const page of pages) {
        if (!keepGoing) break
        const parsed = parseListing(await read(page, counter), {
          sourceUrl: page,
          expect: listing.expect,
        })
        rows.push(...parsed)
        keepGoing = parsed.some((row) => yearOf(row.reference) === year)
      }
    }

    byStage[listing.stage] = rows
  }
  return byStage
}

/**
 * Completa la fecha de apertura de las convocatorias que aún no la tienen.
 *
 * Se guarda incluso cuando la ficha no la trae (queda en null), para no volver
 * a pedir todos los días una página que ya sabemos que no la publica.
 */
async function fillOpenedOn(notices, read, counter) {
  let asked = 0
  for (const notice of notices) {
    if (notice.openedOn !== undefined) continue
    if (asked >= MAX_DETAILS) break
    // La ficha, no la página de inscripción: el calendario está en aquélla.
    notice.openedOn = parseOpenedOn(await read(notice.infoUrl ?? notice.url, counter))
    asked++
  }
  return asked
}

function loadPrevious(file) {
  if (!existsSync(file)) return { notices: [] }
  const saved = JSON.parse(readFileSync(file, 'utf8'))
  if (saved.format !== BOARD_FORMAT) {
    // Un formato viejo no se «actualiza» a la ligera: el fichero es el archivo
    // de lo visto, y convertirlo mal perdería fechas que no se pueden
    // recuperar.
    throw new Error(
      `${file} está en formato ${saved.format} y este bot escribe el ${BOARD_FORMAT}. ` +
        'Conviértelo a mano o bórralo si prefieres empezar el archivo de cero.',
    )
  }
  return saved
}

async function main(argv) {
  const dir = argv.includes('--from') ? argv[argv.indexOf('--from') + 1] : null
  const dryRun = argv.includes('--dry-run')
  const year = argv.includes('--year')
    ? Number(argv[argv.indexOf('--year') + 1])
    : new Date().getFullYear()
  if (!Number.isInteger(year)) {
    throw new Error(`--year no es un año: ${argv[argv.indexOf('--year') + 1]}`)
  }

  // En local cada listado es un fichero suelto y las fichas comparten uno; la
  // paginación no se simula.
  const fileFor = (url) => {
    const listing = LISTINGS.find((l) => l.url === url)
    return join(dir, listing ? `${listing.stage}.html` : 'detail.html')
  }
  const counter = { requests: 0 }
  const read = async (url, count) => {
    count.requests++
    if (!dir) {
      if (count.requests > 1) await sleep(PAUSE)
      return await fetchPage(url)
    }
    const file = fileFor(url)
    return existsSync(file) ? readFileSync(file, 'utf8') : ''
  }

  const byStage = await readListings(read, year, counter)
  const fetched = combineListings(byStage)
  const previous = loadPrevious(OUT)
  const today = new Date().toISOString().slice(0, 10)
  const { notices, added, updated } = mergeNotices(previous.notices, fetched, today, { year })
  const details = await fillOpenedOn(notices, read, counter)

  const text = `${JSON.stringify(buildFile(previous, notices, today, { year }), null, 2)}\n`
  const unchanged = existsSync(OUT) && readFileSync(OUT, 'utf8') === text

  const counts = Object.fromEntries(Object.entries(byStage).map(([k, v]) => [k, v.length]))
  console.log(
    `${counter.requests} petición(es) · listados ${JSON.stringify(counts)} · ` +
      `${details} ficha(s) consultada(s) · publicando ${year} y todo lo abierto`,
  )
  console.log(
    `${notices.length} en el tablón · ${added.length} nueva(s), ${updated.length} con cambios`,
  )
  for (const id of added) console.log(`  nueva     ${id}`)
  for (const id of updated) console.log(`  cambia    ${id}`)

  if (unchanged) {
    console.log('sin cambios: no se toca el fichero')
    return 0
  }
  if (dryRun) {
    console.log('--dry-run: no se escribe nada')
    return 0
  }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, text, 'utf8')
  console.log(`escrito ${OUT}`)
  return 0
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    if (error instanceof BoardStructureError) {
      console.error(`Un listado de EPSO ha cambiado de forma:\n  ${error.message}`)
    } else {
      console.error(`No se pudieron leer los listados de EPSO:\n  ${error.message}`)
    }
    console.error('El fichero del tablón se queda como estaba.')
    process.exit(1)
  },
)
