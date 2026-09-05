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
  // Elementos de «escenario» del banco real: una línea que cruza el marco, una
  // rampa, una onda y una cruz. No son adornos — son el sujeto del panel en
  // decenas de preguntas, y sin ellos esas preguntas no tenían figura que
  // dibujar y se quedaban en notación cruda.
  | 'line' | 'bent-line' | 'slope' | 'wave' | 'wave-trough' | 'cross'
  | 'polygon' | 'tally' | 'double-arrow' | 'rotate-cw' | 'rotate-ccw' | 'ellipse'
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
  /** Nº de lados de un polígono regular ('polygon'), o nº de marcas de un
   * recuento ('tally'). El banco compara «dos figuras de 7 lados» con «dos
   * figuras de 8 lados», y tartas de 1, 2 o 3 velas: sin el número, esas
   * opciones se dibujaban idénticas. */
  sides?: number
  /** Nº de puntas de una estrella. El banco compara estrellas de 4, 5, 6 y 8
   * puntas dentro de la misma pregunta: dibujarlas todas de 5 borra la
   * diferencia que se pregunta. */
  points?: number
  /** Media figura sombreada: el banco real describe constantemente figuras
   * partidas por la mitad con una mitad negra/gris y la otra en blanco ("una
   * versión sobredimensionada y medio sombreada", "como un molinillo de dos
   * tonos"). Es justo lo que distingue unas opciones de otras, así que sin
   * dibujarlo las cinco opciones salían idénticas. */
  halfFill?: { fill: FillKind; split: 'vertical' | 'horizontal' | 'diagonal'; side: 'first' | 'second' }
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
  '✚': { shape: 'cross', fill: 'filled' },
  '✛': { shape: 'cross', fill: 'empty' },
  '⊞': { shape: 'cross', fill: 'empty' },
  // Elipse alta: el banco la usa como pictograma DISTINTO del círculo, así que
  // no puede dibujarse como uno o dos opciones se volverían idénticas.
  '⬮': { shape: 'ellipse', fill: 'filled' },
  // Flechas de doble punta y marcadores de giro: sin mapear se quedaban como
  // texto crudo (y el navegador los pintaba como emoji de color).
  '↕': { shape: 'double-arrow', fill: 'filled' },
  '↔': { shape: 'double-arrow', fill: 'filled' },
  '⇌': { shape: 'double-arrow', fill: 'filled' },
  '⟲': { shape: 'rotate-ccw', fill: 'filled' },
  '↺': { shape: 'rotate-ccw', fill: 'filled' },
  '↻': { shape: 'rotate-cw', fill: 'filled' },
  '⟳': { shape: 'rotate-cw', fill: 'filled' },
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
  // Variantes gruesas y huecas de las mismas flechas.
  '⬅': 180, '⬆': 270, '⬇': 90, '➡': 0,
  '⇦': 180, '⇧': 270, '⇩': 90, '⇨': 0,
  '⇐': 180, '⇑': 270, '⇓': 90, '⇒': 0,
  '→': 0, '↘': 45, '↓': 90, '↙': 135, '←': 180, '↖': 225, '↑': 270, '↗': 315,
}

// Rumbo al que apunta la MUESCA de un círculo "pac-man" ("◔W", "◔NE"). Misma
// convención que COMPASS_MAP: 0° = Este, creciendo en sentido horario.
const NOTCH_MAP: Record<string, number> = {
  N: 270, NE: 315, E: 0, SE: 45, S: 90, SW: 135, W: 180, NW: 225,
}

/** El icono 'three-quarter-circle' ya es un pac-man, pero con la muesca fija
 * en el cuadrante superior derecho (NE). Girarlo hasta el rumbo pedido es lo
 * que hace visible la dirección de la muesca. */
const NOTCH_BASE_DEG = 315

/** Lee "◔" seguido del rumbo de su muesca ("◔W", "◔NE"). La dirección de la
 * muesca ES la regla en las preguntas que usan este símbolo (qué círculo
 * coincide con hacia dónde apunta la figura del medio): dibujar los seis
 * pac-man idénticos borraba justo lo que se pregunta, y las letras acababan
 * sueltas en el pie de texto ("W NE W"). */
