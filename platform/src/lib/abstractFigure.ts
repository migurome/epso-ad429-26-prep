// Parser: convierte la notación de texto usada en Docs/3.- Abstract reasoning.md
// (símbolos Unicode + atributos entre paréntesis/corchetes) en especificaciones
// de figura que ShapeIcon/FigurePanel pueden dibujar como SVG. Nunca inventa
// geometría que no esté en el texto: lo que no reconoce, lo deja como caption
// de texto en vez de forzar una forma incorrecta.

export type ShapeKind =
  | 'circle' | 'triangle' | 'square' | 'star' | 'diamond' | 'heart' | 'arrow'
  | 'pentagon' | 'hexagon' | 'rectangle'
  | 'smiley-happy' | 'smiley-sad' | 'smiley-neutral'
  | 'quarter-circle' | 'half-circle' | 'three-quarter-circle' | 'circle-quartered'
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
  /** Posición de ESTA forma dentro de la rejilla 3×3 del panel (independiente
   * de las demás formas del mismo panel) — p. ej. "hexágono arriba-izquierda
   * + círculo abajo-izquierda" son dos formas con posiciones distintas
   * dentro del mismo panel, no un grupo que se mueve en bloque. */
  position?: Position
}

export interface FigurePanel {
  shapes: ShapeSpec[]
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
  // Círculo completo dividido en 4 por dos diámetros perpendiculares (un
  // "pastel" de 4 porciones iguales, no un aspa corta como '⊕'). No hay un
  // carácter Unicode estándar para esto en el banco real, así que se usa
  // '◍' (bullseye) como notación propia consistente con el resto de glifos
  // arbitrarios de este parser.
  '◍': { shape: 'circle-quartered', fill: 'empty' },
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

// Sinónimos en prosa de las 9 posiciones de la rejilla, muy usados en el
// banco real ("upper-left"/"lower-right"...) en vez de "top-left"/
// "bottom-right". El sufijo " corner" ("top-left corner") se recorta antes
// de comparar, ver `normalisePositionWord`.
const POSITION_WORDS: Record<string, Position> = {
  'upper-left': 'top-left',
  'upper-right': 'top-right',
  'upper-mid': 'top-centre',
  'upper-middle': 'top-centre',
  'upper-centre': 'top-centre',
  'upper-center': 'top-centre',
  'top-center': 'top-centre',
  'lower-left': 'bottom-left',
  'lower-right': 'bottom-right',
  'lower-mid': 'bottom-centre',
  'lower-middle': 'bottom-centre',
  'lower-centre': 'bottom-centre',
  'lower-center': 'bottom-centre',
  'bottom-center': 'bottom-centre',
  'mid-centre': 'centre',
  'mid-center': 'centre',
  'middle': 'centre',
  'center': 'centre',
}

function normalisePositionWord(clean: string): Position | null {
  const stripped = clean.replace(/ corner$/, '')
  if ((POSITIONS as string[]).includes(stripped)) return stripped as Position
  if (stripped in POSITION_WORDS) return POSITION_WORDS[stripped]
  return null
}

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

// Palabras sueltas para el relleno, usadas en el banco real como alternativa
// a los símbolos Unicode con relleno explícito (p. ej. "●(black)" en vez de
// "⬤"). "shaded" se trata como sinónimo de "grey" (ambos se ven como el
// mismo gris intermedio en el icono); "striped" es el término alternativo
// que usa el propio libro real para "hatched" (ver teoría: "hatched/striped
// fill"); "clear" es sinónimo de "empty" (contorno sin rellenar).
const FILL_WORDS: Record<string, FillKind> = {
  filled: 'filled',
  black: 'filled',
  empty: 'empty',
  white: 'empty',
  outline: 'empty',
  clear: 'empty',
  shaded: 'grey',
  striped: 'hatched',
}

// Sinónimos en prosa de los tamaños de SIZES ("small tal cual" ya está
// cubierto por SIZES); "larger"/"smaller" son relativos, pero en este banco
// siempre se usan para contrastar con el tamaño medio por defecto de las
// demás formas del panel, así que se tratan como 'large'/'small' absolutos.
const SIZE_WORDS: Record<string, SizeKind> = {
  big: 'large',
  larger: 'large',
  smaller: 'small',
  tiny: 'small',
}

// Conectores gramaticales entre dos símbolos ("△(big) with ■(small)",
// "△(big) con ■(small)") sin ningún contenido visual propio.
const CONNECTOR_WORDS = new Set(['with', 'and', 'con', 'y'])

// Dirección en la que apunta la "punta" de una figura (normalmente un
// triángulo): mismo convenio de rotación que TRIANGLE_MAP (0° = apunta
// arriba). "tip left/right/up/down" y "pointing left/right/up/down" son las
// dos formas en que el banco real describe esto en prosa en vez de usar
// directamente el símbolo ya rotado (▲▶▼◀).
const TIP_ROTATION: Record<string, number> = { up: 0, right: 90, down: 180, left: 270 }

function parseParenAttr(attr: string): ParenAttr | null {
  const clean = attr.trim().toLowerCase()
  if ((SIZES as string[]).includes(clean)) return { size: clean as SizeKind }
  if (clean in SIZE_WORDS) return { size: SIZE_WORDS[clean] }
  const position = normalisePositionWord(clean)
  if (position) return { position }
  if (clean === 'grey') return { fill: 'grey' }
  if (clean === 'hatched') return { fill: 'hatched' }
  if (clean in FILL_WORDS) return { fill: FILL_WORDS[clean] }
  const rotMatch = clean.match(/^rotated (\d+)°?\s*(clockwise|counter-clockwise|anticlockwise)$/)
  if (rotMatch) {
    const deg = Number(rotMatch[1])
    const ccw = rotMatch[2] !== 'clockwise'
    return { rotationDeg: ccw ? -deg : deg }
  }
  const tipMatch = clean.match(/^(?:tip|pointing) (up|right|down|left)$/)
  if (tipMatch) {
    return { rotationDeg: TIP_ROTATION[tipMatch[1]] }
  }
  // "(arrow ↘)" — una pequeña flecha decorativa asociada al símbolo principal
  // (usada en el banco real para indicar dirección de movimiento del panel).
  const arrowMatch = attr.trim().match(/^arrow\s+([→↗↑↖←↙↓↘])$/)
  if (arrowMatch && arrowMatch[1] in COMPASS_MAP) {
    return { extraArrowDeg: COMPASS_MAP[arrowMatch[1]] }
  }
  return null
}

// Mapea la fracción en prosa ("whole"/"¾"/"half"/"¼"...) al ShapeKind que
// dibuja esa porción de círculo. Ver `parseCircleFractionBracket`.
const CIRCLE_FRACTION_SHAPES: Record<string, ShapeKind> = {
  whole: 'circle',
  'three-quarter': 'three-quarter-circle',
  'three-quarters': 'three-quarter-circle',
  '3/4': 'three-quarter-circle',
  '¾': 'three-quarter-circle',
  half: 'half-circle',
  '1/2': 'half-circle',
  '½': 'half-circle',
  quarter: 'quarter-circle',
  '1/4': 'quarter-circle',
  '¼': 'quarter-circle',
}

/** Reconoce la notación en prosa "[whole/¾/½/¼ circle, <relleno>, quartered
 * by cross-lines]" que el banco real usa dentro de corchetes para preguntas
 * de "fracción de círculo" (en vez de un glifo Unicode único, porque no
 * existe un carácter para "círculo completo dividido en 4 por una cruz").
 * Devuelve null si el texto no empieza con este patrón, para que el
 * llamador siga con el tratamiento genérico de corchetes. */
function parseCircleFractionBracket(text: string): { spec: ShapeSpec; leftover: string[] } | null {
  const m = text.trim().match(/^(whole|three-quarters?|3\/4|¾|half|1\/2|½|quarter|1\/4|¼)\s+circle\b\s*,?\s*(.*)$/i)
  if (!m) return null
  let shape = CIRCLE_FRACTION_SHAPES[m[1].toLowerCase()]
  if (!shape) return null
  let fill: FillKind = 'empty'
  const leftover: string[] = []
  const rest = m[2].replace(/\ball over\b/gi, '').replace(/\//g, ',')
  for (const part of rest.split(',')) {
    const clean = part.trim()
    if (!clean) continue
    if (/^quartered\b/i.test(clean)) {
      shape = 'circle-quartered'
      continue
    }
    const parsed = parseParenAttr(clean)
    if (parsed?.fill) {
      fill = parsed.fill
    } else {
      leftover.push(clean)
    }
  }
  return { spec: { shape, fill, rotationDeg: 0, size: 'medium' }, leftover }
}

/** Parsea UN panel (un token separado por splitPanels) en una FigurePanel.
 *
 * Recorre el texto en una sola pasada, carácter a carácter: cada símbolo
 * Unicode reconocido crea una nueva forma, y un grupo entre paréntesis que
 * viene justo después ("SÍMBOLO(attr1, attr2)") se aplica SOLO a esa forma,
 * no a todo el panel. Esto importa porque el banco real describe paneles con
 * varios símbolos, cada uno con sus propios atributos — p. ej.
 * "◆(medium) ●(small) △(white,small)" son tres formas distintas, no una
 * mezcla de los atributos del último paréntesis aplicados a las tres. */
export function parsePanel(raw: string): FigurePanel {
  const trimmed = raw.trim()
  if (trimmed === '?') {
    return { shapes: [], isBlank: true, raw: trimmed }
  }

  const shapes: ShapeSpec[] = []
  const captions: string[] = []
  let unrecognizedRun = ''
  const flushRun = () => {
    // Conectores puramente gramaticales entre dos símbolos ("△ with □",
    // "△ con □") no aportan ninguna descripción visual — mostrarlos como
    // caption es solo ruido bajo el icono, no información.
    if (unrecognizedRun && !CONNECTOR_WORDS.has(unrecognizedRun.toLowerCase())) {
      captions.push(unrecognizedRun)
    }
    unrecognizedRun = ''
  }

  // Índice (en `shapes`) hasta el que ya se han aplicado atributos de algún
  // grupo "(...)" anterior. Un grupo pegado a un símbolo ("●(small)") solo
  // afecta a esa última forma; un grupo suelto tras un espacio
  // ("◆◆◆ (large)") se entiende como "todas las formas repetidas desde la
  // última vez que se aplicó un grupo", para cubrir el estilo del banco real
  // donde un tamaño/relleno compartido se declara una sola vez al final de
  // una tanda de símbolos idénticos.
  let attributedUpTo = 0

  /** Aplica los atributos reconocidos de un grupo "(...)" a las formas
   * creadas desde el último grupo aplicado (`attached` limita eso a solo la
   * última forma, cuando el paréntesis viene pegado a un símbolo). La
   * posición es un atributo de forma más (cada forma del panel puede tener
   * la suya propia — "hexágono arriba-izquierda + círculo abajo-izquierda"
   * son dos formas con posiciones distintas dentro del mismo panel, no un
   * grupo que se mueve en bloque). Los atributos sin ninguna forma a la que
   * aplicarse (p. ej. un paréntesis al principio del texto) se conservan
   * como caption en vez de perderse. */
  function applyParenGroup(inner: string, attached: boolean) {
    const rangeStart = attached ? shapes.length - 1 : attributedUpTo
    const targets = shapes.slice(Math.max(rangeStart, 0))
    const leftover: string[] = []
    for (const part of inner.split(',')) {
      if (!part.trim()) continue
      const parsed = parseParenAttr(part)
      if (!parsed) {
        leftover.push(part.trim())
        continue
      }
      if (parsed.extraArrowDeg != null) {
        shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: parsed.extraArrowDeg, size: 'small' })
      }
      if (targets.length > 0) {
        for (const target of targets) {
          if (parsed.size) target.size = parsed.size
          if (parsed.fill) target.fill = parsed.fill
          if (parsed.rotationDeg != null) target.rotationDeg = parsed.rotationDeg
          if (parsed.position) target.position = parsed.position
        }
      } else if (parsed.extraArrowDeg == null) {
        // Atributo de forma (tamaño/relleno/rotación/posición) sin ninguna
        // forma previa a la que aplicarse (p. ej. un paréntesis inicial): no
        // se puede dibujar, así que se conserva como texto en vez de perderse.
        leftover.push(part.trim())
      }
    }
    if (leftover.length > 0) captions.push(leftover.join(', '))
    attributedUpTo = shapes.length
  }

