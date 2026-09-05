import clsx from 'clsx'
import { ShapeIcon } from './ShapeIcon'
import { asPlainNotation, type FigurePanel, type Position, type ShapeSpec, type SizeKind } from '../lib/abstractFigure'

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

/** Lado del icono dentro de una celda de la rejilla, según cuántas figuras
 * comparten esa celda. El banco pone hasta seis en la misma ("■■■ arriba,
 * □ ■ □□"): a tamaño normal se salen del marco y se montan sobre el párrafo
 * de debajo, así que se encogen para caber. */
function cellIconPx(count: number): number {
  if (count <= 1) return 24
  if (count === 2) return 16
  if (count <= 4) return 12
  return 9
}

/** Rejilla 3×3 que dibuja el contenido de CADA celda que tenga alguna forma
 * asignada — no solo una celda activa. Varias formas del mismo panel pueden
 * tener posiciones distintas ("hexágono arriba-izquierda + círculo
 * abajo-izquierda"), y cada una debe aparecer en su propia celda, no todas
 * amontonadas en una sola. */
function PositionFrame({ cells, size }: { cells: Map<number, React.ReactNode>; size: SizeKind }) {
  return (
    <div className={clsx('grid grid-cols-3 grid-rows-3 rounded-lg border border-dashed border-slate-300 p-1', FRAME_PX[size])}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {cells.get(i) ?? null}
        </div>
      ))}
    </div>
  )
}

/** Pie del panel. Cuando el panel es PARCIAL, ese pie no es decoración: es la
 * parte de la figura que no hemos sabido dibujar, y es lo único que distingue
 * esa opción de las demás. Se muestra legible, no en gris diminuto. */
function Caption({ panel }: { panel: FigurePanel }) {
  return (
    <span
      className={clsx(
        'max-w-[7rem] text-center leading-tight',
        panel.partial ? 'text-xs text-slate-600' : 'text-[10px] text-slate-400',
      )}
    >
      {asPlainNotation(panel.caption ?? '')}
    </span>
  )
}

interface FigurePanelViewProps {
  panel: FigurePanel
  large?: boolean
  /** Tamaño BASE de los iconos, ignorando `large`. Se usa para encoger
   * secuencias con muchos paneles y evitar el scroll horizontal. No aplana la
   * escala: la desplaza entera, para que una figura que el texto declara
   * grande siga viéndose más grande que sus vecinas — en varias preguntas del
   * banco la regla es justamente el tamaño. */
  sizeOverride?: SizeKind
  /** Dibujar el marco de posición 3×3 aunque este panel no lleve posiciones.
   * Es una decisión de grupo: si una sola de las cinco opciones la lleva y las
   * demás no, unas salen enmarcadas y otras sueltas, y dejan de compararse. */
  framed?: boolean
}

const SIZE_ORDER: SizeKind[] = ['small', 'medium', 'large', 'extra-large']

/** Desplaza un tamaño tantos pasos como haga falta para dejar 'medium' en
 * `base`, conservando las diferencias relativas dentro del panel. */
function shiftSize(size: SizeKind, base: SizeKind): SizeKind {
  const shift = SIZE_ORDER.indexOf(base) - SIZE_ORDER.indexOf('medium')
  const index = Math.min(SIZE_ORDER.length - 1, Math.max(0, SIZE_ORDER.indexOf(size) + shift))
  return SIZE_ORDER[index]
}

