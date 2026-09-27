// El gráfico de una pregunta de razonamiento numérico.
//
// En el libro real, la mitad de los enunciados no traen una tabla: traen un
// gráfico de barras del que hay que LEER los valores. Esa lectura es parte de
// lo que se examina, así que una transcripción a tabla —que es lo que había—
// deja la pregunta más fácil que en el examen.
//
// Esto se parsea aquí y no en `build_content.py` por lo mismo que la notación
// de figuras abstractas: al hacerlo al pintar, el enunciado que se lee es el
// del idioma activo y los rótulos salen traducidos sin duplicar nada. Los
// números viven en un solo sitio, la tabla del documento, y el gráfico se
// deriva de ella: corregir un dato es corregirlo una vez.
//
// La directiva es un comentario de HTML, invisible al leer el documento:
//
//     <!-- chart: bar x="Year" unit="tonnes" -->
//
//     | Year | Cod | Hake |
//     | ---- | --- | ---- |
//     | 2008 | ~500 | ~1,250 |

export type ChartKind = 'bar' | 'stacked' | 'stacked100' | 'line' | 'pie'

/** El idioma del enunciado, que decide cómo se leen sus números. */
export type ChartLocale = 'es' | 'en'

const KINDS: ChartKind[] = ['bar', 'stacked', 'stacked100', 'line', 'pie']

export interface ChartSeries {
  label: string
  /** Un hueco de la tabla es `null`: no se dibuja, y no se cuenta como cero. */
  values: (number | null)[]
}

export interface ChartSpec {
  kind: ChartKind
  /** Rótulo de la columna de categorías, para el eje. */
  category: string
  unit?: string
  /** Las etiquetas del eje, una por fila de la tabla. */
  points: string[]
  series: ChartSeries[]
  /** La tabla traía valores aproximados (`~`, `≈`), leídos de la cuadrícula. */
  approx: boolean
}

/** Lo que hay que pintar de un enunciado: el texto, el gráfico y el resto. */
export interface PromptChart {
  /** Lo anterior a la directiva. */
  before: string
  spec: ChartSpec
  /** La directiva incluida y lo que sigue: la tabla y la pregunta. */
  after: string
}

const DIRECTIVE = /<!--\s*chart:\s*([^>]*?)\s*-->/

/**
 * Un número de una celda, o null si la celda no lo trae.
 *
 * **Se lee según el idioma del enunciado, y no es un detalle.** En el documento
 * inglés seis mil trescientos se escribe `6,300`; en el español, `6.300`. Con
 * una sola regla uno de los dos acaba valiendo `6,3` —una barra mil veces más
 * baja de lo que debe, en una pregunta cuya respuesta es ese número—. Es el
 * fallo que no se ve: el gráfico sale dibujado, sólo que mintiendo.
 *
 * Acepta además las marcas con que vienen escritos: `~500`, `≈ 32`, `60%`, `-3`.
 * Lo que no sea un número se lee como hueco, nunca como cero: un cero dibujado
 * donde no hay dato es una barra que afirma algo que nadie midió.
 */
export function cellValue(raw: string, locale: ChartLocale = 'en'): number | null {
  const sinMarcas = raw
    .replace(/[~≈*]/g, '')
    .replace(/\s/g, '')
    .replace(/%$/, '')
  const cleaned =
    locale === 'es'
      ? sinMarcas.replace(/\./g, '').replace(/,/g, '.')
      : sinMarcas.replace(/,/g, '')
  if (cleaned === '' || cleaned === '—' || cleaned === '-') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** Las celdas de una fila de tabla Markdown, sin los bordes. */
function cells(line: string): string[] {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
}

function isSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-')
}

/** Los atributos de la directiva: `x="Year" unit="tonnes"`. */
function attributes(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of text.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2]
  return out
}