  /** Extrae flechas de compás sueltas de un corchete "[...]" (p. ej.
   * "[línea ↘]") como flechas decorativas propias en vez de dejar el glifo
   * Unicode crudo en el caption — el navegador lo pintaría como un emoji de
   * color que desentona con el resto de iconos en blanco y negro. */
  function applyBracketContent(inner: string) {
    let text = inner
    for (const [ch, deg] of Object.entries(COMPASS_MAP)) {
      while (text.includes(ch)) {
        shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: deg, size: 'small' })
        text = text.replace(ch, '')
      }
    }
    const circleFraction = parseCircleFractionBracket(text)
    if (circleFraction) {
      shapes.push(circleFraction.spec)
      if (circleFraction.leftover.length > 0) captions.push(circleFraction.leftover.join(', '))
      return
    }
    text = text
      .replace(/\(\s*\)/g, '')
      .replace(/\s*,\s*,/g, ',')
      .replace(/^[\s,]+|[\s,]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (text) captions.push(text)
  }

  const chars = [...trimmed]
  let i = 0
  while (i < chars.length) {
    const ch = chars[i]
    if (ch === '[') {
      const end = chars.indexOf(']', i + 1)
      if (end === -1) {
        unrecognizedRun += ch
        i++
        continue
      }
      flushRun()
      applyBracketContent(chars.slice(i + 1, end).join(''))
      i = end + 1
      continue
    }
    if (ch === '(') {
      const end = chars.indexOf(')', i + 1)
      if (end === -1) {
        unrecognizedRun += ch
        i++
        continue
      }
      // Pegado a un símbolo ("●(small)") vs. suelto tras un espacio
      // ("◆◆◆ (large)") — ver el comentario de `applyParenGroup`. Se exige
      // que el carácter anterior sea justo un símbolo de figura (no
      // cualquier no-espacio) para no enganchar por error un paréntesis a
      // una forma antigua cuando lo que precede es texto no reconocido.
      const prevCh = i > 0 ? chars[i - 1] : ''
      const attached = prevCh in TRIANGLE_MAP || prevCh in SHAPE_MAP || prevCh in COMPASS_MAP
      flushRun()
      applyParenGroup(chars.slice(i + 1, end).join(''), attached)
      i = end + 1
      continue
    }
    if (/\s/.test(ch) || ch === '/' || ch === '+' || ch === '=') {
      flushRun()
      i++
      continue
    }
    if (ch in TRIANGLE_MAP) {
      flushRun()
      const t = TRIANGLE_MAP[ch]
      shapes.push({ shape: 'triangle', fill: t.fill, rotationDeg: t.rotationDeg, size: 'medium' })
    } else if (ch in SHAPE_MAP) {
      flushRun()
      const s = SHAPE_MAP[ch]
      shapes.push({ shape: s.shape, fill: s.fill, rotationDeg: 0, size: 'medium' })
    } else if (ch in COMPASS_MAP) {
      flushRun()
      shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: COMPASS_MAP[ch], size: 'medium' })
    } else {
      // carácter no reconocido (letra, dígito, puntuación residual…): a caption
      unrecognizedRun += ch
    }
    i++
  }
  flushRun()

  const caption = captions.join(' ').replace(/\s+/g, ' ').trim() || undefined

  return {
    shapes,
    caption: shapes.length > 0 ? caption : caption ?? trimmed,
    isBlank: false,
    raw: trimmed,
  }
}

/** Firma de lo que `FigurePanelView` dibuja realmente para un panel (formas,
 * con su relleno/tamaño/rotación/posición), ignorando el caption de texto.
 * Dos opciones de una misma pregunta con la misma firma producirían el
 * mismo icono aunque su texto de origen sea distinto — típicamente porque
 * describen una diferencia (p. ej. "tip left" vs "tip right") que el parser
 * no modela como atributo de figura. El llamador debe usar esto para evitar
 * mostrar dos opciones distintas con el icono idéntico. */
export function panelSignature(panel: FigurePanel): string {
  // Dentro de un marco de posición, FigurePanelView siempre dibuja los
  // iconos a tamaño 'small' (para que quepan en su celda de la rejilla 3×3),
  // ignorando el tamaño declarado en el texto — la firma tiene que reflejar
  // eso o dos paneles que solo difieren en tamaño parecerían distintos aun
  // dibujándose exactamente igual dentro de un marco.
  return panel.shapes
    .map((s) => `${s.position ?? ''}|${s.shape}|${s.fill}|${s.position ? 'framed' : s.size}|${((s.rotationDeg % 360) + 360) % 360}`)
    .join(',')
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
