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
  | 'spiked-circle'
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
  /** Solo para 'spiked-circle': nº de radios que salen del círculo. */
  spikes?: number
  /** Solo para 'spiked-circle': dónde va el radio "extra", además de los de
   * la corona superior. Es lo único que distingue algunas opciones. */
  spikeExtra?: 'bottom-left' | 'bottom-right'
  /** Solo para 'spiked-circle': ángulo en grados (0 = horizontal) de la línea
   * que parte el círculo en dos mitades. */
  dividerDeg?: number
  /** Solo para 'spiked-circle': qué mitad queda sombreada respecto a esa
   * línea, y con qué relleno. */
  shadedHalf?: { side: 'first' | 'second'; fill: FillKind }
  /** Fila del panel en la que va esta forma, cuando el texto describe filas
   * apiladas ("[○○ / ▲▼▲ / ○○○○]", "[top: □] [bottom: △]"). Es una estructura
   * distinta de `position`: la rejilla 3×3 coloca UNA figura por celda, pero
   * una fila puede llevar cinco. */
  row?: number
}

export interface FigurePanel {
  shapes: ShapeSpec[]
  caption?: string
  isBlank: boolean
  raw: string
  /** El dibujo de este panel es un FRAGMENTO de lo que describe su texto:
   * queda descripción sin representar (típicamente un corchete de prosa que
   * el legado del banco real usa justo cuando "la figura no se reduce al
   * juego de símbolos"). Dibujarlo sería enseñar media figura y esconder en
   * un pie de 10 px justo lo que distingue unas opciones de otras, así que
   * el llamador debe pasar toda la pregunta a texto. */
  partial: boolean
}

const SHAPE_MAP: Record<string, { shape: ShapeKind; fill: FillKind }> = {
  '●': { shape: 'circle', fill: 'filled' },
  '○': { shape: 'circle', fill: 'empty' },
  '⬤': { shape: 'circle', fill: 'filled' },
  '•': { shape: 'circle', fill: 'filled' },
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
  // Abreviaturas de esquina y formas sueltas ("TR: ■", "top: □", "left-mid")
  // que el banco real usa dentro de corchetes.
  tl: 'top-left',
  tr: 'top-right',
  bl: 'bottom-left',
  br: 'bottom-right',
  top: 'top-centre',
  bottom: 'bottom-centre',
  upper: 'top-centre',
  lower: 'bottom-centre',
  left: 'mid-left',
  right: 'mid-right',
  mid: 'centre',
  centre: 'centre',
  'above-left': 'top-left',
  'above-right': 'top-right',
  'below-left': 'bottom-left',
  'below-right': 'bottom-right',
  'centre-left': 'mid-left',
  'centre-right': 'mid-right',
  'center-left': 'mid-left',
  'center-right': 'mid-right',
  'centre-top': 'top-centre',
  'centre-bottom': 'bottom-centre',
  'center-top': 'top-centre',
  'center-bottom': 'bottom-centre',
  'far-left': 'mid-left',
  'far-right': 'mid-right',
  'top-mid': 'top-centre',
  'bottom-mid': 'bottom-centre',
  'left-mid': 'mid-left',
  'right-mid': 'mid-right',
  'mid-top': 'top-centre',
  'mid-bottom': 'bottom-centre',
  // Español: los bancos traducidos describen la posición con frases de varias
  // palabras, así que `normalisePositionWord` compara también frases enteras.
  'arriba a la izquierda': 'top-left',
  'arriba a la derecha': 'top-right',
  'abajo a la izquierda': 'bottom-left',
  'abajo a la derecha': 'bottom-right',
  'superior izquierda': 'top-left',
  'superior derecha': 'top-right',
  'inferior izquierda': 'bottom-left',
  'inferior derecha': 'bottom-right',
  'centro-arriba': 'top-centre',
  'centro-abajo': 'bottom-centre',
  'centro-izquierda': 'mid-left',
  'centro-derecha': 'mid-right',
  'arriba-izquierda': 'top-left',
  'arriba-derecha': 'top-right',
  'abajo-izquierda': 'bottom-left',
  'abajo-derecha': 'bottom-right',
  'muy a la derecha': 'mid-right',
  'muy a la izquierda': 'mid-left',
  'a la derecha': 'mid-right',
  'a la izquierda': 'mid-left',
  'arriba en el centro': 'top-centre',
  'abajo en el centro': 'bottom-centre',
  'inferior media': 'bottom-centre',
  'superior media': 'top-centre',
  arriba: 'top-centre',
  abajo: 'bottom-centre',
  izquierda: 'mid-left',
  derecha: 'mid-right',
  centro: 'centre',
  medio: 'centre',
  superior: 'top-centre',
  inferior: 'bottom-centre',
}

