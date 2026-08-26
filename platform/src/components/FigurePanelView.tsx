import clsx from 'clsx'
import { ShapeIcon } from './ShapeIcon'
import type { FigurePanel, Position, SizeKind } from '../lib/abstractFigure'

const POSITION_CELL: Record<Position, number> = {
  'top-left': 0, 'top-centre': 1, 'top-right': 2,
  'mid-left': 3, centre: 4, 'mid-right': 5,
  'bottom-left': 6, 'bottom-centre': 7, 'bottom-right': 8,
}

const FRAME_PX: Record<SizeKind, string> = {
  small: 'h-16 w-16',
  medium: 'h-20 w-20',
  large: 'h-24 w-24',
  'extra-large': 'h-28 w-28',
}

function PositionFrame({ position, size, children }: { position: Position; size: SizeKind; children: React.ReactNode }) {
  const activeCell = POSITION_CELL[position]
  return (
    <div className={clsx('grid grid-cols-3 grid-rows-3 rounded-lg border border-dashed border-slate-300 p-1', FRAME_PX[size])}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {i === activeCell ? children : null}
        </div>
      ))}
    </div>
  )
}

interface FigurePanelViewProps {
  panel: FigurePanel
  large?: boolean
  /** Fuerza el tamaño de los iconos, ignorando `large`. Se usa para encoger
   * secuencias con muchos paneles y evitar que necesiten scroll horizontal. */
  sizeOverride?: SizeKind
}

export function FigurePanelView({ panel, large, sizeOverride }: FigurePanelViewProps) {
  if (panel.isBlank) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-300',
          sizeOverride ? FRAME_PX[sizeOverride] : large ? 'h-24 w-24 text-3xl' : 'h-14 w-14 text-xl',
        )}
      >
        ?
      </div>
    )
  }

  if (panel.shapes.length === 0) {
    return (
      <div className={clsx('flex max-w-[7rem] items-center justify-center text-center text-slate-500', large ? 'text-sm' : 'text-xs')}>
        {panel.caption ?? panel.raw}
      </div>
    )
  }

  const resolveSize = (s: SizeKind): SizeKind => {
    if (sizeOverride) return sizeOverride
    if (large) return s === 'medium' ? 'large' : s
    return s
  }

  if (panel.position) {
    // Dentro de la rejilla 3×3, el icono tiene que caber en UNA celda
    // (~1/3 del marco) para que la posición se distinga a simple vista. Con
    // el tamaño normal del icono (pensado para un panel sin marco) el icono
    // es más grande que la celda entera y desborda sobre las vecinas,
    // haciendo que dos posiciones distintas (p. ej. "mid-left" vs
    // "top-centre") se vean casi iguales. Se usa el tamaño 'small' fijo
    // para el icono aquí, sea cual sea el tamaño declarado en el texto.
    const framedIcons = (
      <div className="flex flex-wrap items-center justify-center gap-0.5">
        {panel.shapes.map((s, i) => (
          <ShapeIcon key={i} spec={{ ...s, size: 'small' }} />
        ))}
      </div>
    )
    return (
      <div className="flex flex-col items-center gap-1.5">
        <PositionFrame position={panel.position} size={sizeOverride ?? (large ? 'large' : 'medium')}>
          {framedIcons}
        </PositionFrame>
        {panel.caption && (
          <span className="max-w-[7rem] text-center text-[10px] leading-tight text-slate-400">{panel.caption}</span>
        )}
      </div>
    )
  }

  const icons = (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {panel.shapes.map((s, i) => (
        <ShapeIcon key={i} spec={{ ...s, size: resolveSize(s.size) }} />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-1.5">
      {icons}
      {panel.caption && (
        <span className="max-w-[7rem] text-center text-[10px] leading-tight text-slate-400">{panel.caption}</span>
      )}
    </div>
  )
}
