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