function normalisePositionWord(clean: string): Position | null {
  // "top-right corner", "esquina superior derecha", "far lower-right" — el
  // banco adorna la posición con palabras que no cambian de qué celda habla.
  const stripped = clean
    .replace(/^(far|just|slightly|en la|la|el)\s+/, '')
    .replace(/^(esquina|zona|parte)\s+/, '')
    .replace(/\s+(corner|area|side|edge|row|column)$/, '')
    .replace(/\s+(esquina|zona|lado|fila|columna)$/, '')
    .trim()
  if ((POSITIONS as string[]).includes(stripped)) return stripped as Position
  if (stripped in POSITION_WORDS) return POSITION_WORDS[stripped]
  return null
}

/** Nº máximo de palabras que puede ocupar una posición ("arriba a la
 * izquierda"), para la búsqueda voraz de `consumePhrase`. */
const MAX_POSITION_WORDS = 4

/** Recorre una frase de izquierda a derecha reconociendo, de forma voraz,
 * posiciones (que pueden ocupar varias palabras en español), nombres de
 * figura y atributos sueltos. Devuelve las palabras que no ha sabido
 * interpretar, para que el llamador las conserve como texto. */
function consumePhrase(
  phrase: string,
  handlers: {
    position?: (p: Position) => boolean
    shapeName?: (s: ShapeKind) => boolean
    attr?: (a: ParenAttr) => boolean
  },
): string[] {
  const words = phrase.split(/\s+/).filter(Boolean)
  const leftover: string[] = []
  let i = 0
  while (i < words.length) {
    let taken = 0
    for (let take = Math.min(MAX_POSITION_WORDS, words.length - i); take >= 1 && !taken; take--) {
      const chunk = words.slice(i, i + take).join(' ').toLowerCase().replace(/[.;:,]+$/, '')
      if (!chunk) continue
      const position = handlers.position ? normalisePositionWord(chunk) : null
      if (position && handlers.position!(position)) {
        taken = take
        break
      }
      if (take > 1) continue
      const name = handlers.shapeName ? SHAPE_NAMES[chunk] : undefined
      if (name && handlers.shapeName!(name)) {
        taken = 1
        break
      }
      const attr = handlers.attr ? parseParenAttr(chunk) : null
      if (attr && handlers.attr!(attr)) {
        taken = 1
        break
      }
    }
    if (taken) {
      i += taken
    } else {
      leftover.push(words[i])
      i += 1
    }
  }
  return leftover
}

// Nombres de figura en palabras. El banco real los usa dentro de corchetes
// ("[roof: hexagon, 6 sides]", "[top: square]") donde no hay glifo Unicode.
// Solo se reconocen DENTRO de corchetes: a nivel superior una palabra suelta
// como "circle" es prosa descriptiva, no una figura que haya que dibujar.
const SHAPE_NAMES: Record<string, ShapeKind> = {
  circle: 'circle', circles: 'circle', círculo: 'circle', círculos: 'circle',
  square: 'square', squares: 'square', cuadrado: 'square', cuadrados: 'square',
  triangle: 'triangle', triangles: 'triangle', triángulo: 'triangle', triángulos: 'triangle',
  star: 'star', stars: 'star', estrella: 'star', estrellas: 'star',
  diamond: 'diamond', diamonds: 'diamond', rhombus: 'diamond',
  rombo: 'diamond', rombos: 'diamond',
  pentagon: 'pentagon', pentagons: 'pentagon', pentágono: 'pentagon', pentágonos: 'pentagon',
  hexagon: 'hexagon', hexagons: 'hexagon', hexágono: 'hexagon', hexágonos: 'hexagon',
  rectangle: 'rectangle', rectangles: 'rectangle', bar: 'rectangle',
  rectángulo: 'rectangle', rectángulos: 'rectangle', barra: 'rectangle',
  heart: 'heart', hearts: 'heart', corazón: 'heart', corazones: 'heart',
  arrow: 'arrow', arrows: 'arrow', flecha: 'arrow', flechas: 'arrow',
  sun: 'sun', suns: 'sun', sol: 'sun', soles: 'sun',
  cloud: 'cloud', clouds: 'cloud', nube: 'cloud', nubes: 'cloud',
  moon: 'moon', luna: 'moon',
}

