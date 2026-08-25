import { SequenceArrow } from './SequenceArrow'
import { FigurePanelView } from './FigurePanelView'
import { Markdown } from './Markdown'
import { extractPromptFigures, type FigurePanel, type SizeKind } from '../lib/abstractFigure'

interface AbstractPromptViewProps {
  prompt: string
  large?: boolean
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

export function AbstractPromptView({ prompt, large }: AbstractPromptViewProps) {
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
              <FigurePanelView panel={panel} sizeOverride={sequenceSize} />
              {i < figures.panels.length - 1 && (
                <SequenceArrow size={sequenceSize === 'small' ? 12 : large ? 20 : 16} className="shrink-0 text-slate-300" />
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
                <FigurePanelView panel={panel} large={large} />
              </div>
            ))}
          </div>
        </div>
      )}

      {figures.remainderMd && <Markdown className="text-sm">{figures.remainderMd}</Markdown>}
    </div>
  )
}
