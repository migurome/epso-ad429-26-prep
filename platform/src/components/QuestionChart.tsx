import { Markdown } from './Markdown'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import {
  floorOf,
  niceRange,
  niceScale,
  parsePromptChart,
  peakOf,
  stackedSegments,
  type ChartSpec,
} from '../lib/questionChart'

// El gráfico de una pregunta de razonamiento numérico.
//
// Reproduce el del libro, y por eso se aparta a propósito de lo que haría
// cualquier gráfico de un panel de datos:
//
//   · **No hay tooltip ni cifras sobre las barras.** En un panel serían
//     obligatorios; aquí regalarían la respuesta. Leer un valor de la
//     cuadrícula ES lo que se examina, y un número al pasar el ratón convierte
//     la pregunta en una lectura de etiqueta. Por eso la cuadrícula está más
//     marcada de lo que se estilaría: es el instrumento de medida.
//   · **La tabla se queda debajo, siempre visible.** Es la vía accesible —un
//     lector de pantalla no lee un SVG de barras— y el remedio documentado
//     para que unos colores claros sobre fondo claro no dejen fuera a nadie.
//
// Sólo claro: la web entera lo es, a propósito, y un gráfico oscuro aquí sería
// una isla.

/** La paleta categórica validada, en orden fijo. Nunca se cicla. */
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']

const W = 680
const H = 300
// Arriba cabe el rótulo de la unidad; abajo, las etiquetas del eje y el
// nombre de la categoría, en dos renglones distintos.
const PAD = { top: 26, right: 12, bottom: 52, left: 56 }
const PLOT = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom }

/** Hueco entre barras vecinas, para que dos colores no se toquen. */
const GAP = 2