const SIZES: SizeKind[] = ['small', 'medium', 'large', 'extra-large']

/** Proporción mínima de paneles dibujables que debe tener un bloque de texto
 * para tratarlo como una secuencia de figuras (ver `extractPromptFigures`). */
const MIN_DRAWABLE_RATIO = 0.3

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

/** Notación en prosa del "círculo con radios" del banco real: la figura se
 * describe repartida en varios corchetes seguidos — "[6 spikes, 6th
 * lower-left] [line diagonal] [one half black]" — donde ninguno contiene un
 * glifo. Cada corchete aporta una parte de la MISMA figura, así que se
 * acumulan sobre un único ShapeSpec en vez de crear tres.
 *
 * Devuelve los cambios que ese corchete aporta, o null si no habla de esto. */
function parseSpikedCirclePart(text: string): Partial<ShapeSpec> | null {
  const t = text.trim().toLowerCase()

  const count = t.match(/^(\d+)\s*(spikes?|rayos?|lines?|líneas?|radios?)\b(.*)$/)
  if (count) {
    const part: Partial<ShapeSpec> = { spikes: Number(count[1]) }
    const extra = count[3]
    if (/lower-left|abajo a la izquierda|inferior izquierda/.test(extra)) part.spikeExtra = 'bottom-left'
    else if (/lower-right|abajo a la derecha|inferior derecha/.test(extra)) part.spikeExtra = 'bottom-right'
    return part
  }

  const divider = t.match(/^(?:line|línea)\s*~?\s*(diagonal|vertical|horizontal)\b/)
  if (divider) {
    return { dividerDeg: divider[1] === 'vertical' ? 90 : divider[1] === 'diagonal' ? 45 : 0 }
  }

  // "one half black", "left black / right clear", "bottom grey", "both clear"
  const halfFill = t.match(
    /\b(black|negra|grey|gris|shaded|sombreada|clear|transparente|white|blanca)\b/,
  )
  const halfSide = t.match(
    /^(one half|una mitad|left|izquierda|right|derecha|top|arriba|bottom|abajo|both|ambas)\b/,
  )
  if (halfSide && halfFill) {
    const word = halfFill[1]
    const fill: FillKind =
      word === 'black' || word === 'negra'
        ? 'filled'
        : word === 'grey' || word === 'gris' || word === 'shaded' || word === 'sombreada'
          ? 'grey'
          : 'empty'
    const side = /^(right|derecha|bottom|abajo)/.test(halfSide[1]) ? 'second' : 'first'
    return { shadedHalf: { side, fill } }
  }
  return null
}

/** Etiquetas que nombran una BANDA horizontal del panel ("top:", "bottom:",
 * "upper:", "lower:") en vez de una celda de la rejilla 3×3. El banco real
 * las usa para paneles con filas apiladas de varias figuras cada una
 * ("[top: □⬠] [bottom: △□]"), que no caben en una celda. Se traducen a un
 * índice de fila; las filas vacías se compactan al dibujar. */
const ROW_LABELS: Record<string, number> = {
  row: 0, rows: 0, fila: 0, filas: 0,
  top: 0, upper: 0, arriba: 0, superior: 0, 'fila superior': 0, 'top row': 0,
  middle: 1, mid: 1, centre: 1, center: 1, medio: 1, centro: 1, central: 1,
  bottom: 2, lower: 2, abajo: 2, inferior: 2, 'fila inferior': 2, 'bottom row': 2,
}

/** Lee un trozo de texto de dentro de un corchete y saca de él las figuras que
 * describa: glifos Unicode, nombres de figura en palabras ("hexagon"), y las
 * palabras de posición/relleno/tamaño que los acompañen. Devuelve también lo
 * que no ha sabido interpretar, para no perderlo.
 *
 * Acepta el prefijo "etiqueta:" ("TR: ■", "top: □△") aplicando esa posición a
 * todas las figuras del segmento. */
