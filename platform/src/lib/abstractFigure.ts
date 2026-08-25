// Parser: convierte la notación de texto usada en Docs/3.- Abstract reasoning.md
// (símbolos Unicode + atributos entre paréntesis/corchetes) en especificaciones
// de figura que ShapeIcon/FigurePanel pueden dibujar como SVG. Nunca inventa
// geometría que no esté en el texto: lo que no reconoce, lo deja como caption
// de texto en vez de forzar una forma incorrecta.

export type ShapeKind =
  | 'circle' | 'triangle' | 'square' | 'star' | 'diamond' | 'heart' | 'arrow'
  | 'pentagon' | 'hexagon' | 'rectangle'
  | 'smiley-happy' | 'smiley-sad' | 'smiley-neutral'
  | 'quarter-circle' | 'half-circle'
  | 'circled-plus' | 'circled-x' | 'circled-minus'
  | 'sun' | 'cloud' | 'snowflake' | 'lightning' | 'four-point-star' | 'moon'
export type FillKind = 'filled' | 'empty' | 'grey' | 'hatched'
export type SizeKind = 'small' | 'medium' | 'large' | 'extra-large'
export type Position =
  | 'top-left' | 'top-centre' | 'top-right'
  | 'mid-left' | 'centre' | 'mid-right'
  | 'bottom-left' | 'bottom-centre' | 'bottom-right'

export interface ShapeSpec {
  shape: ShapeKind
  fill: FillKind
  rotationDeg: number
  size: SizeKind
}

export interface FigurePanel {
  shapes: ShapeSpec[]
  position?: Position
  caption?: string
  isBlank: boolean
  raw: string
}

const SHAPE_MAP: Record<string, { shape: ShapeKind; fill: FillKind }> = {
  '●': { shape: 'circle', fill: 'filled' },
  '○': { shape: 'circle', fill: 'empty' },
  '⬤': { shape: 'circle', fill: 'filled' },
  '■': { shape: 'square', fill: 'filled' },
  '□': { shape: 'square', fill: 'empty' },
  '▰': { shape: 'square', fill: 'grey' },
  '▤': { shape: 'square', fill: 'hatched' },
  '★': { shape: 'star', fill: 'filled' },
  '☆': { shape: 'star', fill: 'empty' },
  '✦': { shape: 'four-point-star', fill: 'filled' },
  '✷': { shape: 'four-point-star', fill: 'filled' },
  '✶': { shape: 'four-point-star', fill: 'empty' },
  '◆': { shape: 'diamond', fill: 'filled' },
  '◇': { shape: 'diamond', fill: 'empty' },
  '◈': { shape: 'diamond', fill: 'hatched' },
  '♥': { shape: 'heart', fill: 'filled' },
  '♡': { shape: 'heart', fill: 'empty' },
  '⬠': { shape: 'pentagon', fill: 'empty' },
  '⬟': { shape: 'pentagon', fill: 'filled' },
  '⬡': { shape: 'hexagon', fill: 'empty' },
  '⬢': { shape: 'hexagon', fill: 'filled' },
  '⬣': { shape: 'hexagon', fill: 'grey' },
  '▮': { shape: 'rectangle', fill: 'filled' },
  '▬': { shape: 'rectangle', fill: 'filled' },
  '▭': { shape: 'rectangle', fill: 'empty' },
  '☺': { shape: 'smiley-happy', fill: 'empty' },
  '☹': { shape: 'smiley-sad', fill: 'empty' },
  '😐': { shape: 'smiley-neutral', fill: 'empty' },
  '◔': { shape: 'quarter-circle', fill: 'filled' },
  '◐': { shape: 'half-circle', fill: 'filled' },
  '◗': { shape: 'half-circle', fill: 'filled' },
  '⊕': { shape: 'circled-plus', fill: 'empty' },
  '✕': { shape: 'circled-x', fill: 'empty' },
  '⊗': { shape: 'circled-x', fill: 'empty' },
  '⊖': { shape: 'circled-minus', fill: 'empty' },
  '☀': { shape: 'sun', fill: 'filled' },
  '☁': { shape: 'cloud', fill: 'empty' },
  '❄': { shape: 'snowflake', fill: 'filled' },
  '⚡': { shape: 'lightning', fill: 'filled' },
  '☾': { shape: 'moon', fill: 'filled' },
}

// Triángulos "genéricos" (▲△) y "direccionales" (▶◀▽▷) son el mismo símbolo
// base con distinta rotación: 0° = apunta arriba (convención de todo el
// contenido, tanto para conteo simple como para secuencias de rotación).
const TRIANGLE_MAP: Record<string, { fill: FillKind; rotationDeg: number }> = {
  '▲': { fill: 'filled', rotationDeg: 0 },
  '▶': { fill: 'filled', rotationDeg: 90 },
  '▼': { fill: 'filled', rotationDeg: 180 },
  '◀': { fill: 'filled', rotationDeg: 270 },
  '△': { fill: 'empty', rotationDeg: 0 },
  '▷': { fill: 'empty', rotationDeg: 90 },
  '▽': { fill: 'empty', rotationDeg: 180 },
  '◁': { fill: 'empty', rotationDeg: 270 },
}

