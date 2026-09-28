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
  /** El suelo del eje. Cero en las barras; en las líneas puede no serlo. */
  min?: number
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
  if (top === 0) return { max: 1, min: 0, step: 1, ticks: [0, 1] }

  const rough = top / Math.max(1, wanted)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude
  const max = Math.ceil(top / step) * step

  const ticks: number[] = []
  // Se construyen multiplicando y no acumulando: sumar 2,5 diez veces deja
  // 24,999999999999996 y una etiqueta con catorce decimales.
  for (let i = 0; i * step <= max + step / 1000; i += 1) ticks.push(i * step)
  return { max, min: 0, step, ticks }
}

/** El mayor valor de un gráfico, para escalarlo. Los huecos no cuentan. */
export function peakOf(spec: ChartSpec): number {
  const all = spec.series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  // Una apilada al 100 % llega al 100 por definición, sumen lo que sumen sus
  // celdas: las del libro vienen redondeadas y alguna columna suma 99 o 101.
  // Escalar al mayor dejaría la más alta tocando el techo y las demás cortas,
  // y la gracia de este gráfico es justamente que todas midan lo mismo.
  if (spec.kind === 'stacked100') return 100
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

/** Un tramo de una columna apilada, en unidades del eje. */
export interface Segment {
  label: string
  /** Índice de la serie, para que conserve su color aunque falten tramos. */
  series: number
  from: number
  to: number
}

/**
 * Los tramos de una columna apilada, de abajo arriba.
 *
 * En la variante al 100 % cada columna se reparte sobre SU PROPIA suma y no
 * sobre 100. Las tablas del libro vienen redondeadas y no siempre cuadran —los
 * ámbitos de la 109 suman 101—; repartir sobre 100 dejaría columnas que no
 * llegan al techo o que se salen, y en un gráfico cuya única promesa es que
 * todas las columnas miden igual, eso es justo lo que no puede pasar.
 *
 * Un hueco no ocupa sitio: no es un cero, es un dato que no está.
 */
export function stackedSegments(spec: ChartSpec, point: number): Segment[] {
  const values = spec.series.map((s) => s.values[point])
  const total = values.reduce<number>((sum, v) => sum + (v != null && v > 0 ? v : 0), 0)
  if (total <= 0) return []
  const scale = spec.kind === 'stacked100' ? 100 / total : 1

  const out: Segment[] = []
  let from = 0
  values.forEach((value, i) => {
    if (value == null || value <= 0) return
    const to = from + value * scale
    out.push({ label: spec.series[i].label, series: i, from, to })
    from = to
  })
  return out
}

/** El menor valor de un gráfico. Los huecos no cuentan. */
export function floorOf(spec: ChartSpec): number {
  const all = spec.series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  return all.length === 0 ? 0 : Math.min(...all)
}

/**
 * La escala de un gráfico de LÍNEAS, que no empieza en cero.
 *
 * Es la única excepción a la regla de arriba, y tiene motivo. En una barra la
 * longitud ES la magnitud: recortar el eje hace que media barra parezca la
 * mitad sin serlo. En una línea lo que informa es la POSICIÓN y, sobre todo,
 * la pendiente. La pregunta 89 va de 21.000 a 24.000 accidentes: con el eje
 * desde cero esos cinco puntos caen sobre la misma raya y la variación —que
 * es lo que se pregunta— deja de poder leerse.
 *
 * Aun así no se recorta a lo bruto: el suelo y el techo caen en múltiplos del
 * paso, para que las líneas de la cuadrícula sigan siendo números legibles, y
 * se deja un paso de aire a cada lado para que ningún punto quede pegado al
 * borde. Si los datos ya rozan el cero, se usa el cero.
 */
export function niceRange(minValue: number, maxValue: number, wanted = 5): Scale {
  const span = maxValue - minValue
  if (span <= 0) return niceScale(maxValue)

  const rough = span / Math.max(1, wanted)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude

  let min = Math.floor(minValue / step) * step
  const max = Math.ceil(maxValue / step) * step
  // Un suelo positivo pero pequeño comparado con el paso significa que los
  // datos llegan casi al cero: entonces el cero es el sitio honrado.
  if (min > 0 && min < step) min = 0

  const ticks: number[] = []
  for (let i = 0; min + i * step <= max + step / 1000; i += 1) ticks.push(min + i * step)
  return { max, min, step, ticks }
}
