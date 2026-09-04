import { SequenceArrow } from './SequenceArrow'
import { FigurePanelView } from './FigurePanelView'
import { Markdown } from './Markdown'
import { extractPromptFigures, type FigurePanel, type SizeKind } from '../lib/abstractFigure'

interface AbstractPromptViewProps {
  prompt: string
  large?: boolean
  /** Dibujar iconos sería engañoso en esta pregunta (ver `panelsDrawable`):
   * se mantiene la estructura de secuencia, pero cada panel se muestra con su
   * texto completo. */
  forceText?: boolean
}

// Encoge los iconos cuando hay muchos paneles/símbolos, para que la secuencia
// quepa en una fila sin depender de scroll horizontal. Se basa en el total de
// formas a dibujar (un panel puede agrupar varios símbolos), no solo en el
// número de paneles.
function sequenceIconSize(panels: FigurePanel[], baseLarge: boolean | undefined): SizeKind {
  const totalShapes = panels.reduce((sum, p) => sum + Math.max(1, p.shapes.length), 0)
  if (baseLarge) {
    if (totalShapes <= 5) return 'large'
    if (totalShapes <= 8) return 'medium'
    return 'small'
  }
  if (totalShapes <= 6) return 'medium'
  return 'small'
}

/** Un panel de la secuencia mostrado como texto. Se usa cuando la pregunta
 * entera va en texto, para que los paneles sigan leyéndose como una
 * secuencia comparable (misma anchura, mismo orden) en vez de fundirse en un
 * párrafo corrido. */
function TextPanel({ panel, large }: { panel: FigurePanel; large?: boolean }) {
  if (panel.isBlank) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 ${
          large ? 'h-20 w-20 text-3xl' : 'h-16 w-16 text-2xl'
        }`}
      >
        ?
      </div>
    )
  }
  return (
    <div
      className={`flex min-h-16 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 ${
        large ? 'w-44 text-sm' : 'w-40 text-xs'
      }`}
    >
      <span className="leading-relaxed">{panel.raw}</span>
    </div>
  )
}

export function AbstractPromptView({ prompt, large, forceText }: AbstractPromptViewProps) {
  const figures = extractPromptFigures(prompt)

  if (!figures) {
    return <Markdown>{prompt}</Markdown>
  }

  const sequenceSize = figures.kind === 'sequence' ? sequenceIconSize(figures.panels, large) : undefined

  return (
    <div>
      {figures.kind === 'sequence' && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-3">
          {figures.panels.map((panel, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {forceText ? (
                <TextPanel panel={panel} large={large} />
              ) : (
                <FigurePanelView panel={panel} sizeOverride={sequenceSize} />
              )}
              {i < figures.panels.length - 1 && (
                <SequenceArrow
                  size={forceText ? 16 : sequenceSize === 'small' ? 12 : large ? 20 : 16}
                  className="shrink-0 text-slate-300"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {figures.kind === 'matrix' && (
        <div className="mb-4 overflow-x-auto">
          <div
            className="mx-auto grid w-fit gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"
            style={{ gridTemplateColumns: `repeat(${figures.columns ?? 3}, minmax(0, 1fr))` }}
          >
            {figures.panels.map((panel, i) => (
              <div key={i} className="flex items-center justify-center rounded-lg bg-white p-2 shadow-sm">
                {forceText ? <TextPanel panel={panel} large={large} /> : <FigurePanelView panel={panel} large={large} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {figures.remainderMd && <Markdown className="text-sm">{figures.remainderMd}</Markdown>}
    </div>
  )
}