// Flechas de compás: 0° apunta al Este (→), rotación creciente en sentido
// horario (convención visual estándar en pantalla, donde Y crece hacia abajo).
const COMPASS_MAP: Record<string, number> = {
  '→': 0, '↘': 45, '↓': 90, '↙': 135, '←': 180, '↖': 225, '↑': 270, '↗': 315,
}

const POSITIONS: Position[] = [
  'top-left', 'top-centre', 'top-right',
  'mid-left', 'centre', 'mid-right',
  'bottom-left', 'bottom-centre', 'bottom-right',
]

const SIZES: SizeKind[] = ['small', 'medium', 'large', 'extra-large']

function tokenize(text: string, isSeparator: (ch: string) => boolean): string[] {
  const tokens: string[] = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth--
    if (isSeparator(ch) && depth <= 0) {
      if (current.trim()) tokens.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) tokens.push(current.trim())
  return tokens
}

/** Divide un texto en paneles de nivel superior, respetando () y [] balanceados.
 *
 * El banco real usa dos estilos: paneles de un solo símbolo separados por
 * espacio (banco IA, y algunos del banco real), o paneles que agrupan varios
 * símbolos (separados entre sí por espacio simple) con '·'/'—' marcando el
 * límite ENTRE paneles. Cuando el texto contiene '·'/'—' se usan como único
 * separador de panel (preservando los espacios internos de cada panel); si
 * no aparecen, se usa el espacio como separador. */
export function splitPanels(text: string): string[] {
  if (/[·—]/.test(text)) {
    return tokenize(text, (ch) => ch === '·' || ch === '—')
  }
  return tokenize(text, (ch) => /\s/.test(ch))
}

interface ParenAttr {
  size?: SizeKind
  position?: Position
  rotationDeg?: number
  fill?: FillKind
  extraArrowDeg?: number
}

function parseParenAttr(attr: string): ParenAttr | null {
  const clean = attr.trim().toLowerCase()
  if ((SIZES as string[]).includes(clean)) return { size: clean as SizeKind }
  if ((POSITIONS as string[]).includes(clean)) return { position: clean as Position }
  if (clean === 'grey') return { fill: 'grey' }
  if (clean === 'hatched') return { fill: 'hatched' }
  const rotMatch = clean.match(/^rotated (\d+)°?\s*(clockwise|counter-clockwise|anticlockwise)$/)
  if (rotMatch) {
    const deg = Number(rotMatch[1])
    const ccw = rotMatch[2] !== 'clockwise'
    return { rotationDeg: ccw ? -deg : deg }
  }
  // "(arrow ↘)" — una pequeña flecha decorativa asociada al símbolo principal
  // (usada en el banco real para indicar dirección de movimiento del panel).
  const arrowMatch = attr.trim().match(/^arrow\s+([→↗↑↖←↙↓↘])$/)
  if (arrowMatch && arrowMatch[1] in COMPASS_MAP) {
    return { extraArrowDeg: COMPASS_MAP[arrowMatch[1]] }
  }
  return null
}

