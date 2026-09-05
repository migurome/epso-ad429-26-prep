import { useId } from 'react'
import type { ShapeSpec, SizeKind } from '../lib/abstractFigure'

const SIZE_PX: Record<SizeKind, number> = {
  small: 26,
  medium: 38,
  large: 50,
  'extra-large': 64,
}

const INK = '#1e293b' // slate-800
const GREY = '#94a3b8' // slate-400

function starPoints(cx: number, cy: number, outerR: number, innerR: number, spikes: number): string {
  const points: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI / spikes) * i - Math.PI / 2
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return points.join(' ')
}

function regularPolygonPoints(sides: number, cx: number, cy: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < sides; i++) {
    const angle = ((2 * Math.PI) / sides) * i - Math.PI / 2
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return points.join(' ')
}

type Paint = { fill: string; stroke: string; strokeWidth: number }

/** Figuras que el banco real llega a describir «medio sombreadas». Se
 * declaran como función del pincel porque hay que pintarlas dos veces: el
 * contorno completo y, recortada, la mitad rellena. */
const HALF_CAPABLE: Partial<Record<ShapeSpec['shape'], (p: Paint) => React.ReactNode>> = {
  circle: (p) => <circle cx={50} cy={50} r={32} {...p} />,
  square: (p) => <rect x={20} y={20} width={60} height={60} rx={4} {...p} />,
  rectangle: (p) => <rect x={12} y={27} width={76} height={46} rx={3} {...p} />,
  diamond: (p) => <polygon points="50,12 88,50 50,88 12,50" {...p} />,
  pentagon: (p) => <polygon points={regularPolygonPoints(5, 50, 52, 34)} {...p} />,
  hexagon: (p) => <polygon points={regularPolygonPoints(6, 50, 50, 34)} {...p} />,
  triangle: (p) => <polygon points="50,14 87,81 13,81" {...p} />,
}

interface ShapeIconProps {
  spec: ShapeSpec
  className?: string
  /** Lado en píxeles, ignorando `spec.size`. Se usa cuando varias figuras
   * comparten una celda de la rejilla 3×3 y hay que encogerlas para que
   * quepan: con el tamaño normal se salían del marco y se montaban sobre el
   * texto de debajo. */
  px?: number
}