export function QuestionChart({ spec }: { spec: ChartSpec }) {
  // Los números del eje siguen al idioma del enunciado, que es de donde salen
  // los datos: una tabla en español con un eje en «1,250» se lee como mil
  // doscientos cincuenta en un sitio y como uno coma dos en el otro.
  const locale = useTestLocaleStore((s) => s.locale)
  const intl = locale === 'es' ? 'es-ES' : 'en-GB'
  if (spec.kind === 'pie') return <PieChart spec={spec} />

  const stacked = spec.kind === 'stacked' || spec.kind === 'stacked100'

  // Las barras miden con su longitud y por eso arrancan en cero; las líneas
  // informan con la posición y la pendiente, y un eje desde cero aplastaría
  // contra una raya la variación que se pregunta. Ver niceRange.
  const scale =
    spec.kind === 'line' ? niceRange(floorOf(spec), peakOf(spec)) : niceScale(peakOf(spec))
  const base = scale.min ?? 0
  const centreX = (g: number) => PAD.left + g * groupW + groupW / 2
  const groups = spec.points.length
  const perGroup = spec.series.length
  const groupW = PLOT.w / Math.max(1, groups)
  const barW = Math.max(2, (groupW - GAP * (perGroup + 1)) / Math.max(1, perGroup))
  const y = (value: number) =>
    PAD.top + PLOT.h - ((value - base) / (scale.max - base)) * PLOT.h

  // Lo que mide cada eje, dicho por separado. Juntarlo todo en un renglón al
  // pie —que es lo que había— obligaba a adivinar si el «8000» de la
  // izquierda eran toneladas, personas o por ciento; y eso, en una pregunta
  // que se responde leyendo ese número de la cuadrícula, no es un detalle de
  // estilo.
  const axisLabel = spec.unit ? `${spec.category} · ${spec.unit}` : spec.category

  return (
    <figure className="my-4">
      {spec.series.length >= 2 && (
        <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {spec.series.map((s, i) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg border border-slate-200 bg-white"
        role="img"
        aria-label={axisLabel}
      >
        {spec.unit && (
          <text
            x={PAD.left - 48}
            y={14}
            className="fill-slate-500"
            style={{ fontSize: 11 }}
          >
            {spec.unit}
          </text>
        )}

        {/* La cuadrícula, que aquí es el instrumento de medida y no un adorno. */}
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? '#94a3b8' : '#e2e8f0'}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-slate-500"
              style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
            >
              {tick.toLocaleString(intl)}
            </text>
          </g>
        ))}

        {spec.kind === 'bar' &&
          spec.points.map((point, g) =>
            spec.series.map((s, i) => {
              const value = s.values[g]
              // Un hueco no se dibuja. Una barra de altura cero diría «cero»,
              // que es un dato, y aquí lo que hay es la ausencia de dato.
              if (value === null) return null
              const x = PAD.left + g * groupW + GAP + i * (barW + GAP)
              const top = y(Math.max(0, value))
              return (
                <rect
                  key={`${point}-${s.label}`}
                  x={x}
                  y={top}
                  width={barW}
                  height={Math.max(0, PAD.top + PLOT.h - top)}
                  rx={4}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                />
              )
            }),
          )}

        {stacked &&
          spec.points.map((point, g) =>
            stackedSegments(spec, g).map((seg) => {
              const top = y(seg.to)
              const bottom = y(seg.from)
              // El hueco de 2 px va DENTRO del tramo y sólo entre tramos, no
              // debajo del primero: separarlo de la base lo dejaría flotando.
              const gap = seg.from === 0 ? 0 : GAP
              return (
                <rect
                  key={`${point}-${seg.label}`}
                  x={PAD.left + g * groupW + groupW * 0.25}
                  y={top}
                  width={groupW * 0.5}
                  height={Math.max(0, bottom - top - gap)}
                  fill={SERIES_COLORS[seg.series % SERIES_COLORS.length]}
                />
              )
            }),
          )}

        {spec.kind === 'line' &&
          spec.series.map((s, i) => (
            <g key={s.label}>
              {segmentsOf(s.values).map((run, k) => (
                <polyline
                  key={k}
                  fill="none"
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={run.map(({ g, value }) => `${centreX(g)},${y(value)}`).join(' ')}
                />
              ))}
              {s.values.map((value, g) =>
                value === null ? null : (
                  <circle
                    key={g}
                    cx={centreX(g)}
                    cy={y(value)}
                    r={4}
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ),
              )}
            </g>
          ))}

        {spec.points.map((point, g) => (
          <text
            key={`${point}-${g}`}
            x={centreX(g)}
            y={H - PAD.bottom + 18}
            textAnchor="middle"
            className="fill-slate-600"
            style={{ fontSize: 12 }}
          >
            {point}
          </text>
        ))}

        <text
          x={PAD.left + PLOT.w / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-slate-500"
          style={{ fontSize: 11 }}
        >
          {spec.category}
        </text>
      </svg>
    </figure>
  )
}

/**
 * Un enunciado que puede traer un gráfico dentro.
 *
 * El gráfico se dibuja donde estaba la directiva —justo encima de su tabla—,
 * y no al principio ni al final del enunciado: en el libro el orden es frase,
 * gráfico, pregunta, y cambiarlo obliga a saltar arriba y abajo para entender
 * qué se pregunta sobre qué.
 *
 * Sin directiva, esto es exactamente un `<Markdown>`: las preguntas que no
 * traen gráfico no pagan nada por esto.
 */
export function PromptWithChart({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  // El idioma del enunciado decide cómo se leen sus números: `6.300` son
  // seis mil trescientos en español y seis coma tres en inglés.
  const locale = useTestLocaleStore((s) => s.locale)
  const parsed = parsePromptChart(children, locale)
  if (!parsed) return <Markdown className={className}>{children}</Markdown>

  return (
    <div className={className}>
      {parsed.before.trim() !== '' && <Markdown>{parsed.before}</Markdown>}
      <QuestionChart spec={parsed.spec} />
      <Markdown>{parsed.after}</Markdown>
    </div>
  )
}

/**
 * Los tramos continuos de una serie.
 *
 * Un hueco PARTE la línea en vez de saltárselo. Unir el punto de antes con el
 * de después dibujaría una pendiente entre dos años que nadie midió, y en
 * estas preguntas la pendiente es justo lo que se lee. Un punto suelto entre
 * dos huecos se queda como tramo de uno: su marcador sí se dibuja.
 */
export function segmentsOf(
  values: (number | null)[],
): Array<Array<{ g: number; value: number }>> {
  const runs: Array<Array<{ g: number; value: number }>> = []
  let run: Array<{ g: number; value: number }> = []
  values.forEach((value, g) => {
    if (value === null) {
      if (run.length > 0) runs.push(run)
      run = []
      return
    }
    run.push({ g, value })
  })
  if (run.length > 0) runs.push(run)
  return runs.filter((r) => r.length >= 2)
}

/** Un sector: dónde empieza, dónde acaba y cuánto vale. */
export interface Slice {
  label: string
  value: number
  from: number
  to: number
}

/**
 * Reparte un círculo entre los valores de una serie.
 *
 * **Se reparte sobre la suma real, no sobre 100.** Las tablas del libro vienen
 * redondeadas y no siempre cuadran: los grupos sanguíneos de la pregunta 109
 * suman 101 %. Dividir entre 100 dejaría un hueco de 3,6° en la tarta —una
 * rendija blanca que parecería un dato— y con sumas mayores los sectores se
 * solaparían. Dividiendo entre la suma, el círculo siempre cierra.
 *
 * Los huecos y los valores no positivos no ocupan sitio: un sector de cero
 * grados no se ve, pero se llevaría un color de la leyenda.
 */
export function slicesOf(labels: string[], values: (number | null)[]): Slice[] {
  const usable = labels
    .map((label, i) => ({ label, value: values[i] }))
    .filter((s): s is { label: string; value: number } => s.value !== null && s.value > 0)
  const total = usable.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0) return []

  let from = 0
  return usable.map((s) => {
    const to = from + (s.value / total) * 360
    const slice = { ...s, from, to }
    from = to
    return slice
  })
}

/** El contorno de un sector, en coordenadas de un círculo de radio `r`. */
export function slicePath(slice: Slice, cx: number, cy: number, r: number): string {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const span = slice.to - slice.from
  // Un sector de más de media vuelta necesita el arco largo, o el trazado
  // dibuja el complementario: la porción del 60 % saldría como el 40 %.
  const large = span > 180 ? 1 : 0
  const [x1, y1] = point(slice.from)
  const [x2, y2] = point(slice.to)
  // Una serie con un solo valor ocupa el círculo entero, y un arco de 360°
  // tiene el mismo principio y final: no dibujaría nada.
  if (span >= 359.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
  }
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

/**
 * Los gráficos circulares.
 *
 * Una tarta por serie —la pregunta 109 del libro son dos, Rh+ y Rh−— y una
 * sola leyenda para todas, porque los sectores son los mismos y repetirla
 * sugeriría que no lo son.
 *
 * **Aquí SÍ se escribe el valor sobre el sector**, al revés que en las barras.
 * No es una excepción caprichosa: en el libro las tartas llevan su porcentaje
 * impreso, y estimar a ojo el ángulo de un sector no es una destreza que el
 * examen mida. En las barras el valor se lee de la cuadrícula y escribirlo
 * regalaría la respuesta; aquí, callarlo inventaría una dificultad que la
 * prueba real no tiene.
 */
function PieChart({ spec }: { spec: ChartSpec }) {
  const R = 78
  const BOX = 190

  return (
    <figure className="my-4">
      <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {spec.points.map((point, i) => (
          <span key={point} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            {point}
          </span>
        ))}
      </figcaption>

      <div className="flex flex-wrap justify-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
        {spec.series.map((serie) => (
          <div key={serie.label} className="text-center">
            <svg
              viewBox={`0 0 ${BOX} ${BOX}`}
              className="w-40"
              role="img"
              aria-label={`${spec.category} — ${serie.label}`}
            >
              {slicesOf(spec.points, serie.values).map((slice) => {
                const i = spec.points.indexOf(slice.label)
                const mid = ((slice.from + slice.to) / 2 - 90) * (Math.PI / 180)
                return (
                  <g key={slice.label}>
                    <path
                      d={slicePath(slice, BOX / 2, BOX / 2, R)}
                      fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                    <text
                      x={BOX / 2 + R * 0.62 * Math.cos(mid)}
                      y={BOX / 2 + R * 0.62 * Math.sin(mid) + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      style={{ fontSize: 12, fontWeight: 600 }}
                    >
                      {spec.unit === '%' ? `${slice.value}%` : slice.value}
                    </text>
                  </g>
                )
              })}
            </svg>
            {spec.series.length > 1 && (
              <p className="mt-1 text-xs font-medium text-slate-600">{serie.label}</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-1 text-center text-xs text-slate-500">{spec.category}</p>
    </figure>
  )
}