/** Parsea UN panel (un token separado por splitPanels) en una FigurePanel. */
export function parsePanel(raw: string): FigurePanel {
  const trimmed = raw.trim()
  if (trimmed === '?') {
    return { shapes: [], isBlank: true, raw: trimmed }
  }

  const captions: string[] = []
  let rest = trimmed

  // 1. Extraer corchetes [...] como caption (descripciones complejas del banco real)
  rest = rest.replace(/\[([^\]]*)\]/g, (_, inner: string) => {
    captions.push(inner.trim())
    return ''
  })

  // 2. Extraer paréntesis (...) — algunos son atributos reconocidos, el resto
  //    (p. ej. "(arrow ↘)", "(left)") se guarda como caption libre.
  let size: SizeKind | undefined
  let position: Position | undefined
  let rotationDeg = 0
  let fillOverride: FillKind | undefined
  const extraArrowDegs: number[] = []

  rest = rest.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    const parsed = parseParenAttr(inner)
    if (parsed) {
      if (parsed.size) size = parsed.size
      if (parsed.position) position = parsed.position
      if (parsed.rotationDeg != null) rotationDeg = parsed.rotationDeg
      if (parsed.fill) fillOverride = parsed.fill
      if (parsed.extraArrowDeg != null) extraArrowDegs.push(parsed.extraArrowDeg)
    } else if (inner.trim()) {
      captions.push(inner.trim())
    }
    return ''
  })

  // 3. Lo que queda son símbolos Unicode (posiblemente varios, p. ej. "●●●").
  const shapes: ShapeSpec[] = []
  for (const ch of rest) {
    if (/\s/.test(ch) || ch === '/' || ch === '+' || ch === '=') continue
    if (ch in TRIANGLE_MAP) {
      const t = TRIANGLE_MAP[ch]
      shapes.push({
        shape: 'triangle',
        fill: fillOverride ?? t.fill,
        rotationDeg: rotationDeg || t.rotationDeg,
        size: size ?? 'medium',
      })
    } else if (ch in SHAPE_MAP) {
      const s = SHAPE_MAP[ch]
      shapes.push({
        shape: s.shape,
        fill: fillOverride ?? s.fill,
        rotationDeg,
        size: size ?? 'medium',
      })
    } else if (ch in COMPASS_MAP) {
      shapes.push({
        shape: 'arrow',
        fill: 'filled',
        rotationDeg: rotationDeg || COMPASS_MAP[ch],
        size: size ?? 'medium',
      })
    } else {
      // carácter no reconocido (letra, dígito, puntuación residual…): a caption
      captions.push(ch)
    }
  }

  // Flechas decorativas "(arrow ↗)": se dibujan como formas pequeñas propias,
  // nunca como el glifo Unicode crudo (que el navegador renderiza como un
  // emoji de color inconsistente con el resto de la figura).
  for (const deg of extraArrowDegs) {
    shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: deg, size: 'small' })
  }

  const caption = captions.join(' ').replace(/\s+/g, ' ').trim() || undefined

  return {
    shapes,
    position,
    caption: shapes.length > 0 ? caption : caption ?? trimmed,
    isBlank: false,
    raw: trimmed,
  }
}

/** Parsea una tabla Markdown de matriz (3×3, sin cabecera con contenido) en
 * filas de celdas de texto. Devuelve null si el texto no contiene una tabla. */
export function parseMarkdownTable(text: string): string[][] | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'))
  if (lines.length < 2) return null

  const isSeparator = (l: string) => /^\|[\s|:-]+\|$/.test(l)
  const rows = lines.filter((l) => !isSeparator(l))
  if (rows.length === 0) return null

  const cells = rows.map((row) =>
    row
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim()),
  )

  // Descarta una posible fila de cabecera con todas las celdas vacías.
  if (cells[0].every((c) => c === '')) cells.shift()

  return cells.length > 0 ? cells : null
}

export interface PromptFigures {
  kind: 'sequence' | 'matrix'
  panels: FigurePanel[]
  /** Nº de columnas si es una matriz (para el grid); irrelevante en secuencia. */
  columns?: number
  /** Texto Markdown restante (explicación, notación, etc.) a mostrar aparte. */
  remainderMd: string
}

/** Intenta extraer una secuencia o matriz de figuras del prompt de una
 * pregunta de razonamiento abstracto. Devuelve null si no se reconoce nada
 * (p. ej. prompts puramente textuales de tipo "cuatro de estas cinco
 * figuras..."), en cuyo caso el llamador debe mostrar el prompt como
 * Markdown normal. */
export function extractPromptFigures(prompt: string): PromptFigures | null {
  const table = parseMarkdownTable(prompt)
  if (table) {
    const panels = table.flat().map(parsePanel)
    const hasAnyShape = panels.some((p) => p.shapes.length > 0)
    if (!hasAnyShape) return null
    const tableBlockRe = /(^\s*\|.*\|\s*$\n?)+/m
    const remainderMd = prompt.replace(tableBlockRe, '').trim()
    return { kind: 'matrix', panels, columns: table[0].length, remainderMd }
  }

  // El bloque (párrafo) con la secuencia de figuras no siempre es el primero:
  // algunas preguntas del banco real anteponen una frase descriptiva antes de
  // los símbolos. Se evalúa cada bloque y se elige el que mejor se reconoce
  // como secuencia (mayor proporción de paneles con al menos una forma).
  const blocks = prompt.split(/\n\s*\n/)
  let best: { index: number; panels: FigurePanel[]; score: number } | null = null

  blocks.forEach((block, index) => {
    const panelTexts = splitPanels(block)
    if (panelTexts.length < 2) return
    const panels = panelTexts.map(parsePanel)
    const withShapes = panels.filter((p) => p.shapes.length > 0).length
    if (withShapes === 0) return
    const score = withShapes / panels.length
    if (!best || score > best.score) {
      best = { index, panels, score }
    }
  })

  if (!best) return null

  const chosen: { index: number; panels: FigurePanel[]; score: number } = best
  const remainderMd = blocks
    .filter((_, i) => i !== chosen.index)
    .join('\n\n')
    .trim()
  return { kind: 'sequence', panels: chosen.panels, remainderMd }
}