export function ShapeIcon({ spec, className, px: pxOverride }: ShapeIconProps) {
  const patternId = useId()
  const px = pxOverride ?? SIZE_PX[spec.size]

  const isEmpty = spec.fill === 'empty'
  const isHatched = spec.fill === 'hatched'
  const fill = spec.fill === 'grey' ? GREY : isHatched ? `url(#${patternId})` : isEmpty ? 'none' : INK
  // El rayado se dibujaba sin contorno, así que la figura se veía como una
  // mancha de líneas diagonales: un rombo rayado y un rectángulo rayado eran
  // indistinguibles. Con contorno se recupera la silueta.
  const strokeWidth = isEmpty ? 6 : isHatched ? 4 : 0
  const commonProps = { fill, stroke: isEmpty || isHatched ? INK : 'none', strokeWidth }

  let shapeEl: React.ReactNode
  switch (spec.shape) {
    case 'circle':
      shapeEl = HALF_CAPABLE.circle!(commonProps)
      break
    case 'square':
      shapeEl = HALF_CAPABLE.square!(commonProps)
      break
    case 'rectangle':
      shapeEl = HALF_CAPABLE.rectangle!(commonProps)
      break
    case 'diamond':
      shapeEl = HALF_CAPABLE.diamond!(commonProps)
      break
    case 'pentagon':
      shapeEl = HALF_CAPABLE.pentagon!(commonProps)
      break
    case 'hexagon':
      shapeEl = HALF_CAPABLE.hexagon!(commonProps)
      break
    case 'star':
      shapeEl = <polygon points={starPoints(50, 50, 34, 14, spec.points ?? 5)} {...commonProps} />
      break
    case 'four-point-star':
      shapeEl = <polygon points={starPoints(50, 50, 38, 12, 4)} {...commonProps} />
      break
    case 'heart':
      shapeEl = (
        <path
          d="M50,86 C22,64 6,44 6,27 C6,12 18,4 32,4 C41,4 47,9 50,16 C53,9 59,4 68,4 C82,4 94,12 94,27 C94,44 78,64 50,86 Z"
          {...commonProps}
        />
      )
      break
    case 'triangle':
      shapeEl = HALF_CAPABLE.triangle!(commonProps)
      break
    case 'arrow':
      shapeEl = (
        <g stroke={INK} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={14} y1={50} x2={78} y2={50} />
          <polyline points="58,28 86,50 58,72" />
        </g>
      )
      break
    case 'quarter-circle':
      shapeEl = <path d="M50,50 L50,8 A42,42 0 0 1 92,50 Z" {...commonProps} />
      break
    case 'three-quarter-circle':
      // El círculo completo menos la misma cuña que falta en 'quarter-circle'
      // (forma de "Pac-Man"): mismo arco, dando la vuelta larga.
      shapeEl = <path d="M50,50 L92,50 A42,42 0 1 1 50,8 Z" {...commonProps} />
      break
    case 'half-circle':
      shapeEl = <path d="M50,8 A42,42 0 0 1 50,92 Z" {...commonProps} />
      break
    case 'circle-quartered':
      // Círculo completo dividido en 4 secciones iguales por dos diámetros
      // perpendiculares (a diferencia de 'circled-plus', cuya cruz es corta
      // y decorativa, no llega al borde del círculo).
      shapeEl = (
        <g>
          <circle cx={50} cy={50} r={32} {...commonProps} />
          <line x1={50} y1={18} x2={50} y2={82} stroke={INK} strokeWidth={4} />
          <line x1={18} y1={50} x2={82} y2={50} stroke={INK} strokeWidth={4} />
        </g>
      )
      break
    case 'spiked-circle': {
      // Círculo con radios cortos ("rayos de sol"), una línea que lo parte en
      // dos mitades y, opcionalmente, una de esas mitades sombreada. El banco
      // real describe esta figura en prosa repartida en varios corchetes.
      const R = 30
      // Los cinco radios de la corona superior son los que comparten todas
      // las variantes; el "extra" es el que distingue unas opciones de otras.
      const baseAngles = [-90, -135, -45, 180, 0]
      const angles = baseAngles.slice(0, Math.min(spec.spikes ?? 0, 5))
      if (spec.spikeExtra === 'bottom-left') angles.push(135)
      if (spec.spikeExtra === 'bottom-right') angles.push(45)
      else if ((spec.spikes ?? 0) > 5 && !spec.spikeExtra) angles.push(90)

      const half = spec.shadedHalf
      const deg = spec.dividerDeg ?? 0
      const rad = (deg * Math.PI) / 180
      const dx = Math.cos(rad) * R
      const dy = Math.sin(rad) * R
      const sweep = half?.side === 'second' ? 1 : 0
      const halfFill = half
        ? half.fill === 'filled'
          ? INK
          : half.fill === 'grey'
            ? GREY
            : 'none'
        : 'none'

      shapeEl = (
        <g>
          {half && halfFill !== 'none' && (
            <path
              d={`M ${50 - dx},${50 - dy} A ${R},${R} 0 0 ${sweep} ${50 + dx},${50 + dy} Z`}
              fill={halfFill}
            />
          )}
          <circle cx={50} cy={50} r={R} fill="none" stroke={INK} strokeWidth={4} />
          {spec.dividerDeg != null && (
            <line
              x1={50 - dx}
              y1={50 - dy}
              x2={50 + dx}
              y2={50 + dy}
              stroke={INK}
              strokeWidth={4}
            />
          )}
          {angles.map((a) => {
            const r2 = (a * Math.PI) / 180
            return (
              <line
                key={a}
                x1={50 + Math.cos(r2) * R}
                y1={50 + Math.sin(r2) * R}
                x2={50 + Math.cos(r2) * (R + 12)}
                y2={50 + Math.sin(r2) * (R + 12)}
                stroke={INK}
                strokeWidth={4}
              />
            )
          })}
        </g>
      )
      break
    }
    case 'line':
      // Recta que cruza el marco entero: es el «escenario» sobre el que se
      // apoyan las demás figuras del panel, no una figura más.
      shapeEl = <line x1={4} y1={50} x2={96} y2={50} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      break
    case 'bent-line':
      // Línea acodada en ángulo recto («en escalón»), pegada a dos bordes.
      shapeEl = (
        <polyline
          points="6,94 6,30 50,30 50,6 94,6"
          fill="none"
          stroke={INK}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
      break
    case 'slope':
      // Rampa: triángulo rectángulo apoyado en la base del marco.
      shapeEl = <polygon points="6,88 94,88 94,26" {...commonProps} strokeWidth={isEmpty ? 5 : 0} />
      break
    case 'wave':
    case 'wave-trough':
      // La misma onda reflejada: en 'wave' los bordes son cresta y en
      // 'wave-trough', valle. Es lo único que distingue varias opciones.
      shapeEl = (
        <path
          d={
            spec.shape === 'wave'
              ? 'M4,50 C20,18 34,18 50,50 C66,82 80,82 96,50'
              : 'M4,50 C20,82 34,82 50,50 C66,18 80,18 96,50'
          }
          fill="none"
          stroke={INK}
          strokeWidth={5}
          strokeLinecap="round"
        />
      )
      break
    case 'polygon':
      // Polígono regular con el nº de lados que diga el texto: el banco compara
      // "dos figuras de 7 lados" con "dos de 8", y sin el recuento salían
      // idénticas.
      shapeEl = <polygon points={regularPolygonPoints(Math.max(3, spec.sides ?? 5), 50, 50, 34)} {...commonProps} />
      break
    case 'tally':
      // Recuento de algo que no es una figura (las velas de una tarta): tantas
      // marcas como diga el texto.
      shapeEl = (
        <g stroke={INK} strokeWidth={8} strokeLinecap="round">
          {Array.from({ length: Math.max(1, Math.min(8, spec.sides ?? 1)) }).map((_, i, all) => {
            const step = 100 / (all.length + 1)
            const x = step * (i + 1)
            return <line key={i} x1={x} y1={20} x2={x} y2={80} />
          })}
        </g>
      )
      break
    case 'ellipse':
      shapeEl = <ellipse cx={50} cy={50} rx={20} ry={34} {...commonProps} />
      break
    case 'double-arrow':
      // Flecha de doble punta: el eje lo da la rotación (0 = horizontal).
      shapeEl = (
        <g stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={14} y1={50} x2={86} y2={50} />
          <polyline points="30,32 12,50 30,68" />
          <polyline points="70,32 88,50 70,68" />
        </g>
      )
      break
    case 'rotate-cw':
    case 'rotate-ccw': {
      // Marcador de giro: arco casi cerrado con una punta de flecha. El banco
      // lo usa para decir en qué sentido rota el panel.
      const cw = spec.shape === 'rotate-cw'
      shapeEl = (
        <g
          stroke={INK}
          strokeWidth={7}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={cw ? undefined : 'scale(-1,1) translate(-100,0)'}
        >
          <path d="M78,38 A32,32 0 1 0 84,58" />
          <polyline points="62,34 80,36 78,54" />
        </g>
      )
      break
    }
    case 'cross':
      shapeEl = (
        <g stroke={INK} strokeWidth={12} strokeLinecap="butt">
          <line x1={50} y1={12} x2={50} y2={88} />
          <line x1={12} y1={50} x2={88} y2={50} />
        </g>
      )
      break
    case 'circled-plus':
      shapeEl = (
        <g>
          <circle cx={50} cy={50} r={32} fill="none" stroke={INK} strokeWidth={6} />
          <line x1={50} y1={32} x2={50} y2={68} stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <line x1={32} y1={50} x2={68} y2={50} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
      )
      break
    case 'circled-x':
      shapeEl = (
        <g>
          <circle cx={50} cy={50} r={32} fill="none" stroke={INK} strokeWidth={6} />
          <line x1={37} y1={37} x2={63} y2={63} stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <line x1={63} y1={37} x2={37} y2={63} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
      )
      break
    case 'circled-minus':
      shapeEl = (
        <g>
          <circle cx={50} cy={50} r={32} fill="none" stroke={INK} strokeWidth={6} />
          <line x1={32} y1={50} x2={68} y2={50} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
      )
      break
    case 'smiley-happy':
    case 'smiley-sad':
    case 'smiley-neutral':
      shapeEl = (
        <g>
          <circle cx={50} cy={50} r={32} fill={isEmpty ? 'none' : fill} stroke={INK} strokeWidth={5} />
          <circle cx={39} cy={42} r={4.5} fill={INK} />
          <circle cx={61} cy={42} r={4.5} fill={INK} />
          {spec.shape === 'smiley-happy' && (
            <path d="M34,58 Q50,74 66,58" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          )}
          {spec.shape === 'smiley-sad' && (
            <path d="M34,66 Q50,52 66,66" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          )}
          {spec.shape === 'smiley-neutral' && (
            <line x1={36} y1={62} x2={64} y2={62} stroke={INK} strokeWidth={5} strokeLinecap="round" />
          )}
        </g>
      )
      break
    case 'sun':
      shapeEl = (
        <g stroke={INK} strokeWidth={6} strokeLinecap="round">
          <circle cx={50} cy={50} r={18} {...commonProps} strokeWidth={isEmpty ? 5 : 0} />
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (Math.PI / 4) * i
            const x1 = 50 + 26 * Math.cos(angle)
            const y1 = 50 + 26 * Math.sin(angle)
            const x2 = 50 + 40 * Math.cos(angle)
            const y2 = 50 + 40 * Math.sin(angle)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
        </g>
      )
      break
    case 'cloud':
      shapeEl = (
        <g fill={isEmpty ? 'none' : INK} stroke={INK} strokeWidth={isEmpty ? 5 : 0}>
          <circle cx={36} cy={54} r={16} />
          <circle cx={54} cy={44} r={20} />
          <circle cx={70} cy={56} r={14} />
          <rect x={30} y={54} width={48} height={18} rx={9} />
        </g>
      )
      break
    case 'snowflake':
      shapeEl = (
        <g stroke={INK} strokeWidth={5} strokeLinecap="round">
          {[0, 60, 120].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 50)`}>
              <line x1={50} y1={16} x2={50} y2={84} />
              <line x1={50} y1={28} x2={40} y2={20} />
              <line x1={50} y1={28} x2={60} y2={20} />
              <line x1={50} y1={72} x2={40} y2={80} />
              <line x1={50} y1={72} x2={60} y2={80} />
            </g>
          ))}
        </g>
      )
      break
    case 'lightning':
      shapeEl = <polygon points="56,8 24,56 46,56 40,92 76,42 52,42" {...commonProps} strokeWidth={isEmpty ? 5 : 0} />
      break
    case 'moon':
      shapeEl = (
        <g>
          <defs>
            <mask id={`${patternId}-moon`}>
              <rect x={0} y={0} width={100} height={100} fill="white" />
              <circle cx={62} cy={40} r={26} fill="black" />
            </mask>
          </defs>
          <circle
            cx={48}
            cy={50}
            r={32}
            fill={isEmpty ? 'none' : INK}
            stroke={isEmpty ? INK : 'none'}
            strokeWidth={strokeWidth}
            mask={`url(#${patternId}-moon)`}
          />
        </g>
      )
      break
  }

  // Media figura sombreada: se pinta la figura entera recortada a un
  // semiplano, y encima se repasa el contorno (que el recorte tapa) más la
  // línea divisoria, para que la partición se lea aunque la mitad sea blanca.
  const halfSpec = spec.halfFill
  const halfGeometry = halfSpec ? HALF_CAPABLE[spec.shape] : undefined
  const halfAngle = halfSpec?.split === 'vertical' ? 90 : halfSpec?.split === 'diagonal' ? 45 : 0
  const halfColor = !halfSpec
    ? 'none'
    : halfSpec.fill === 'grey'
      ? GREY
      : halfSpec.fill === 'hatched'
        ? `url(#${patternId})`
        : halfSpec.fill === 'empty'
          ? '#ffffff'
          : INK
  const halfRotation = halfAngle + (halfSpec?.side === 'second' ? 180 : 0)
  const halfEl = halfGeometry ? (
    <g>
      <defs>
        <clipPath id={`${patternId}-half`}>
          {/* Semiplano y ≤ 50 (la mitad de arriba del lienzo 0-100) con margen
              de sobra, girado para partir en vertical o en diagonal. */}
          <rect x={-100} y={-100} width={300} height={150} transform={`rotate(${halfRotation} 50 50)`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${patternId}-half)`}>
        {halfGeometry({ fill: halfColor, stroke: 'none', strokeWidth: 0 })}
      </g>
      {halfGeometry({ fill: 'none', stroke: INK, strokeWidth: 5 })}
      <line
        x1={50 - 50 * Math.cos((halfRotation * Math.PI) / 180)}
        y1={50 - 50 * Math.sin((halfRotation * Math.PI) / 180)}
        x2={50 + 50 * Math.cos((halfRotation * Math.PI) / 180)}
        y2={50 + 50 * Math.sin((halfRotation * Math.PI) / 180)}
        stroke={INK}
        strokeWidth={4}
        clipPath={`url(#${patternId}-shape)`}
      />
    </g>
  ) : null

  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
      {halfGeometry && (
        <defs>
          <clipPath id={`${patternId}-shape`}>{halfGeometry({ fill: '#000', stroke: 'none', strokeWidth: 0 })}</clipPath>
        </defs>
      )}
      {spec.fill === 'hatched' && (
        <defs>
          <pattern id={patternId} width={10} height={10} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width={10} height={10} fill="white" />
            <line x1={0} y1={0} x2={0} y2={10} stroke={INK} strokeWidth={4} />
          </pattern>
        </defs>
      )}
      <g transform={spec.rotationDeg ? `rotate(${spec.rotationDeg} 50 50)` : undefined}>
        {halfEl ?? shapeEl}
      </g>
    </svg>
  )
}
