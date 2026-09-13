// Modelo de datos de la plataforma.
// Las colecciones de contenido (preguntas, teoría, referencias) se rellenarán
// en la fase de recopilación de datos; estos tipos definen su forma final.

export type PhaseId = 'reasoning' | 'field-mcq' | 'eufte' | 'test-day'

export type ReasoningSkill = 'verbal' | 'numerical' | 'abstract'

// Los ámbitos de las DOS convocatorias que cubre la plataforma. Cada uno
// pertenece a una sola de ellas (ver src/data/competition.ts): la AD7 convoca
// cuatro perfiles TIC y la AD8, inteligencia artificial y ciberseguridad.
export type Field =
  | 'ict-infrastructure'
  | 'ict-project-management'
  | 'clouds-networks'
  | 'data-science'
  | 'artificial-intelligence'
  | 'cybersecurity'

export interface LocalizedText {
  es: string
  en: string
}

export interface QuestionOption {
  id: string // 'A' | 'B' | 'C' | 'D'...
  text: LocalizedText
  isCorrect: boolean
  explanation?: LocalizedText
  /** SVG de la opción tal como lo renderiza el motor de figuras abstractas.
   * Si está, la opción ES la figura y `text` es sólo su rótulo ('Figura A'). */
  figure?: string
}

/** Tablero de un ejercicio del motor: filas de SVG, con `null` en la casilla
 * que hay que adivinar. `rows` va vacío cuando no hay tablero —buscar la
 * figura que sobra—, porque entonces la pregunta entera está en las opciones. */
export interface EngineBoard {
  /** Lado, en unidades del motor, con que se pintaron las figuras. Aquí no
   * hace falta para dimensionar: los SVG escalan con su viewBox y la casilla
   * del «?» usa la misma anchura CSS que ellos, así que casan igualmente. */
  cellSize: number
  rows: (string | null)[][]
}

/** De dónde sale un ejercicio generado: la familia, la semilla y el
 * `contentHash` que lo identifican. La prueba de que el fichero no se tocó a
 * mano la hace `are validate --deep` sobre el JSON commiteado, que conserva
 * además lo necesario para regenerarlo. */
export interface EngineProvenance {
  family: string
  seed: string
  difficulty: number
  contentHash: string
  engineVersion: string
  // `config` y `program` —lo que `are validate --deep` usa para regenerar el
  // ejercicio— se quedan en el JSON commiteado y no llegan aquí:
  // build_content.py los deja fuera porque el navegador no los usa y pesan
  // 6-10 KB por pregunta en algunas familias.
}

export interface Question {
  id: string
  phase: PhaseId
  skill?: ReasoningSkill
  field?: Field
  passage?: LocalizedText
  prompt: LocalizedText
  options: QuestionOption[]
  source?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
  /** Sólo en ejercicios del motor de figuras abstractas. */
  board?: EngineBoard
  /** El motor lo afirma cuando TODAS las opciones son figura. La interfaz no
   * decide por este indicador sino por la presencia de `figure`; sirve para
   * comprobar que las dos cosas cuadran. */
  figureOnly?: boolean
  provenance?: EngineProvenance
}

export interface TheoryDoc {
  id: string
  phase: PhaseId
  skill?: ReasoningSkill
  field?: Field
  title: LocalizedText
  summaryMd: LocalizedText
  sourceFile?: string
}

export interface EssayPrompt {
  id: string
  title: LocalizedText
  briefMd: LocalizedText
  sourceDocsMd?: LocalizedText[]
  recommendedMinutes: number
}

export interface ReferenceLink {
  id: string
  title: string
  url: string
  category: string
  notes?: string
  dateAdded: string
  /** Convocatoria a la que pertenece este enlace, si solo vale para una. Sin
   * este campo el enlace se muestra siempre (documentación de las pruebas,
   * material de preparación genérico). */
  competition?: 'ad7' | 'ad8'
}

export interface QuestionResult {
  questionId: string
  selectedOptionId: string | null
  correct: boolean
}

export interface TestAttempt {
  id: string
  phase: PhaseId
  skill?: ReasoningSkill
  field?: Field
  startedAt: string
  finishedAt?: string
  results: QuestionResult[]
  totalQuestions: number
  timeSpentSeconds: number
}

export interface EssayAttempt {
  id: string
  promptId: string
  startedAt: string
  finishedAt?: string
  text: string
  timeSpentSeconds: number
  selfReviewNotes?: string
}
