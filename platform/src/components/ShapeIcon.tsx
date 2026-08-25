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

interface ShapeIconProps {
  spec: ShapeSpec
  className?: string
}

export function ShapeIcon({ spec, className }: ShapeIconProps) {
  const patternId = useId()
  const px = SIZE_PX[spec.size]

  const isEmpty = spec.fill === 'empty'
  const fill = spec.fill === 'grey' ? GREY : spec.fill === 'hatched' ? `url(#${patternId})` : isEmpty ? 'none' : INK
  const strokeWidth = isEmpty ? 6 : 0
  const commonProps = { fill, stroke: isEmpty ? INK : 'none', strokeWidth }

  let shapeEl: React.ReactNode
  switch (spec.shape) {
    case 'circle':
      shapeEl = <circle cx={50} cy={50} r={32} {...commonProps} />
      break
    case 'square':
      shapeEl = <rect x={20} y={20} width={60} height={60} rx={4} {...commonProps} />
      break
    case 'rectangle':
      shapeEl = <rect x={12} y={27} width={76} height={46} rx={3} {...commonProps} />
      break
    case 'diamond':
      shapeEl = <polygon points="50,12 88,50 50,88 12,50" {...commonProps} />
      break
    case 'pentagon':
      shapeEl = <polygon points={regularPolygonPoints(5, 50, 52, 34)} {...commonProps} />
      break
    case 'hexagon':
      shapeEl = <polygon points={regularPolygonPoints(6, 50, 50, 34)} {...commonProps} />
      break
    case 'star':
      shapeEl = <polygon points={starPoints(50, 50, 34, 14, 5)} {...commonProps} />
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
      shapeEl = <polygon points="50,14 87,81 13,81" {...commonProps} />
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
    case 'half-circle':
      shapeEl = <path d="M50,8 A42,42 0 0 1 50,92 Z" {...commonProps} />
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

  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
      {spec.fill === 'hatched' && (
        <defs>
          <pattern id={patternId} width={10} height={10} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width={10} height={10} fill="white" />
            <line x1={0} y1={0} x2={0} y2={10} stroke={INK} strokeWidth={4} />
          </pattern>
        </defs>
      )}
      <g transform={spec.rotationDeg ? `rotate(${spec.rotationDeg} 50 50)` : undefined}>{shapeEl}</g>
    </svg>
  )
}