function readNotchedCircle(chars: string[], i: number): { spec: Omit<ShapeSpec, 'size'>; next: number } | null {
  if (chars[i] !== '◔') return null
  const make = (letters: string, next: number) => ({
    spec: {
      shape: 'three-quarter-circle' as ShapeKind,
      fill: 'filled' as FillKind,
      rotationDeg: (NOTCH_MAP[letters] - NOTCH_BASE_DEG + 360) % 360,
    },
    next,
  })
  const two = chars.slice(i + 1, i + 3).join('')
  if (two in NOTCH_MAP) return make(two, i + 3)
  const one = chars[i + 1] ?? ''
  if (one in NOTCH_MAP) return make(one, i + 2)
  return null
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
  // El banco divide el marco en mitades tan a menudo como en celdas.
  'top-half': 'top-centre',
  'bottom-half': 'bottom-centre',
  'mitad superior': 'top-centre',
  'mitad inferior': 'bottom-centre',
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

/** Coordenada de una cuadrícula grande escrita en palabras: "fila superior
 * 2.ª columna" / "top row 2nd column". El banco la usa sobre cuadrículas de
 * 6 columnas (y advierte en el propio enunciado de que las coordenadas son
 * aproximadas); el marco del dibujo tiene 3, así que cada par de columnas cae
 * en un tercio. Sin esto la frase se consumía a medias y el pie quedaba en
 * "fila 2.ª columna fila 4.ª columna". */
function gridCoordinate(clean: string): Position | null {
  const m = clean.match(
    /^(?:(top|bottom|middle|mid)\s+row|fila\s+(superior|inferior|central|media))\s+(\d+)\s*(?:st|nd|rd|th)?\.?[ºª]?\s*(?:column|columna)$/,
  )
  if (!m) return null
  const band = m[1] ?? m[2]
  const column = Number(m[3])
  const row = /top|superior/.test(band) ? 'top' : /bottom|inferior/.test(band) ? 'bottom' : 'mid'
  const side = column <= 2 ? 'left' : column <= 4 ? 'centre' : 'right'
  if (row === 'mid') return side === 'centre' ? 'centre' : (`mid-${side}` as Position)
  return `${row}-${side}` as Position
}

function normalisePositionWord(clean: string): Position | null {
  const grid = gridCoordinate(clean)
  if (grid) return grid
  // "top-right corner", "esquina superior derecha", "far lower-right" — el
  // banco adorna la posición con palabras que no cambian de qué celda habla.
  const stripped = clean
    .replace(/^(far|just|slightly|en la|la|el)\s+/, '')
    .replace(/^(esquina|zona|parte)\s+/, '')
    .replace(/\s+(corner|area|side|edge|row|column|point|slot|cell)$/, '')
    .replace(/\s+(esquina|zona|lado|fila|columna|punta|ranura|celda)$/, '')
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
    /** Si es falso, solo se aceptan nombres de OBJETO, no los geométricos. */
    allowGeometricNames?: boolean
    attr?: (a: ParenAttr) => boolean
    /** Un tamaño suelto se trata aparte porque, a diferencia del resto de
     * atributos, puede ir delante del símbolo al que describe. */
    size?: (s: SizeKind) => boolean
  },
): string[] {
  const words = phrase.split(/\s+/).filter(Boolean)
  const leftover: string[] = []
  let i = 0
  while (i < words.length) {
    let taken = 0
    for (let take = Math.min(MAX_POSITION_WORDS, words.length - i); take >= 1 && !taken; take--) {
      const chunk = words.slice(i, i + take).join(' ').toLowerCase().replace(/[.;,]+$/, '')
      if (!chunk) continue
      const position = handlers.position ? normalisePositionWord(chunk) : null
      if (position && handlers.position!(position)) {
        taken = take
        break
      }
      const parsed = handlers.attr || handlers.size ? parseParenAttr(chunk) : null
      const sizeOnly =
        parsed && parsed.size && !parsed.position && !parsed.fill && parsed.rotationDeg == null &&
        !parsed.halfFill && !parsed.halfSplit && parsed.extraArrowDeg == null
      if (sizeOnly && handlers.size && handlers.size(parsed.size!)) {
        taken = take
        break
      }
      if (parsed && handlers.attr && handlers.attr(parsed)) {
        taken = take
        break
      }
      if (take > 1) continue
      const name = handlers.shapeName
        ? OBJECT_NAMES[chunk] ?? (handlers.allowGeometricNames ? SHAPE_NAMES[chunk] : undefined)
        : undefined
      if (name && handlers.shapeName!(name)) {
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
/** Polígonos que el banco nombra por su número de lados. */
const POLYGON_SIDES: Record<string, number> = {
  heptagon: 7, 'heptágono': 7, octagon: 8, 'octágono': 8, nonagon: 9, 'eneágono': 9,
  decagon: 10, 'decágono': 10,
}

/** Objetos concretos del banco que son, a efectos de dibujo, una figura
 * básica: la celda de una cuadrícula es un cuadrado y la bola de un helado un
 * círculo. A diferencia de los nombres geométricos, estas palabras no aparecen
 * nunca como adjetivo en la prosa, así que se aceptan también en corchetes sin
 * etiqueta ("[celda gris, zona superior]"). */
const OBJECT_NAMES: Record<string, ShapeKind> = {
  cell: 'square', cells: 'square', celda: 'square', celdas: 'square',
  scoop: 'circle', scoops: 'circle', bola: 'circle', bolas: 'circle',
  token: 'circle', ficha: 'circle', fichas: 'circle',
  // La virutilla de chocolate del cucurucho: está o no está, y eso es
  // justamente lo que distingue dos de las opciones.
  flake: 'rectangle', flakes: 'rectangle', viruta: 'rectangle', virutas: 'rectangle',
}

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
  points?: number
  sides?: number
  /** Recuento de algo que no es una figura (velas de una tarta): se dibuja
   * como esa cantidad de marcas, que es la variable que la pregunta compara. */
  extraTally?: number
  halfFill?: ShapeSpec['halfFill']
  /** Solo el eje de partición ("vertical split", "otra diagonal"), que el
   * banco escribe a menudo en un trozo aparte del que dice el color. */
  halfSplit?: 'vertical' | 'horizontal' | 'diagonal'
}

/** Vuelca sobre una figura los atributos reconocidos de un trozo de texto.
 * Compartido por los tres sitios donde aparecen (paréntesis pegado al símbolo,
 * paréntesis suelto y segmento de corchete) para que las tres notaciones
 * produzcan exactamente la misma figura. */
function applyAttrTo(target: ShapeSpec, a: ParenAttr) {
  if (a.size) target.size = a.size
  if (a.fill) target.fill = a.fill
  if (a.rotationDeg != null) target.rotationDeg = a.rotationDeg
  if (a.position) target.position = a.position
  if (a.points != null && (target.shape === 'star' || target.shape === 'four-point-star')) {
    target.shape = 'star'
    target.points = a.points
  }
  if (a.sides != null) {
    // "⬠(5 lados)" solo confirma lo que ya dice el símbolo: no cambia nada.
    // "⬠(6 lados)" sí — y dibujarlo como pentágono dejaría dos opciones
    // distintas con el mismo icono, que es peor que no dibujarlas.
    const natural: Partial<Record<ShapeKind, number>> = {
      triangle: 3, square: 4, diamond: 4, pentagon: 5, hexagon: 6, polygon: a.sides,
    }
    if (natural[target.shape] !== a.sides) {
      target.shape = 'polygon'
      target.sides = a.sides
    }
  }
  if (a.halfFill) target.halfFill = { ...(target.halfFill ?? {}), ...a.halfFill }
  // "half black" y "vertical split" llegan en trozos distintos del mismo
  // paréntesis: el eje se aplica sobre la mitad ya declarada.
  if (a.halfSplit) {
    target.halfFill = target.halfFill
      ? { ...target.halfFill, split: a.halfSplit }
      : { fill: 'filled', split: a.halfSplit, side: 'first' }
  }
}

/** Reconoce los elementos de escenario que el banco describe entre corchetes:
 * "[línea ↘]", "[línea doblada]", "[línea arriba]", "[pendiente negra]",
 * "[onda, cresta en los bordes]", "[cruz]". Devuelve la figura, o null si el
 * corchete habla de otra cosa. */
/** Bandas reservadas para una línea de «escenario» que cruza el panel por
 * encima o por debajo de la fila de figuras. Son fraccionarias/negativas a
 * propósito: las filas se ordenan por número, así que la línea cae siempre
 * fuera de la fila que describe sin desplazar la numeración del resto. */
const ROW_LINE_ABOVE = -1
const ROW_LINE_BELOW = 0.5

function parseSceneryBracket(text: string): ShapeSpec | null {
  const t = text.trim().toLowerCase()
  const base = { fill: 'empty' as FillKind, rotationDeg: 0, size: 'medium' as SizeKind }

  const line = t.match(/^(?:l[íi]nea|line)\b(.*)$/)
  if (line) {
    const rest = line[1]
    if (/doblada|bent|acodada|escal[óo]n|step|hug|ci[ñn][ée]ndose/.test(rest)) {
      return { ...base, shape: 'bent-line' }
    }
    // Encima o debajo de la fila de figuras. Va como BANDA, no como celda de
    // la rejilla: colocada como posición acababa dibujándose dentro de la
    // misma fila que las figuras, a su izquierda, en vez de sobre ellas.
    // La banda 0,5 deja la línea entre la fila de figuras (0) y lo que el
    // panel ponga debajo de ella (1).
    if (/arriba|encima|above|superior/.test(rest)) {
      return { ...base, shape: 'line', row: ROW_LINE_ABOVE }
    }
    if (/abajo|debajo|below|inferior/.test(rest)) {
      return { ...base, shape: 'line', row: ROW_LINE_BELOW }
    }
    if (/vertical/.test(rest)) return { ...base, shape: 'line', rotationDeg: 90 }
    if (/horizontal/.test(rest)) return { ...base, shape: 'line' }
    const arrow = [...rest].find((ch) => ch in COMPASS_MAP)
    if (arrow) return { ...base, shape: 'line', rotationDeg: COMPASS_MAP[arrow] }
    if (/diagonal/.test(rest)) return { ...base, shape: 'line', rotationDeg: 45 }
    return { ...base, shape: 'line' }
  }

  const slope = t.match(/^(?:pendiente|slope|rampa|ramp)\b(.*)$/)
  if (slope) {
    const fill: FillKind = /negra|negro|black|filled|rellena/.test(slope[1])
      ? 'filled'
      : /gris|grey|shaded|sombreada/.test(slope[1])
        ? 'grey'
        : 'empty'
    return { ...base, shape: 'slope', fill }
  }

  const wave = t.match(/^(?:onda|wave)\b(.*)$/)
  if (wave) {
    // "cresta en los bordes" y "valle en los bordes" son la misma onda dada la
    // vuelta, y es justo lo que distingue unas opciones de otras.
    // Una onda girada 180° se ve IGUAL (es simétrica respecto de su centro):
    // hay que reflejarla, y para eso es una figura distinta.
    const trough = /valle|trough/.test(wave[1])
    return { ...base, shape: trough ? 'wave-trough' : 'wave' }
  }

  // Solo cuando el corchete ES una cruz. "[cross/plus-shape pattern]" habla
  // de una DISPOSICIÓN en cruz, no de la figura, y su equivalente español
  // ("patrón en forma de cruz") ni siquiera empieza por la misma palabra.
  if (/^(?:cruz|cross)(?:[ \t-](?:negra|black|blanca|white|gris|grey|filled|empty))?$/.test(t)) {
    return { ...base, shape: 'cross' }
  }
  return null
}

/** Reconoce «media figura sombreada», que el banco real escribe de muchas
 * formas: "half-filled", "half black", "half black diagonal", "black-bottom",
 * "mitad negra", "medio relleno", "división vertical". Devuelve el relleno de
 * la mitad y, si el texto lo dice, por dónde parte. */
/** "…, línea encima" / "…, underline" / "…, sin línea": una línea horizontal
 * por encima o por debajo de la fila de figuras del panel. En varias
 * preguntas del banco es LA diferencia entre unas opciones y otras, y hasta
 * ahora vivía solo en el pie de texto de 10 px gris, que es exactamente el
 * fallo que este parser existe para evitar. */
function parseRowLine(text: string): 'above' | 'below' | 'none' | null {
  const t = text.trim().toLowerCase().replace(/[.;,]+$/, '')
  if (/^(sin l[íi]nea|no line|no rule)$/.test(t)) return 'none'
  if (/^(overline|l[íi]nea (encima|arriba|superior)|line above)$/.test(t)) return 'above'
  if (/^(underline|l[íi]nea (debajo|abajo|inferior)|line below)$/.test(t)) return 'below'
  return null
}

/** Coloca la línea en su propia banda y baja el resto de figuras a la banda
 * central, para que la línea se dibuje realmente encima o debajo de ellas.
 * (Sin fijar la fila de las demás, "debajo" salía dibujado arriba: las formas
 * sin fila se ordenan las últimas.) */
function pushRowLine(where: 'above' | 'below', existing: ShapeSpec[]): ShapeSpec {
  for (const shape of existing) if (shape.row == null) shape.row = 0
  return { shape: 'line', fill: 'filled', rotationDeg: 0, size: 'medium', row: where === 'above' ? -1 : 1 }
}

function parseHalfFillPart(text: string): ParenAttr | null {
  const t = text.trim().toLowerCase()
  const axis = (word: string): 'vertical' | 'horizontal' | 'diagonal' | undefined =>
    /diagonal/.test(word) ? 'diagonal' : /vertical/.test(word) ? 'vertical' : /horizontal/.test(word) ? 'horizontal' : undefined

  // Solo el eje: "vertical split", "other diagonal", "la otra diagonal",
  // "división vertical".
  if (
    /^(?:(?:the|la|el)\s+)?(?:(?:other|otra|otro)\s+)?(?:(?:divisi[óo]n|partici[óo]n|partida\s+en|en)\s+)?(?:vertical|horizontal|diagonal)(?:\s+(?:split|division))?$/.test(t)
  ) {
    return { halfSplit: axis(t) }
  }

  const HALF_FILL_WORDS: Record<string, FillKind> = {
    black: 'filled', filled: 'filled', negra: 'filled', negro: 'filled', relleno: 'filled', rellena: 'filled',
    grey: 'grey', gris: 'grey', shaded: 'grey', sombreada: 'grey', sombreado: 'grey',
    white: 'empty', blanca: 'empty', empty: 'empty', vacía: 'empty',
  }
  // "half-filled", "half black diagonal", "mitad negra", "medio relleno"
  const half = t.match(
    /^(?:half|medio|media|mitad)[\s-]*(black|filled|negra|negro|relleno|rellena|grey|gris|shaded|sombreada|sombreado|white|blanca|empty|vacía)?(?:[\s-]*(vertical|horizontal|diagonal))?(?:\s+split)?$/,
  )
  // "half" o "medio" a secas no basta: en "half square" / "cuadrado medio" la
  // palabra acompaña al sustantivo, y el inglés y el español la ponen en
  // sitios distintos. Hace falta que diga el relleno o el eje.
  if (half && (half[1] || half[2])) {
    return {
      halfFill: {
        fill: HALF_FILL_WORDS[half[1] ?? 'filled'] ?? 'filled',
        split: (half[2] as 'vertical' | 'horizontal' | 'diagonal' | undefined) ?? 'vertical',
        side: 'first',
      },
    }
  }
  // "black-bottom", "abajo negro", "half-top": la mitad que se sombrea.
  const sided = t.match(
    /^(black|filled|negra|negro|grey|gris|shaded|sombreada)[\s-]+(top|bottom|left|right|arriba|abajo|izquierda|derecha)$|^(?:half|medio|media|mitad)[\s-]+(top|bottom|left|right|arriba|abajo|izquierda|derecha)$/,
  )
  if (sided) {
    const word = sided[1] ?? 'filled'
    const where = sided[2] ?? sided[3]!
    const vertical = /left|right|izquierda|derecha/.test(where)
    return {
      halfFill: {
        fill: HALF_FILL_WORDS[word] ?? 'filled',
        split: vertical ? 'vertical' : 'horizontal',
        side: /right|derecha|bottom|abajo/.test(where) ? 'second' : 'first',
      },
    }
  }
  return null
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
  unshaded: 'empty',
  shaded: 'grey',
  striped: 'hatched',
  // Los mismos en español. Faltaban, así que "[celda negra]" y "[celda gris]"
  // se dibujaban las dos como una celda vacía y la diferencia de color —que en
  // varias preguntas ES la regla— desaparecía del dibujo.
  negro: 'filled', negra: 'filled', negros: 'filled', negras: 'filled',
  relleno: 'filled', rellena: 'filled', rellenos: 'filled', rellenas: 'filled',
  blanco: 'empty', blanca: 'empty', blancos: 'empty', blancas: 'empty',
  vacío: 'empty', vacía: 'empty', vacíos: 'empty', vacías: 'empty',
  contorno: 'empty', transparente: 'empty', transparentes: 'empty',
  gris: 'grey', grises: 'grey', sombreado: 'grey', sombreada: 'grey',
  rayado: 'hatched', rayada: 'hatched', rayados: 'hatched', rayadas: 'hatched',
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
  // El banco español escribe el tamaño en palabras y, además, DETRÁS del
  // símbolo ("▬ grande") donde el inglés lo pone delante ("large ▬"). Sin las
  // dos cosas la misma figura salía grande en un idioma y normal en el otro,
  // en preguntas cuya regla es justamente el tamaño.
  grande: 'large',
  grandes: 'large',
  mayor: 'large',
  enorme: 'extra-large',
  mediano: 'medium',
  mediana: 'medium',
  pequeño: 'small',
  pequeña: 'small',
  pequeños: 'small',
  pequeñas: 'small',
  menor: 'small',
}

// Conectores gramaticales entre dos símbolos ("△(big) with ■(small)",
// "△(big) con ■(small)") sin ningún contenido visual propio.
const CONNECTOR_WORDS = new Set([
  'with', 'and', 'con', 'y',
  // "△-on-△" / "□-sobre-□": el guion une dos copias apiladas de la misma
  // figura, que ya se dibujan las dos. Sin esto el pie quedaba en "on- 6,
  // par" y tapaba el número de lados, que sí es la regla.
  'on', 'over', 'sobre', 'encima',
])

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
  // "sin sombrear" / "sin rellenar" = el equivalente español de "unshaded",
  // que sí es una palabra suelta y por eso no cabe en FILL_WORDS.
  if (/^sin\s+(sombrear|sombreado|rellenar|relleno)$/.test(clean)) return { fill: 'empty' }
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
  const half = parseHalfFillPart(clean)
  if (half) return half
  // "6-point", "4-point outline", "6 puntas"
  if (clean in POLYGON_SIDES) return { sides: POLYGON_SIDES[clean] }
  const points = clean.match(/^(\d+)[\s-]*(?:point|points|puntas?)$/)
  if (points) return { points: Number(points[1]) }
  // "5 lados", "4-sided", "8 sides"
  const sides = clean.match(/^(\d+)[\s-]*(?:sided|sides|side|lados?)$/)
  if (sides) return { sides: Number(sides[1]) }
  // "2 velas", "3 candles" — el recuento ES la regla de la pregunta.
  const tally = clean.match(/^(\d+)[\s-]*(?:candles?|velas?)$/)
  if (tally) return { extraTally: Number(tally[1]) }
  // "(arrow ↘)" — una pequeña flecha decorativa asociada al símbolo principal
  // (usada en el banco real para indicar dirección de movimiento del panel).
  // "arrow ↘" y también "arrow→" pegado, y su equivalente español.
  const arrowMatch = attr.trim().match(/^(?:arrow|flecha)\s*([→↗↑↖←↙↓↘])$/i)
  if (arrowMatch && arrowMatch[1] in COMPASS_MAP) {
    return { extraArrowDeg: COMPASS_MAP[arrowMatch[1]] }
  }
  return null
}

// Mapea la fracción en prosa ("whole"/"¾"/"half"/"¼"...) al ShapeKind que
// dibuja esa porción de círculo. Ver `parseCircleFractionBracket`.
const CIRCLE_FRACTION_SHAPES: Record<string, ShapeKind> = {
  whole: 'circle',
  entero: 'circle',
  'three-quarter': 'three-quarter-circle',
  'three-quarters': 'three-quarter-circle',
  '3/4': 'three-quarter-circle',
  '¾': 'three-quarter-circle',
  half: 'half-circle',
  medio: 'half-circle',
  media: 'half-circle',
  cuarto: 'quarter-circle',
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
  // La palabra "circle"/"círculo" es opcional: el banco escribe tanto
  // "[whole circle, hatched]" como "[¾ gris]", y sin la segunda forma dos
  // opciones que solo difieren en la fracción salían idénticas.
  const m = text
    .trim()
    .match(
      /^(whole|entero|three-quarters?|3\/4|¾|half|medio|media|1\/2|½|quarter|cuarto|1\/4|¼)(?![a-záéíóúñ])(?:[ \t]+(?:circle|círculo))?[ \t]*,?[ \t]*(.*)$/i,
    )
  if (!m) return null
  let shape = CIRCLE_FRACTION_SHAPES[m[1].toLowerCase()]
  if (!shape) return null
  let fill: FillKind = 'empty'
  const leftover: string[] = []
  const rest = m[2].replace(/\ball over\b/gi, '').replace(/\//g, ',')
  // Se parte también por espacios: el inglés escribe "half-circle shaded" (el
  // relleno pegado al sustantivo) y el español "medio círculo sombreado", y con
  // solo comas el relleno se leía en un idioma y no en el otro.
  for (const part of rest.split(/[,\s]+/)) {
    const clean = part.trim()
    if (!clean) continue
    if (/^quartered\b/i.test(clean)) {
      shape = 'circle-quartered'
      continue
    }
    const parsed = parseParenAttr(clean)
    if (parsed?.fill) {
      fill = parsed.fill
    } else if (/^(gris|grey)$/i.test(clean)) {
      fill = 'grey'
    } else if (/^(negro|negra|black)$/i.test(clean)) {
      fill = 'filled'
    } else if (/^(transparente|blanco|blanca|white|clear)$/i.test(clean)) {
      fill = 'empty'
    } else if (/^(rayad[oa]|hatched|striped)$/i.test(clean)) {
      fill = 'hatched'
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
    /\b(black|negras?|grey|gris(?:es)?|shaded|sombreadas?|clear|transparentes?|white|blancas?)\b/,
  )
  const halfSide = t.match(
    /^(one half|una mitad|left|izquierda|right|derecha|top|arriba|bottom|abajo|both|ambas)\b/,
  )
  if (halfSide && halfFill) {
    const word = halfFill[1]
    const fill: FillKind = /^(black|negras?)$/.test(word)
      ? 'filled'
      : /^(grey|gris(?:es)?|shaded|sombreadas?)$/.test(word)
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
function parseBracketSegment(
  seg: string,
  /** Figuras que ya han salido de segmentos anteriores del MISMO corchete.
   * "[◆ grande, mitad negra]" separa la figura y su sombreado con una coma:
   * si cada trozo se lee aislado, "mitad negra" no encuentra a qué figura
   * aplicarse y acaba de pie de texto — que es justo lo que distingue unas
   * opciones de otras. */
  carry: ShapeSpec[] = [],
): { shapes: ShapeSpec[]; leftover: string[]; row?: number } {
  let text = seg.trim()
  const shapes: ShapeSpec[] = []
  const leftover: string[] = []

  const rowLine = parseRowLine(text)
  if (rowLine) {
    if (rowLine !== 'none') shapes.push(pushRowLine(rowLine, carry))
    return { shapes, leftover }
  }
  // "[bola transparente, sin viruta]": el trozo dice que algo NO está. Leerlo
  // como una figura más dibujaría exactamente la viruta que el texto niega, y
  // dejaría "con viruta" y "sin viruta" idénticas — que es la diferencia entre
  // dos de las cinco opciones. La ausencia no esconde nada: se dibuja no
  // dibujando.
  //
  // Dos excepciones: "sin sombrear"/"sin rellenar" no niegan una figura sino
  // que describen su relleno, y una barra "/" puede separar la ausencia de
  // otra parte del panel que sí tiene figuras ("sin marcador negro / puntos:
  // ○●") — tirar el segmento entero se llevaría por delante esos círculos.
  if (/^(sin|no|without|0)[\s-]/i.test(text) && !/^(sin|no|without)\s+(sombrear|rellenar|shading|filling)/i.test(text)) {
    const slash = text.indexOf('/')
    const rest = slash === -1 ? '' : text.slice(slash + 1)
    if (![...rest].some((c) => c in SHAPE_MAP || c in TRIANGLE_MAP)) return { shapes, leftover }
    text = rest.trim()
  }

  let segPosition: Position | undefined
  let segRow: number | undefined
  /** Tamaño anunciado por una etiqueta ("pequeñas: ◇ ◆ ○"): a diferencia del
   * tamaño suelto, se aplica a TODAS las figuras que vengan detrás, no solo a
   * la primera. */
  let labelSize: SizeKind | undefined
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
      } else if (word in SIZE_WORDS) {
        // "pequeñas: ◇(top) ◆(BL) ○(BR)" — la etiqueta describe el tamaño del
        // grupo. No marca `labelled`: no es una posición, así que no debe
        // habilitar los nombres de figura en prosa.
        labelSize = SIZE_WORDS[word]
        text = label[2]
      }
    }
  }

  // Un tamaño escrito ANTES del símbolo ("large ▬") describe al que viene;
  // escrito DETRÁS ("▬ grande") describe al que acaba de salir. El inglés usa
  // lo primero y el español lo segundo, así que hacen falta los dos o la misma
  // figura sale de un tamaño en cada idioma.
  let pendingSize: SizeKind | undefined
  // El relleno también va delante del sustantivo en inglés ("grey cell") y
  // detrás en español ("celda gris"): se guarda hasta que haya figura.
  let pendingAttr: ParenAttr | undefined
  /** Última figura a la que puede referirse un atributo suelto del segmento. */
  const target = (): ShapeSpec | undefined => shapes[shapes.length - 1] ?? carry[carry.length - 1]
  const applyPhrase = (phrase: string, beforeGlyph = false) => {
    leftover.push(
      ...consumePhrase(phrase, {
        size: (size) => {
          const last = target()
          if (beforeGlyph || !last) pendingSize = size
          else last.size = size
          return true
        },
        position: (p) => {
          // Una posición suelta coloca la última figura vista. Si todavía no
          // hay ninguna, NO se guarda para la siguiente: en prosa suelta esa
          // palabra suele describir otra cosa ("black diamond centre",
          // "4 círculos arriba + 4 abajo") y acabaría colocando una figura que
          // no le corresponde — y de forma distinta en inglés y en español.
          // Para eso está la etiqueta explícita "algo:" del principio.
          const last = target()
          if (!last) return false
          last.position = p
          return true
        },
        // Un nombre de figura en palabras solo cuenta como figura si el
        // segmento venía etiquetado con una posición ("[TR: square]"). En
        // prosa suelta no: "half-circle shaded" y "medio círculo sombreado"
        // no contienen los mismos sustantivos, así que reconocerlos ahí
        // haría que el inglés y el español dibujaran cosas distintas.
        // Un nombre GEOMÉTRICO solo cuenta como figura si el segmento venía
        // etiquetado ("[TR: square]"): en prosa suelta, "half-circle shaded" y
        // "medio círculo sombreado" no llevan los mismos sustantivos y cada
        // idioma acabaría dibujando una cosa. Los nombres de OBJETO sí valen
        // siempre: no aparecen como adjetivo en la prosa.
        shapeName: (s) => {
          shapes.push({ shape: s, fill: 'empty', rotationDeg: 0, size: takeSize() })
          takePending()
          return true
        },
        allowGeometricNames: labelled,
        attr: (a) => {
          const last = target()
          if (!last) {
            // El atributo llega ANTES de la figura ("grey cell"): se guarda
            // para la siguiente. En español va detrás ("celda gris") y sin
            // esto la misma celda salía gris en un idioma y vacía en el otro.
            pendingAttr = { ...(pendingAttr ?? {}), ...a }
            return true
          }
          applyAttrTo(last, a)
          return true
        },
      }),
    )
  }

  const takeSize = (): SizeKind => {
    const size = pendingSize ?? labelSize ?? 'medium'
    pendingSize = undefined
    return size
  }
  /** Vuelca sobre la figura recién creada lo anunciado antes de ella. */
  const takePending = () => {
    if (!pendingAttr) return
    applyAttrTo(shapes[shapes.length - 1], pendingAttr)
    pendingAttr = undefined
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
        const inner = chars.slice(i + 1, end).join('')
        const glued = i > 0 && (chars[i - 1] in TRIANGLE_MAP || chars[i - 1] in SHAPE_MAP)
        // Igual que a nivel superior: un paréntesis que NO va pegado a un
        // símbolo y contiene otro símbolo describe una figura más del panel
        // ("[▲(filled) — (⬡ empty en círculo) — ■(filled)]"), no una glosa de
        // la anterior. Sin esto el enunciado dibujaba dos figuras y las
        // opciones tres, para la misma notación.
        if (!glued && [...inner].some((c) => c in TRIANGLE_MAP || c in SHAPE_MAP)) {
          const nested = parseBracketSegment(inner, shapes)
          if (nested.shapes.length > 0) {
            shapes.push(...nested.shapes)
            leftover.push(...nested.leftover)
            i = end
            continue
          }
        }
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
                applyAttrTo(shapes[shapes.length - 1], a)
                return true
              },
            }),
          )
        }
        i = end
        continue
      }
    }
    const notched = readNotchedCircle(chars, i)
    if (notched) {
      applyPhrase(run, true)
      run = ''
      shapes.push({ ...notched.spec, size: takeSize() })
      takePending()
      i = notched.next - 1
      continue
    }
    if (ch in TRIANGLE_MAP) {
      applyPhrase(run, true)
      run = ''
      const t = TRIANGLE_MAP[ch]
      shapes.push({ shape: 'triangle', fill: t.fill, rotationDeg: t.rotationDeg, size: takeSize() })
      takePending()
      continue
    }
    if (ch in SHAPE_MAP) {
      applyPhrase(run, true)
      run = ''
      const s = SHAPE_MAP[ch]
      shapes.push({ shape: s.shape, fill: s.fill, rotationDeg: 0, size: takeSize() })
      takePending()
      continue
    }
    // Una flecha dentro del corchete pertenece a SU segmento ("[upper: ●↑]"):
    // si se saca antes de repartir las filas acaba flotando fuera de la fila
    // del círculo al que acompaña.
    if (ch in COMPASS_MAP) {
      applyPhrase(run, true)
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
  // Con split(',') a secas, "▲(medio relleno) + ■(medio relleno, división
  // diagonal)" se partía POR DENTRO del paréntesis y sus dos mitades dejaban
  // de entenderse. `tokenize` respeta paréntesis y corchetes.
  for (const seg of tokenize(inner, (ch) => ch === ',' || ch === ';')) {
    const r = parseBracketSegment(seg, shapes)
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
  // Ver `parseBracketSegment`: el tamaño va delante del símbolo en inglés
  // ("large ■ + small △") y detrás en español ("■ grande + △ pequeña").
  let pendingSize: SizeKind | undefined
  const flushRun = (beforeGlyph = false) => {
    const raw = unrecognizedRun.trim()
    unrecognizedRun = ''
    if (!raw) return
    // Conectores puramente gramaticales entre dos símbolos ("△ with □",
    // "△ con □") no aportan ninguna descripción visual — mostrarlos como
    // caption es solo ruido bajo el icono, no información.
    if (CONNECTOR_WORDS.has(raw.toLowerCase().replace(/^[-–—\s]+|[-–—\s]+$/g, ''))) return
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
    const rowLine = parseRowLine(raw)
    if (rowLine) {
      if (rowLine !== 'none') shapes.push(pushRowLine(rowLine, shapes))
      attributedUpTo = shapes.length
      return
    }
    const rest = consumePhrase(raw, {
      size: (size) => {
        if (beforeGlyph || shapes.length === 0) pendingSize = size
        else shapes[shapes.length - 1].size = size
        return true
      },
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
  const takeSize = (): SizeKind => {
    const size = pendingSize ?? 'medium'
    pendingSize = undefined
    return size
  }
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
    // "⬟(filled) — (⬠ empty en círculo) — ⬡(filled)": el paréntesis suelto no
    // glosa a nadie, describe una figura más del panel. Sin esto la opción
    // dibujaba dos figuras donde el texto describe tres.
    if (!attached && [...inner].some((ch) => ch in SHAPE_MAP || ch in TRIANGLE_MAP)) {
      const nested = parseBracketShapes(inner)
      if (nested) {
        shapes.push(...nested.shapes)
        if (nested.leftover.length > 0) captions.push(nested.leftover.join(' '))
        attributedUpTo = shapes.length
        return
      }
    }
    const rangeStart = attached ? shapes.length - 1 : attributedUpTo
    const targets = shapes.slice(Math.max(rangeStart, 0))
    const leftover: string[] = []
    for (const part of inner.split(',')) {
      if (!part.trim()) continue
      const parsed = parseParenAttr(part)
      if (!parsed) {
        // "⬡(hexágono filled)": el paréntesis repite el nombre de la figura y
        // añade el relleno. Leído entero no es ningún atributo, así que se
        // recorre palabra a palabra — si no, el relleno se perdía Y el pie lo
        // descartaba por redundante, y dos opciones distintas ("hexágono
        // filled" / "hexágono empty") se dibujaban idénticas.
        //
        // Se exige entenderlo ENTERO: entender media frase es como se pierde
        // la información sin que se note. "(bottom-left quarter)" y "(cuarto
        // inferior izquierdo)" describen lo mismo, pero palabra a palabra el
        // inglés reconoce "bottom-left" y el español solo "inferior" — cada
        // idioma dibujaría la figura en una celda distinta. Si sobra alguna
        // palabra, el paréntesis entero se queda como pie de texto.
        const applied: (() => void)[] = []
        const rest = consumePhrase(part, {
          position: (pos) => {
            if (targets.length === 0) return false
            applied.push(() => { for (const target of targets) target.position = pos })
            return true
          },
          attr: (a) => {
            if (targets.length === 0) return false
            applied.push(() => { for (const target of targets) applyAttrTo(target, a) })
            return true
          },
          // Un nombre de figura dentro del paréntesis solo se acepta cuando
          // repite la figura que ya hay ("⬡(hexágono filled)"). Si nombra otra
          // distinta, el paréntesis está describiendo algo que no sabemos
          // dibujar y no debe aplicarse a medias.
          shapeName: (kind) => targets.length > 0 && targets.every((t) => t.shape === kind),
          allowGeometricNames: true,
        })
        if (rest.length === 0) for (const apply of applied) apply()
        else leftover.push(part.trim())
        continue
      }
      if (parsed.extraArrowDeg != null) {
        shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: parsed.extraArrowDeg, size: 'small' })
      }
      if (parsed.extraTally != null) {
        shapes.push({ shape: 'tally', fill: 'filled', rotationDeg: 0, size: 'small', sides: parsed.extraTally })
      }
      if (targets.length > 0) {
        for (const target of targets) applyAttrTo(target, parsed)
      } else if (parsed.extraArrowDeg == null && parsed.extraTally == null) {
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
    const scenery = parseSceneryBracket(text)
    if (scenery) {
      shapes.push(scenery)
      attributedUpTo = shapes.length
      return
    }
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
      // "[sin estrella]", "[no triangle]", "[0 orejas]": el corchete dice que
      // algo NO está. No esconde ninguna figura, así que el panel no es un
      // fragmento — al contrario, la ausencia es la información.
      if (/^(sin|no|without|0)[\s-]/i.test(text.trim())) {
        attributedUpTo = shapes.length
        return
      }
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
      // "●(grey)(mid-left)": dos paréntesis seguidos describen la MISMA figura.
      // Sin esto el segundo se trataba como suelto y su posición acababa de
      // pie de texto en vez de colocar el círculo.
      const attached =
        prevCh in TRIANGLE_MAP || prevCh in SHAPE_MAP || prevCh in COMPASS_MAP || prevCh === ')'
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
    const notched = readNotchedCircle(chars, i)
    if (notched) {
      flushRun(true)
      shapes.push({ ...notched.spec, size: takeSize() })
      takePendingPosition()
      i = notched.next
      continue
    }
    if (ch in TRIANGLE_MAP) {
      flushRun(true)
      const t = TRIANGLE_MAP[ch]
      shapes.push({ shape: 'triangle', fill: t.fill, rotationDeg: t.rotationDeg, size: takeSize() })
      takePendingPosition()
    } else if (ch in SHAPE_MAP) {
      flushRun(true)
      const s = SHAPE_MAP[ch]
      shapes.push({ shape: s.shape, fill: s.fill, rotationDeg: 0, size: takeSize() })
      takePendingPosition()
    } else if (ch in COMPASS_MAP) {
      // "arrow ↑" / "flecha ↑": la palabra solo nombra el glifo que viene
      // detrás, no es descripción suelta que deba acabar en el pie de texto.
      unrecognizedRun = unrecognizedRun.replace(/\b(arrows?|flechas?)\s*$/i, '')
      flushRun(true)
      shapes.push({ shape: 'arrow', fill: 'filled', rotationDeg: COMPASS_MAP[ch], size: takeSize() })
      takePendingPosition()
    } else {
      // carácter no reconocido (letra, dígito, puntuación residual…): a caption
      unrecognizedRun += ch
    }
    i++
  }
  flushRun()

  // Una figura sin fila se dibuja en la última banda: con la línea de
  // escenario en juego eso dejaba "línea debajo" pintada ARRIBA de las
  // figuras. Fijar la fila 0 del resto es lo que hace que "encima" y
  // "debajo" signifiquen lo que dicen.
  if (shapes.some((s) => s.row === ROW_LINE_ABOVE || s.row === ROW_LINE_BELOW)) {
    for (const shape of shapes) if (shape.row == null) shape.row = 0
  }

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

/** Proporción mínima de paneles COMPLETOS (con figuras y sin descripción
 * suelta) para que merezca la pena dibujar el grupo. Ver `panelsDrawable`. */
const MIN_COMPLETE_RATIO = 0.7

/** ¿Se puede dibujar TODO este grupo de paneles con fidelidad? Un panel vale
 * si es la incógnita ("?") o si tiene figuras y no es un fragmento
 * (`partial`). Se pregunta por el grupo entero, no panel a panel, porque la
 * comparación es lo único que se le pide al alumno: una secuencia (o una
 * lista de opciones) mitad iconos mitad párrafos no se puede comparar, y las
 * que se quedan en texto suelen ser justo las que llevan la diferencia. */
export function panelsDrawable(panels: FigurePanel[]): boolean {
  const real = panels.filter((p) => !p.isBlank)
  if (real.length === 0) return false
  // Nada de párrafos sueltos entre iconos: un panel sin ninguna figura al lado
  // de otros dibujados no se puede comparar con ellos.
  if (real.some((p) => p.shapes.length === 0)) return false
  // Un panel PARCIAL (dibuja algo y deja descripción fuera) se tolera mientras
  // sea la excepción: si casi todos lo son, la notación no está sosteniendo la
  // figura y lo honesto es enseñar el texto. Pero si solo una opción de cinco
  // lo es —"[puntero deformado] + ○"—, mandar la pregunta entera a texto deja
  // al alumno leyendo notación cruda, que es peor que verla dibujada: las
  // otras cuatro sí eran figuras completas.
  const complete = real.filter((p) => !p.partial).length
  return complete / real.length >= MIN_COMPLETE_RATIO
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
  // Glosas del propio símbolo que el banco escribe al lado ("▬(grey rotated
  // rectangle)", "⊙(hatched circle)") y adjetivos de estado que el icono ya
  // enseña. Quitarlos no puede ocultar la respuesta: dos opciones que se
  // dibujen igual siguen mandando la pregunta a texto por la comprobación de
  // colisión, que mira las figuras y no el pie.
  'rect', 'rectangle', 'semicircle', 'semicírculo', 'oval', 'dot', 'punto',
  'rotated', 'unrotated', 'girado', 'girada', 'sin', 'no', 'still', 'quieto', 'quieta',
  'dark', 'oscuro', 'oscura', 'light', 'claro', 'clara', 'plain', 'simple',
  'inner', 'outer', 'interior', 'exterior', 'corners', 'esquinas', 'corner', 'esquina',
  'mixed', 'mezclado', 'mezclados', 'side', 'lado', 'the', 'of', 'de', 'del', 'la', 'el',
  'all', 'todas', 'todos', 'sola', 'solo', 'solas', 'solos', 'alone', 'single',
  'rectángulo', 'rectángulos', 'hex', 'en', 'con', 'unshaded', 'shaded', 'sombreada',
  'hacia', 'towards', 'toward', 'muy', 'very', 'just', 'justo',
  'apilado', 'apilados', 'apiladas', 'stacked', 'sobre', 'on', 'over', 'bajo', 'under',
  'manecilla', 'manecillas', 'hand', 'hands',
  // "puntos (ninguno)" / "dots (none)": el panel dice que NO hay puntos, y el
  // dibujo ya lo enseña no dibujando ninguno. Sin esto el pie de la opción
  // quedaba en "arriba brazos cara puntos ninguno" — palabras sueltas sin
  // estructura, que es peor que no poner pie.
  'ninguno', 'ninguna', 'none', 'nada', 'ni',
  'pequeñas', 'pequeños', 'grandes',
  // Numerales y artículos sueltos que quedan al consumir "(una sola)" o
  // "(one only)". El número que sí importa se dibuja como tantas figuras.
  'una', 'uno', 'un', 'one', 'a',
  // Glosa de la orientación de un hexágono ("⬢(pointed)"): el icono ya lo
  // dibuja con vértice arriba, así que el pie solo decía "pointed sobre".
  'pointed', 'puntiagudo', 'puntiaguda', 'flat', 'plano', 'plana',
  // "[whole circle, grey, quartered by cross-lines]": el icono ya dibuja el
  // círculo partido en cuatro, así que el pie solo decía "by, cross-lines".
  'by', 'por', 'cross', 'lines', 'líneas', 'cruzadas', 'quartered', 'cuarteado',
  // "(esquinas pentagonales)": las esquinas ya se dibujan, y con esa figura.
  'pentagonales', 'pentagonal', 'hexagonales', 'hexagonal', 'triangulares',
  'triangular', 'cuadradas', 'cuadradas', 'circulares', 'circular',
  'brazos', 'brazo', 'arms', 'arm', 'cara', 'caras', 'face', 'faces',
])

/** Quita el pie de figura cuando no dice nada que el icono no enseñe ya. */
function cleanCaption(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  // Restos de puntuación que quedan al consumir las palabras de alrededor
  // ("+ solapado ■ +", "— ○ —"): no dicen nada y ensucian el pie.
  const caption = raw
    .replace(/\s*[+·—:;,-]\s*$/g, '')
    .replace(/^\s*[+·—-]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!caption) return undefined
  // Un pie que todavía lleva un símbolo de figura NO es redundante: ese
  // símbolo es una figura del panel que no hemos sabido dibujar, y tirarlo
  // deja la opción con menos figuras de las que describe.
  if ([...caption].some((ch) => ch in SHAPE_MAP || ch in TRIANGLE_MAP || ch in COMPASS_MAP)) return caption
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
// Glifos que muchos sistemas pintan como emoji de color (un recuadro azul en
// vez de una flecha fina) cuando aparecen como TEXTO. El selector de variación
// U+FE0E fuerza la presentación de texto, para que la notación se lea igual
// que el resto de la frase.
const TEXT_PRESENTATION = new Set([
  ...'→↗↑↖←↙↓↘⬅⬆⬇➡⇦⇧⇨⇩⇐⇒⇑⇓↔↕⚡☀☁❄☂✚✦✶✷☺☹⌛⏳',
  ...'▶◀▲▼◼◻◾◽⬛⬜⭐★☆♥♡✔✖✕⭕〰',
])

/** Prepara notación para mostrarla como texto plano sin que los símbolos se
 * conviertan en emoji de color. */
export function asPlainNotation(text: string): string {
  return [...text].map((ch) => (TEXT_PRESENTATION.has(ch) ? ch + '︎' : ch)).join('')
}

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
        `|${s.halfFill ? `${s.halfFill.fill}${s.halfFill.split}${s.halfFill.side}` : ''}|${s.points ?? ''}|${s.sides ?? ''}` +
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