function parseBracketSegment(seg: string): { shapes: ShapeSpec[]; leftover: string[]; row?: number } {
  let text = seg.trim()
  const shapes: ShapeSpec[] = []
  const leftover: string[] = []

  let segPosition: Position | undefined
  let segRow: number | undefined
  let labelled = false
  const label = text.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ -]*?)\s*:\s*([\s\S]*)$/)
  if (label) {
    const word = label[1].trim().toLowerCase()
    // "top:"/"bottom:" nombran una banda entera del panel, no una celda:
    // pueden llevar varias figuras en fila. "top-left:" sí es una celda.
    if (word in ROW_LABELS) {
      segRow = ROW_LABELS[word]
      labelled = true
      text = label[2]
    } else {
      const p = normalisePositionWord(word)
      if (p) {
        segPosition = p
        labelled = true
        text = label[2]
      }
    }
  }

  const applyPhrase = (phrase: string) => {
    leftover.push(
      ...consumePhrase(phrase, {
        position: (p) => {
          // Una posición suelta coloca la última figura vista. Si todavía no
          // hay ninguna, NO se guarda para la siguiente: en prosa suelta esa
          // palabra suele describir otra cosa ("black diamond centre",
          // "4 círculos arriba + 4 abajo") y acabaría colocando una figura que
          // no le corresponde — y de forma distinta en inglés y en español.
          // Para eso está la etiqueta explícita "algo:" del principio.
          if (shapes.length === 0) return false
          shapes[shapes.length - 1].position = p
          return true
        },
        // Un nombre de figura en palabras solo cuenta como figura si el
        // segmento venía etiquetado con una posición ("[TR: square]"). En
        // prosa suelta no: "half-circle shaded" y "medio círculo sombreado"
        // no contienen los mismos sustantivos, así que reconocerlos ahí
        // haría que el inglés y el español dibujaran cosas distintas.
        shapeName: labelled
          ? (s) => {
              shapes.push({ shape: s, fill: 'empty', rotationDeg: 0, size: 'medium' })
              return true
            }
          : undefined,
        attr: (a) => {
          if (shapes.length === 0) return false
          const target = shapes[shapes.length - 1]
          if (a.size) target.size = a.size
          if (a.fill) target.fill = a.fill
          if (a.rotationDeg != null) target.rotationDeg = a.rotationDeg
          return true
        },
      }),
    )
  }

  let run = ''
  const chars = [...text]
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (ch === '(') {
      const end = chars.indexOf(')', i + 1)
      if (end !== -1) {
        applyPhrase(run)
        run = ''
        // Un paréntesis pegado a un glifo es una GLOSA de esa figura
        // ("⬢(filled hexagon)", "⬠(empty pentagon)"): ajusta su relleno o su
        // tamaño, pero no añade una figura más. Sin esta distinción el panel
        // acababa con el doble de figuras de las que describe.
        for (const part of chars.slice(i + 1, end).join('').split(',')) {
          leftover.push(
            ...consumePhrase(part, {
              position: (p) => {
                if (shapes.length === 0) return false
                shapes[shapes.length - 1].position = p
                return true
              },
              attr: (a) => {
                if (shapes.length === 0) return false
                const target = shapes[shapes.length - 1]
                if (a.size) target.size = a.size
                if (a.fill) target.fill = a.fill
                if (a.rotationDeg != null) target.rotationDeg = a.rotationDeg
                return true
              },
            }),
          )
        }
        i = end
        continue
      }
    }
    if (ch in TRIANGLE_MAP) {
      applyPhrase(run)
      run = ''
      const t = TRIANGLE_MAP[ch]
      shapes.push({ shape: 'triangle', fill: t.fill, rotationDeg: t.rotationDeg, size: 'medium' })
      continue
    }
    if (ch in SHAPE_MAP) {
      applyPhrase(run)
      run = ''
      const s = SHAPE_MAP[ch]
      shapes.push({ shape: s.shape, fill: s.fill, rotationDeg: 0, size: 'medium' })
      continue
    }
    // Una flecha dentro del corchete pertenece a SU segmento ("[upper: ●↑]"):
    // si se saca antes de repartir las filas acaba flotando fuera de la fila
    // del círculo al que acompaña.
    if (ch in COMPASS_MAP) {
      applyPhrase(run)
      run = ''
      shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: COMPASS_MAP[ch], size: 'small' })
      continue
    }
    if (/[,;]/.test(ch)) {
      applyPhrase(run)
      run = ''
      continue
    }
    run += ch
  }
  applyPhrase(run)

  if (segPosition) {
    for (const s of shapes) s.position = s.position ?? segPosition
  }
  if (segRow != null) {
    for (const s of shapes) s.row = s.row ?? segRow
  }
  return { shapes, leftover, row: segRow }
}