/**
 * Lee la directiva y la tabla que la sigue.
 *
 * Devuelve null en cuanto algo no cuadra —no hay directiva, el tipo no se
 * reconoce, no hay tabla debajo, o la tabla no tiene ninguna serie—. Nunca
 * inventa: una pregunta sin gráfico legible se queda con su tabla, que es
 * exactamente lo que había antes y sigue siendo correcto.
 */
export function parsePromptChart(
  markdown: string,
  locale: ChartLocale = 'en',
): PromptChart | null {
  const found = markdown.match(DIRECTIVE)
  if (!found || found.index === undefined) return null

  const [kindWord, ...rest] = found[1].trim().split(/\s+/)
  const kind = KINDS.find((k) => k === kindWord)
  if (!kind) return null

  const attrs = attributes(rest.join(' '))
  const after = markdown.slice(found.index)
  const lines = after.split('\n')

  // La tabla es la primera línea con tuberías que venga después.
  const headerAt = lines.findIndex((l) => l.includes('|'))
  if (headerAt === -1 || !isSeparator(lines[headerAt + 1] ?? '')) return null

  const headers = cells(lines[headerAt])
  const rows: string[][] = []
  for (let i = headerAt + 2; i < lines.length; i += 1) {
    if (!lines[i].includes('|')) break
    rows.push(cells(lines[i]))
  }
  if (rows.length === 0 || headers.length < 2) return null

  const points = rows.map((r) => r[0] ?? '')
  const series: ChartSeries[] = headers.slice(1).map((label, col) => ({
    label,
    values: rows.map((r) => cellValue(r[col + 1] ?? '', locale)),
  }))
  // Una serie entera sin un solo número no se dibuja: sería una leyenda que
  // nombra algo que no está en el gráfico.
  const drawn = series.filter((s) => s.values.some((v) => v !== null))
  if (drawn.length === 0) return null

  return {
    before: markdown.slice(0, found.index),
    after,
    spec: {
      kind,
      category: attrs.x || headers[0] || '',
      ...(attrs.unit ? { unit: attrs.unit } : {}),
      points,
      series: drawn,
      approx: /[~≈]/.test(rows.flat().join('')),
    },
  }
}

export interface Scale {
  /** El tope del eje, siempre un número redondo y >= al mayor valor. */
  max: number
  /** Distancia entre líneas de la cuadrícula. */
  step: number
  /** Los valores donde va una línea, de 0 al tope. */
  ticks: number[]
}

/**
 * La escala del eje vertical.
 *
 * Es la pieza que más fácil hace mentir a un gráfico. Dos reglas:
 *
 *   · **Empieza en cero, siempre.** Un eje recortado exagera las diferencias,
 *     y aquí las diferencias son lo que se pregunta: media barra contra una
 *     entera tiene que significar la mitad, no «un poco menos».
 *   · **El tope es redondo.** Los valores de estas preguntas se leen de la
 *     cuadrícula, así que las líneas tienen que caer en números que se puedan
 *     leer —25, 50, 100, 250…—, no en 1.383,33.
 */
export function niceScale(maxValue: number, wanted = 5): Scale {
  const top = Math.max(maxValue, 0)
  if (top === 0) return { max: 1, step: 1, ticks: [0, 1] }

  const rough = top / Math.max(1, wanted)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const max = Math.ceil(top / step) * step

  const ticks: number[] = []
  // Se construyen multiplicando y no acumulando: sumar 2,5 diez veces deja
  // 24,999999999999996 y una etiqueta con catorce decimales.
  for (let i = 0; i * step <= max + step / 1000; i += 1) ticks.push(i * step)
  return { max, step, ticks }
}

/** El mayor valor de un gráfico, para escalarlo. Los huecos no cuentan. */
export function peakOf(spec: ChartSpec): number {
  const all = spec.series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  if (spec.kind === 'stacked') {
    // Apiladas: lo que tiene que caber es la suma de cada columna.
    return Math.max(
      0,
      ...spec.points.map((_, i) =>
        spec.series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
      ),
    )
  }
  return all.length === 0 ? 0 : Math.max(...all)
}
