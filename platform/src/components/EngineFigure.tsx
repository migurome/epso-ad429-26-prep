import clsx from 'clsx'
import { svgDataUri } from '../lib/engineFigure'
import type { EngineBoard } from '../types/content'

/** Una figura del motor. Siempre como <img>, nunca insertando el SVG en el
 * DOM: ver lib/engineFigure.ts. */
export function EngineSvg({ svg, alt, className }: { svg: string; alt: string; className?: string }) {
  return (
    <img
      src={svgDataUri(svg)}
      alt={alt}
      draggable={false}
      className={clsx('block aspect-square h-auto select-none', className)}
    />
  )
}

/** Lado de cada casilla según cuántas lleva la fila más larga. Una serie son
 * seis en fila y tiene que caber entera en el ancho de un móvil: partida en
 * dos líneas deja de leerse como secuencia, que es justo el ejercicio. */
function cellWidth(perRow: number, large?: boolean): string {
  if (perRow >= 6) return large ? 'w-11 sm:w-20' : 'w-11 sm:w-16'
  if (perRow === 5) return large ? 'w-14 sm:w-24' : 'w-14 sm:w-20'
  if (perRow >= 3) return large ? 'w-20 sm:w-28' : 'w-20 sm:w-24'
  return large ? 'w-24 sm:w-32' : 'w-24 sm:w-28'
}

/** El tablero de un ejercicio del motor, fila a fila.
 *
 * La casilla que falta se pinta aquí y no la trae el motor: el «?» no forma
 * parte de lo que se demostró, y así se ve igual en todas las familias. */
export function EngineBoardView({
  board,
  large,
  cellAlt,
  unknownAlt,
}: {
  board: EngineBoard
  large?: boolean
  cellAlt: (row: number, col: number) => string
  unknownAlt: string
}) {
  if (board.rows.length === 0) return null
  const width = cellWidth(Math.max(...board.rows.map((row) => row.length)), large)

  return (
    <div className="flex flex-col items-center gap-2">
      {board.rows.map((row, r) => (
        <div key={r} className="flex flex-nowrap justify-center gap-2">
          {row.map((svg, c) =>
            svg === null ? (
              <div
                key={c}
                role="img"
                aria-label={unknownAlt}
                className={clsx(
                  'flex aspect-square items-center justify-center rounded border-2 border-dashed border-slate-300 bg-slate-50 font-semibold text-slate-400',
                  width,
                  large ? 'text-3xl' : 'text-2xl',
                )}
              >
                ?
              </div>
            ) : (
              <EngineSvg key={c} svg={svg} alt={cellAlt(r + 1, c + 1)} className={width} />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