/** Interpreta el contenido de un corchete como figuras en vez de como pie de
 * texto. Devuelve null si no reconoce ninguna, para que el llamador siga con
 * el tratamiento de siempre. */
function parseBracketShapes(
  inner: string,
): { shapes: ShapeSpec[]; leftover: string[]; partial: boolean } | null {
  const split = splitRows(inner, (part) => parseBracketSegment(part).shapes.length > 0)
  if (split.parts) {
    const shapes: ShapeSpec[] = []
    const leftover: string[] = []
    split.parts.forEach((row, i) => {
      const r = parseBracketSegment(row)
      for (const s of r.shapes) {
        s.row = s.row ?? i
        shapes.push(s)
      }
      leftover.push(...r.leftover)
    })
    return shapes.length > 0 ? { shapes, leftover, partial: split.partial } : null
  }

  const shapes: ShapeSpec[] = []
  const leftover: string[] = []
  for (const seg of inner.split(/[,;]/)) {
    const r = parseBracketSegment(seg)
    shapes.push(...r.shapes)
    leftover.push(...r.leftover)
  }
  return shapes.length > 0 ? { shapes, leftover, partial: split.partial } : null
}

/** Decide si un "/" separa FILAS de un panel ("○○○○ / ▽▽▽ / ●●●") o es solo
 * puntuación dentro de la prosa ("droopy/floppy", "3rd/right", "grey/black").
 * Solo cuenta como fila si al partir salen al menos dos trozos que de verdad
 * contienen figuras — así una barra suelta en un texto descriptivo no parte
 * el panel en pedazos. Devuelve null si no es un reparto en filas. */
function splitRows(
  text: string,
  hasShapes: (part: string) => boolean,
): { parts: string[] | null; partial: boolean } {
  if (!text.includes('/')) return { parts: null, partial: false }
  const parts = tokenize(text, (ch) => ch === '/')
  if (parts.length < 2) return { parts: null, partial: false }
  const drawable = parts.filter(hasShapes).length
  // Si el texto declara N filas y solo sabemos dibujar algunas, la figura sale
  // incompleta justo en lo que la pregunta compara ("[arrow alone / bottom: ○]"
  // dibujaría el círculo y se comería la flecha). Cero filas dibujables no
  // cuenta: ahí la barra es puntuación de la prosa ("droopy/floppy").
  return {
    parts: drawable >= 2 ? parts : null,
    partial: drawable >= 1 && drawable < parts.length,
  }
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
    return { shapes: [], isBlank: true, raw: trimmed, partial: false }
  }

  // Las opciones escriben las filas del panel sin corchetes ("○○○○ / ▽▽▽ /
  // ●●●") mientras que el enunciado las escribe dentro de uno ("[○○ / ▲▼▲ /
  // ○○○○]"). Es la MISMA notación, así que tiene que dibujarse igual: si no,
  // el enunciado sale en filas y las opciones en un montón plano, y no hay
  // forma de compararlos.
  const topRows = splitRows(trimmed, (part) => parsePanelBody(part).shapes.length > 0)
  if (topRows.parts) {
    const shapes: ShapeSpec[] = []
    const captions: string[] = []
    let partial = topRows.partial
    topRows.parts.forEach((row, i) => {
      const body = parsePanelBody(row)
      for (const s of body.shapes) {
        s.row = s.row ?? i
        shapes.push(s)
      }
      if (body.caption) captions.push(body.caption)
      partial = partial || body.partial
    })
    const caption = captions.join(' ').replace(/\s+/g, ' ').trim() || undefined
    return {
      shapes,
      caption: shapes.length > 0 ? cleanCaption(caption) : (caption ?? trimmed),
      isBlank: false,
      raw: trimmed,
      partial,
    }
  }

  const body = parsePanelBody(trimmed)
  return { ...body, partial: body.partial || topRows.partial, isBlank: false, raw: trimmed }
}