export function FigurePanelView({ panel, large, sizeOverride, framed }: FigurePanelViewProps) {
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
    if (sizeOverride) return shiftSize(s, sizeOverride)
    if (large) return shiftSize(s, 'large')
    return s
  }

  // Filas apiladas ("[○○ / ▲▼▲ / ○○○○]"): cada fila lleva tantas figuras como
  // diga el texto, así que NO caben en una celda de la rejilla 3×3. Se dibujan
  // como filas de verdad, una debajo de otra y centradas.
  // Si TODO lo que se coloca cae en la columna central ("línea arriba" + tres
  // figuras sueltas), la rejilla 3×3 no aporta nada y encoge los iconos hasta
  // hacerlos ilegibles: son bandas, no celdas. Se leen como filas.
  const MIDDLE_COLUMN: Partial<Record<Position, number>> = {
    'top-centre': 0,
    centre: 1,
    'bottom-centre': 2,
  }
  const bandsOnly =
    panel.shapes.some((s) => s.position) && panel.shapes.every((s) => !s.position || s.position in MIDDLE_COLUMN)

  const anyRow = panel.shapes.some((s) => s.row != null) || bandsOnly
  if (anyRow) {
    const byRow = new Map<number, ShapeSpec[]>()
    for (const s of panel.shapes) {
      const band = bandsOnly && s.position ? MIDDLE_COLUMN[s.position] : undefined
      const row = s.row ?? band ?? (bandsOnly ? 1 : Number.MAX_SAFE_INTEGER)
      if (!byRow.has(row)) byRow.set(row, [])
      byRow.get(row)!.push(s)
    }
    const rowKeys = [...byRow.keys()].sort((a, b) => a - b)
    const rowBase: SizeKind = sizeOverride ?? (large ? 'medium' : 'small')
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1.5">
          {rowKeys.map((key) => (
            <div key={key} className="flex items-center justify-center gap-0.5">
              {byRow.get(key)!.map((s, i) => (
                <ShapeIcon key={i} spec={{ ...s, size: shiftSize(s.size, rowBase) }} />
              ))}
            </div>
          ))}
        </div>
        {panel.caption && <Caption panel={panel} />}
      </div>
    )
  }

  // Marco pedido por el grupo pero este panel no coloca nada: sus figuras van
  // en una fila dentro del recuadro, no amontonadas en la celda central. Si se
  // amontonan hay que encogerlas y la opción queda con iconos diminutos al
  // lado de otras con iconos normales, que es justo lo que impide compararlas.
  const positioned = panel.shapes.some((s) => s.position)
  if (framed && !positioned) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div
          className={clsx(
            'flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 p-1',
            FRAME_PX[sizeOverride ?? (large ? 'large' : 'medium')],
          )}
        >
          {panel.shapes.map((s, i) => (
            <ShapeIcon key={i} spec={{ ...s, size: resolveSize(s.size) }} />
          ))}
        </div>
        {panel.caption && <Caption panel={panel} />}
      </div>
    )
  }

  const anyPositioned = positioned

  if (anyPositioned) {
    // Dentro de la rejilla 3×3, el icono tiene que caber en UNA celda
    // (~1/3 del marco) para que la posición se distinga a simple vista. Con
    // el tamaño normal del icono (pensado para un panel sin marco) el icono
    // es más grande que la celda entera y desborda sobre las vecinas,
    // haciendo que dos posiciones distintas se vean casi iguales. Se usa el
    // tamaño 'small' fijo para el icono aquí, sea cual sea el tamaño
    // declarado en el texto. Las formas sin posición propia se agrupan en
    // el centro.
    const byCell = new Map<number, ShapeSpec[]>()
    for (const s of panel.shapes) {
      const cell = POSITION_CELL[s.position ?? 'centre']
      if (!byCell.has(cell)) byCell.set(cell, [])
      byCell.get(cell)!.push(s)
    }
    const cells = new Map<number, React.ReactNode>()
    for (const [cell, shapesInCell] of byCell) {
      cells.set(
        cell,
        <div className="flex flex-wrap items-center justify-center gap-0.5">
          {shapesInCell.map((s, i) => (
            <ShapeIcon key={i} spec={s} px={cellIconPx(shapesInCell.length)} />
          ))}
        </div>,
      )
    }
    return (
      <div className="flex flex-col items-center gap-1.5">
        <PositionFrame cells={cells} size={sizeOverride ?? (large ? 'large' : 'medium')} />
        {panel.caption && <Caption panel={panel} />}
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
      {panel.caption && <Caption panel={panel} />}
    </div>
  )
}
