interface SequenceArrowProps {
  size?: number
  className?: string
}

/** Flecha conectora entre paneles de una secuencia, dibujada a mano (no un
 * icono de librería) para que comparta el mismo lenguaje visual que las
 * figuras de razonamiento abstracto que conecta. */
export function SequenceArrow({ size = 16, className }: SequenceArrowProps) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" className={className} role="img" aria-hidden="true">
      <g stroke="currentColor" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1={6} y1={30} x2={78} y2={30} />
        <polyline points="52,8 90,30 52,52" />
      </g>
    </svg>
  )
}