/** Cuerpo de `parsePanel` para un texto ya sin reparto en filas. */
function parsePanelBody(raw: string): { shapes: ShapeSpec[]; caption?: string; partial: boolean } {
  const trimmed = raw.trim()
  let partial = false
  const shapes: ShapeSpec[] = []
  const captions: string[] = []
  let unrecognizedRun = ''
  const flushRun = () => {
    const raw = unrecognizedRun.trim()
    unrecognizedRun = ''
    if (!raw) return
    // Conectores puramente gramaticales entre dos símbolos ("△ with □",
    // "△ con □") no aportan ninguna descripción visual — mostrarlos como
    // caption es solo ruido bajo el icono, no información.
    if (CONNECTOR_WORDS.has(raw.toLowerCase())) return
    // Una posición escrita sin paréntesis justo detrás de una figura
    // ("☆ top-right corner; ■ centre", "★ arriba a la izquierda") la coloca
    // en su celda. Sin esto las cinco opciones de una pregunta de rejilla
    // dibujaban los mismos iconos y toda la diferencia quedaba en el texto.
    // "arriba-izquierda: △ arriba-derecha: ⬡" — aquí la posición va DELANTE
    // del glifo, así que se guarda y se aplica a la siguiente figura.
    const labelled = raw.match(/^(.*?)\s*:\s*$/)
    if (labelled) {
      const word = labelled[1].trim().toLowerCase()
      // Igual que dentro de un corchete: "top:"/"bottom:" nombran una banda
      // entera del panel (puede llevar varias figuras en fila), no una celda.
      if (word in ROW_LABELS) {
        pendingRow = ROW_LABELS[word]
        return
      }
      const p = normalisePositionWord(word)
      if (p) {
        pendingPosition = p
        return
      }
    }
    const rest = consumePhrase(raw, {
      position: (p) => {
        if (shapes.length === 0) return false
        shapes[shapes.length - 1].position = p
        return true
      },
    })
    if (rest.length > 0) captions.push(rest.join(' '))
  }

  // Índice (en `shapes`) hasta el que ya se han aplicado atributos de algún
  // grupo "(...)" anterior. Un grupo pegado a un símbolo ("●(small)") solo
  // afecta a esa última forma; un grupo suelto tras un espacio
  // ("◆◆◆ (large)") se entiende como "todas las formas repetidas desde la
  // última vez que se aplicó un grupo", para cubrir el estilo del banco real
  // donde un tamaño/relleno compartido se declara una sola vez al final de
  // una tanda de símbolos idénticos.
  let attributedUpTo = 0

  // Posición anunciada ANTES de la figura ("centro: ●"), pendiente de
  // aplicarse a la siguiente que aparezca.
  let pendingPosition: Position | undefined
  // Banda horizontal anunciada antes de las figuras ("top: △△ / bottom: △").
  let pendingRow: number | undefined
  // Figura "círculo con radios" que varios corchetes seguidos van componiendo.
  let spikedCircle: ShapeSpec | undefined
  const takePendingPosition = () => {
    // A diferencia de la posición, la banda NO se consume: "top: △△" pone las
    // DOS figuras en la fila de arriba, no solo la primera.
    if (pendingRow != null) shapes[shapes.length - 1].row = pendingRow
    if (!pendingPosition) return
    shapes[shapes.length - 1].position = pendingPosition
    pendingPosition = undefined
  }

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
    // Los corchetes del banco real no son solo prosa: muchos describen el
    // contenido del panel con glifos y/o nombres de figura ("[TR: ■]",
    // "[top: □] [bottom: △]", "[○○ / ▲▼▲ / ○○○○]"). Dejarlos siempre como pie
    // de texto hacía que opciones distintas dibujaran el mismo icono, porque
    // toda la diferencia vivía en el texto descartado.
    const asShapes = parseBracketShapes(text)
    if (asShapes) {
      shapes.push(...asShapes.shapes)
      if (asShapes.leftover.length > 0) captions.push(asShapes.leftover.join(' '))
      if (asShapes.partial) partial = true
      attributedUpTo = shapes.length
      return
    }
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
      attributedUpTo = shapes.length
      return
    }
    // "[6 spikes] [line diagonal] [one half black]" describen UNA figura
    // repartida en tres corchetes: se acumulan sobre la misma.
    const spikePart = parseSpikedCirclePart(text)
    if (spikePart) {
      if (!spikedCircle) {
        spikedCircle = { shape: 'spiked-circle', fill: 'empty', rotationDeg: 0, size: 'medium' }
        shapes.push(spikedCircle)
        attributedUpTo = shapes.length
      }
      Object.assign(spikedCircle, spikePart)
      return
    }
    text = text
      .replace(/\(\s*\)/g, '')
      .replace(/\s*,\s*,/g, ',')
      .replace(/^[\s,]+|[\s,]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (text) {
      captions.push(text)
      // El propio libro reserva los corchetes para "aquí la figura no se
      // reduce al juego de símbolos" (ver la leyenda de notación). Si encima
      // no hemos sabido sacar ninguna figura del corchete, lo que se dibuje
      // del resto del panel es solo el adorno — el sujeto de la figura se
      // queda fuera. Marcar el panel como parcial hace que la pregunta
      // entera se muestre como texto en vez de como media figura.
      partial = true
    }
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
    // El espacio ya NO corta el texto acumulado: una posición en español
    // ocupa varias palabras ("arriba a la izquierda") y hay que verla entera.
    // Lo que corta son los separadores de descripción.
    if (/[;,]/.test(ch) || ch === '/' || ch === '+' || ch === '=') {
      flushRun()
      i++
      continue
    }
    if (ch in TRIANGLE_MAP) {
      flushRun()
      const t = TRIANGLE_MAP[ch]
      shapes.push({ shape: 'triangle', fill: t.fill, rotationDeg: t.rotationDeg, size: 'medium' })
      takePendingPosition()
    } else if (ch in SHAPE_MAP) {
      flushRun()
      const s = SHAPE_MAP[ch]
      shapes.push({ shape: s.shape, fill: s.fill, rotationDeg: 0, size: 'medium' })
      takePendingPosition()
    } else if (ch in COMPASS_MAP) {
      flushRun()
      shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: COMPASS_MAP[ch], size: 'medium' })
      takePendingPosition()
    } else {
      // carácter no reconocido (letra, dígito, puntuación residual…): a caption
      unrecognizedRun += ch
    }
    i++
  }
  flushRun()

  const caption = captions.join(' ').replace(/\s+/g, ' ').trim() || undefined

  // Una flecha de compás junto a otras figuras es un adorno de esas figuras
  // ("[upper: ●↑]"), no una figura del mismo rango: se dibuja pequeña. Sola en
  // su panel (las matrices de flechas) sí es la figura, a tamaño normal. Sin
  // esto el enunciado y las opciones de una misma pregunta dibujaban la misma
  // flecha a tamaños distintos según cómo estuviera escrito el panel.
  if (shapes.length > 1) {
    for (const shape of shapes) {
      if (shape.shape === 'arrow') shape.size = 'small'
    }
  }

  return {
    shapes,
    caption: shapes.length > 0 ? cleanCaption(caption) : (caption ?? trimmed),
    partial,
  }
}

