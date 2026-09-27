import { Markdown } from './Markdown'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { niceScale, parsePromptChart, peakOf, type ChartSpec } from '../lib/questionChart'

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
const PAD = { top: 10, right: 12, bottom: 38, left: 56 }
const PLOT = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom }

/** Hueco entre barras vecinas, para que dos colores no se toquen. */
const GAP = 2

export function QuestionChart({ spec }: { spec: ChartSpec }) {
  // Los números del eje siguen al idioma del enunciado, que es de donde salen
  // los datos: una tabla en español con un eje en «1,250» se lee como mil
  // doscientos cincuenta en un sitio y como uno coma dos en el otro.
  const locale = useTestLocaleStore((s) => s.locale)
  const intl = locale === 'es' ? 'es-ES' : 'en-GB'
  // De momento sólo barras agrupadas. Los demás tipos del libro —líneas,
  // apiladas, sectores— se quedan sin dibujar: la pregunta enseña su tabla,
  // que es exactamente lo que hacía antes y sigue siendo correcto.
  if (spec.kind !== 'bar') return null

  const scale = niceScale(peakOf(spec))
  const groups = spec.points.length
  const perGroup = spec.series.length
  const groupW = PLOT.w / Math.max(1, groups)
  const barW = Math.max(2, (groupW - GAP * (perGroup + 1)) / Math.max(1, perGroup))
  const y = (value: number) => PAD.top + PLOT.h - (value / scale.max) * PLOT.h

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

        {spec.points.map((point, g) => (
          <g key={`${point}-${g}`}>
            {spec.series.map((s, i) => {
              const value = s.values[g]
              // Un hueco no se dibuja. Una barra de altura cero diría «cero»,
              // que es un dato, y aquí lo que hay es la ausencia de dato.
              if (value === null) return null
              const x = PAD.left + g * groupW + GAP + i * (barW + GAP)
              const top = y(Math.max(0, value))
              return (
                <rect
                  key={s.label}
                  x={x}
                  y={top}
                  width={barW}
                  height={Math.max(0, PAD.top + PLOT.h - top)}
                  rx={4}
                  fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                />
              )
            })}
            <text
              x={PAD.left + g * groupW + groupW / 2}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
              className="fill-slate-600"
              style={{ fontSize: 12 }}
            >
              {point}
            </text>
          </g>
        ))}

        <text
          x={PAD.left}
          y={H - 6}
          className="fill-slate-400"
          style={{ fontSize: 11 }}
        >
          {axisLabel}
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