/** ¿Se puede dibujar TODO este grupo de paneles con fidelidad? Un panel vale
 * si es la incógnita ("?") o si tiene figuras y no es un fragmento
 * (`partial`). Se pregunta por el grupo entero, no panel a panel, porque la
 * comparación es lo único que se le pide al alumno: una secuencia (o una
 * lista de opciones) mitad iconos mitad párrafos no se puede comparar, y las
 * que se quedan en texto suelen ser justo las que llevan la diferencia. */
export function panelsDrawable(panels: FigurePanel[]): boolean {
  return panels.every((p) => p.isBlank || (p.shapes.length > 0 && !p.partial))
}

// Palabras que un pie de figura puede contener sin aportar nada: nombran una
// figura, un relleno o una orientación que el icono YA muestra. Aparecen
// cuando el texto glosa su propio símbolo ("⬢(filled hexagon)", "▲(filled,
// up)") o cuando repite un recuento que ya se ve ("(2 filled + 1 empty)").
// Un pie hecho solo de estas palabras es ruido bajo el icono — y encima se
// queda sin traducir en la versión española, porque son la notación.
const REDUNDANT_CAPTION_WORDS = new Set([
  'circle', 'circles', 'square', 'squares', 'triangle', 'triangles', 'diamond', 'diamonds',
  'star', 'stars', 'heart', 'hearts', 'pentagon', 'pentagons', 'hexagon', 'hexagons',
  'arrow', 'arrows', 'dot', 'dots', 'shape', 'shapes',
  'filled', 'empty', 'black', 'white', 'grey', 'gray', 'outline', 'clear', 'shaded', 'striped',
  'hatched', 'small', 'large', 'big', 'up', 'down', 'left', 'right', 'and', 'plus', 'both',
  // Los mismos, en español: el pie tiene que desaparecer en los dos idiomas o
  // la misma opción se ve con pie en uno y sin él en el otro.
  'círculo', 'círculos', 'cuadrado', 'cuadrados', 'triángulo', 'triángulos',
  'rombo', 'rombos', 'estrella', 'estrellas', 'corazón', 'corazones',
  'pentágono', 'pentágonos', 'hexágono', 'hexágonos', 'flecha', 'flechas',
  'punto', 'puntos', 'figura', 'figuras',
  'relleno', 'rellena', 'rellenos', 'rellenas', 'vacío', 'vacía', 'vacíos', 'vacías',
  'negro', 'negra', 'negros', 'negras', 'blanco', 'blanca', 'blancos', 'blancas',
  'gris', 'grises', 'contorno', 'transparente', 'transparentes',
  'sombreado', 'sombreada', 'rayado', 'rayada', 'pequeño', 'pequeña', 'grande',
  'arriba', 'abajo', 'izquierda', 'derecha', 'y', 'más', 'ambos', 'ambas',
])

/** Quita el pie de figura cuando no dice nada que el icono no enseñe ya. */
function cleanCaption(caption: string | undefined): string | undefined {
  if (!caption) return undefined
  const words = caption.toLowerCase().match(/[a-záéíóúñ]+|\d+/g)
  if (!words || words.length === 0) return undefined
  return words.every((w) => REDUNDANT_CAPTION_WORDS.has(w) || /^\d+$/.test(w)) ? undefined : caption
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
    .map(
      (s) =>
        `${s.position ?? ''}|${s.row ?? ''}|${s.shape}|${s.fill}|${s.position ? 'framed' : s.size}|${((s.rotationDeg % 360) + 360) % 360}` +
        `|${s.spikes ?? ''}${s.spikeExtra ?? ''}|${s.dividerDeg ?? ''}|${s.shadedHalf ? `${s.shadedHalf.side}${s.shadedHalf.fill}` : ''}`,
    )
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
  // como secuencia (mayor proporción de paneles dibujables: con alguna forma,
  // o el panel incógnita "?").
  const blocks = prompt.split(/\n\s*\n/)
  let best: { index: number; panels: FigurePanel[]; score: number } | null = null

  blocks.forEach((block, index) => {
    const panelTexts = splitPanels(block)
    if (panelTexts.length < 2) return
    const panels = panelTexts.map(parsePanel)
    const withShapes = panels.filter((p) => p.shapes.length > 0).length
    if (withShapes === 0) return
    const drawable = panels.filter((p) => p.shapes.length > 0 || p.isBlank).length
    const score = drawable / panels.length
    if (!best || score > best.score) {
      best = { index, panels, score }
    }
  })

  // Prompts cuya secuencia es toda prosa ("[trompa media] [charco 3] · ..."):
  // no hay ninguna figura que dibujar, pero la secuencia SÍ existe y se pierde
  // si se deja como un párrafo corrido. Se devuelven los paneles en texto,
  // para que se lean en orden y uno al lado de otro igual que en las preguntas
  // que sí se dibujan. Se exige el separador de panel explícito ('·'/'—') y el
  // panel incógnita final, para no confundir un párrafo con una secuencia.
  const asTextSequence = (): PromptFigures | null => {
    for (const block of blocks) {
      if (!/[·—]/.test(block)) continue
      const panelTexts = splitPanels(block)
      if (panelTexts.length < 3 || panelTexts[panelTexts.length - 1].trim() !== '?') continue
      return {
        kind: 'sequence',
        panels: panelTexts.map(parsePanel),
        remainderMd: blocks.filter((b) => b !== block).join('\n\n').trim(),
      }
    }
    return null
  }

  if (!best) return asTextSequence()

  const chosen: { index: number; panels: FigurePanel[]; score: number } = best
  // Un párrafo de prosa que solo contiene una flecha suelta como signo de
  // puntuación ("el relleno sigue el ciclo negro → gris → blanco") pasa el
  // filtro de arriba: '→' está en COMPASS_MAP, así que el bloque tiene "una
  // forma". Sin este umbral, la frase entera se trocea en un panel por
  // palabra y se dibuja como una ristra de ~50 recuadros de texto con flechas
  // intercaladas, relegando además la secuencia real a texto plano debajo.
  // Los scores reales del banco son bimodales (72 secuencias auténticas dan
  // 1.00; los párrafos de prosa dan 0.04–0.13), así que el corte separa
  // limpiamente ambos casos y ninguna secuencia legítima cae por debajo.
  if (chosen.score < MIN_DRAWABLE_RATIO) return asTextSequence()

  const remainderMd = blocks
    .filter((_, i) => i !== chosen.index)
    .join('\n\n')
    .trim()
  return { kind: 'sequence', panels: chosen.panels, remainderMd }
}
