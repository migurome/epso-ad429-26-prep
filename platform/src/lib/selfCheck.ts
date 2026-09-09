// Comprobaciones de integridad del contenido, escritas UNA vez y ejecutadas
// desde dos sitios:
//
//   - src/data/contentIntegrity.test.ts, en `npm run verify`, sobre el
//     repositorio; y
//   - src/pages/SelfCheckPage.tsx (/verificacion), dentro del navegador y
//     sobre la web ya publicada.
//
// Viven aquí y no en el archivo de test para que las dos vías no se separen:
// una comprobación que sólo existe en el test no dice nada del sitio
// desplegado, y una que sólo existe en la página no frena un commit malo.
//
// Todo lo de este módulo es puro y sirve en el navegador: nada de node:fs,
// nada de leer el disco. Lo que hace falta comprobar contra archivos reales
// —que los .webp existan y se descarguen— lo hacen la etapa `dist` de
// scripts/verify.mjs y la propia página, cada una con lo que tiene a mano.
import type { EssayPrompt, Field, LocalizedText, Question, TheoryDoc } from '../types/content'
import { COMPETITIONS, COMPETITION_ORDER, FIELD_MCQ_FORMAT } from '../data/competition'
import { SCANNED_FIGURES } from '../data/scannedFigures.generated'
import {
  COURSE_FIELDS,
  loadCourseContent,
  loadEufteContent,
  loadFieldContent,
  loadReasoningContent,
  loadTestDayContent,
} from '../data/contentLoader'

export interface Bundle {
  QUESTIONS: Question[]
  THEORY_DOCS: TheoryDoc[]
  ESSAY_PROMPTS: EssayPrompt[]
}

/** Un problema concreto, con el sitio exacto donde está. */
export interface Issue {
  where: string
  problem: LocalizedText
}

/** El resultado de una comprobación: sin incidencias, ha pasado. */
export interface Check {
  id: string
  label: LocalizedText
  issues: Issue[]
  /** Resumen de lo comprobado, para enseñar algo cuando todo va bien. */
  detail?: LocalizedText
}

export interface ContentTarget {
  id: string
  label: LocalizedText
  load: () => Promise<Bundle>
  phase: 'reasoning' | 'field-mcq'
  skill?: 'verbal' | 'numerical' | 'abstract'
  field?: Field
  /** Ámbito convocado sin banco propio todavía: sólo alcance oficial. */
  bankPending?: boolean
}

const REASONING_LABELS = {
  verbal: { es: 'Razonamiento verbal', en: 'Verbal reasoning' },
  numerical: { es: 'Razonamiento numérico', en: 'Numerical reasoning' },
  abstract: { es: 'Razonamiento abstracto', en: 'Abstract reasoning' },
} as const

export const ALL_FIELDS = COMPETITION_ORDER.flatMap((key) => COMPETITIONS[key].fields)

export const CONTENT_TARGETS: ContentTarget[] = [
  ...(['verbal', 'numerical', 'abstract'] as const).map(
    (skill): ContentTarget => ({
      id: `reasoning:${skill}`,
      label: REASONING_LABELS[skill],
      load: () => loadReasoningContent(skill) as Promise<Bundle>,
      phase: 'reasoning',
      skill,
    }),
  ),
  ...ALL_FIELDS.map(
    (f): ContentTarget => ({
      id: `field:${f.id}`,
      label: f.label,
      load: () => loadFieldContent(f.id) as Promise<Bundle>,
      phase: 'field-mcq',
      field: f.id,
      bankPending: f.bankPending,
    }),
  ),
  // El curso de fundamentos: material de estudio con su propio banco. Pasa las
  // mismas invariantes que el resto — traducción completa, una sola respuesta
  // correcta, reparto de letras, explicaciones — porque se usa igual.
  ...COURSE_FIELDS.map(
    (field): ContentTarget => ({
      id: `course:${field}`,
      label: { es: 'Curso de fundamentos', en: 'Foundations course' },
      load: () => loadCourseContent(field) as Promise<Bundle>,
      phase: 'field-mcq',
      field,
    }),
  ),
]

const LOCALES = ['es', 'en'] as const

function localizedIssues(value: LocalizedText | undefined, where: string): Issue[] {
  if (!value) {
    return [{ where, problem: { es: 'falta el texto', en: 'text missing' } }]
  }
  return LOCALES.filter((l) => !value[l] || !value[l].trim()).map((l) => ({
    where,
    problem: { es: `vacío en '${l}'`, en: `empty in '${l}'` },
  }))
}

function issue(where: string, es: string, en: string): Issue {
  return { where, problem: { es, en } }
}

function questionIssues(q: Question, target: ContentTarget): Issue[] {
  const at = `${target.id} / ${q.id}`
  const issues: Issue[] = []

  if (q.phase !== target.phase) {
    issues.push(issue(at, `fase '${q.phase}' ≠ '${target.phase}'`, `phase '${q.phase}' ≠ '${target.phase}'`))
  }
  if (target.skill && q.skill !== target.skill) {
    issues.push(issue(at, `destreza '${q.skill}'`, `skill '${q.skill}'`))
  }
  if (target.field && q.field !== target.field) {
    issues.push(issue(at, `ámbito '${q.field}'`, `field '${q.field}'`))
  }

  issues.push(...localizedIssues(q.prompt, `${at} · enunciado`))
  if (q.passage) issues.push(...localizedIssues(q.passage, `${at} · texto base`))

  if (q.options.length < 2 || q.options.length > 5) {
    issues.push(
      issue(at, `${q.options.length} opciones (se esperan 2–5)`, `${q.options.length} options (2–5 expected)`),
    )
  }

  const ids = q.options.map((o) => o.id)
  if (new Set(ids).size !== ids.length) {
    issues.push(issue(at, `ids de opción repetidos [${ids}]`, `duplicate option ids [${ids}]`))
  }
  for (const id of ids) {
    if (!/^[A-E]$/.test(id)) {
      issues.push(issue(at, `id de opción no válido '${id}'`, `invalid option id '${id}'`))
    }
  }

  const correct = q.options.filter((o) => o.isCorrect)
  if (correct.length !== 1) {
    issues.push(
      issue(at, `${correct.length} opciones correctas (se espera 1)`, `${correct.length} correct options (1 expected)`),
    )
  }

  for (const o of q.options) {
    issues.push(...localizedIssues(o.text, `${at} · opción ${o.id}`))
    // La explicación es opcional; si está, tiene que estar en los dos idiomas.
    if (o.explanation) issues.push(...localizedIssues(o.explanation, `${at} · explicación ${o.id}`))
  }

  return issues
}

/** Forma de las preguntas, la teoría y sus traducciones. */
export function checkWellFormed(target: ContentTarget, mod: Bundle): Check {
  const issues: Issue[] = []

  const seen = new Set<string>()
  for (const q of mod.QUESTIONS) {
    if (seen.has(q.id)) {
      issues.push(issue(target.id, `id de pregunta repetido '${q.id}'`, `duplicate question id '${q.id}'`))
    }
    seen.add(q.id)
    issues.push(...questionIssues(q, target))
  }

  for (const doc of mod.THEORY_DOCS) {
    const at = `${target.id} / teoría ${doc.id}`
    if (!doc.id) issues.push(issue(at, 'sin id', 'no id'))
    issues.push(...localizedIssues(doc.title, `${at} · título`))
    issues.push(...localizedIssues(doc.summaryMd, `${at} · cuerpo`))
  }

  return {
    id: `${target.id}:well-formed`,
    label: { es: 'Preguntas, teoría y traducciones', en: 'Questions, theory and translations' },
    issues,
    detail: {
      es: `${mod.QUESTIONS.length} preguntas y ${mod.THEORY_DOCS.length} documento(s) de teoría, completos en ES y EN`,
      en: `${mod.QUESTIONS.length} questions and ${mod.THEORY_DOCS.length} theory doc(s), complete in ES and EN`,
    },
  }
}

/** Hay material suficiente para estudiar y para montar un simulacro. */
export function checkVolume(target: ContentTarget, mod: Bundle): Check {
  const issues: Issue[] = []
  const minimum = target.phase === 'field-mcq' ? FIELD_MCQ_FORMAT.questions : 10

  if (!mod.THEORY_DOCS.length) {
    issues.push(issue(target.id, 'sin documento de teoría', 'no theory document'))
  }

  if (target.bankPending) {
    if (mod.QUESTIONS.length) {
      issues.push(
        issue(target.id, 'marcado como pendiente pero trae banco', 'marked pending but ships a bank'),
      )
    }
    return {
      id: `${target.id}:volume`,
      label: { es: 'Volumen de material', en: 'Amount of material' },
      issues,
      detail: {
        es: 'Ámbito sin banco todavía: publica su alcance oficial (anexo II)',
        en: 'Field without a bank yet: publishes its official scope (Annex II)',
      },
    }
  }

  if (mod.QUESTIONS.length < minimum) {
    issues.push(
      issue(
        target.id,
        `${mod.QUESTIONS.length} preguntas, no llegan a las ${minimum} de un simulacro`,
        `${mod.QUESTIONS.length} questions, short of the ${minimum} needed for a mock`,
      ),
    )
  }

  return {
    id: `${target.id}:volume`,
    label: { es: 'Volumen de material', en: 'Amount of material' },
    issues,
    detail: {
      es: `${mod.QUESTIONS.length} preguntas (mínimo ${minimum})`,
      en: `${mod.QUESTIONS.length} questions (minimum ${minimum})`,
    },
  }
}

/** La letra correcta no puede concentrarse: un banco así se aprueba marcando
 * siempre la misma opción. El umbral es holgado a propósito — el fallo real
 * que motivó esta comprobación (commit 4414216) llegó al 96 %. */
export const LETTER_SHARE_LIMIT = 0.45

export function checkAnswerSpread(target: ContentTarget, mod: Bundle): Check {
  const issues: Issue[] = []
  const tally = new Map<string, number>()
  for (const q of mod.QUESTIONS) {
    const correct = q.options.find((o) => o.isCorrect)
    if (correct) tally.set(correct.id, (tally.get(correct.id) ?? 0) + 1)
  }

  const total = mod.QUESTIONS.length
  const summary = [...tally.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, n]) => `${letter}=${n}`)
    .join(' ')

  if (total) {
    for (const [letter, n] of tally) {
      if (n / total >= LETTER_SHARE_LIMIT) {
        issues.push(
          issue(
            target.id,
            `la letra ${letter} es la correcta en ${n} de ${total} (${summary})`,
            `letter ${letter} is correct in ${n} of ${total} (${summary})`,
          ),
        )
      }
    }
    const offered = new Set(mod.QUESTIONS.flatMap((q) => q.options.map((o) => o.id)))
    for (const letter of offered) {
      if (!tally.get(letter)) {
        issues.push(
          issue(target.id, `la letra ${letter} nunca es correcta`, `letter ${letter} is never correct`),
        )
      }
    }
  }

  return {
    id: `${target.id}:spread`,
    label: { es: 'Reparto de la respuesta correcta', en: 'Spread of the correct answer' },
    issues,
    detail: { es: summary || '—', en: summary || '—' },
  }
}

/** Los bancos de ámbito están explicados al 100 %; los de razonamiento
 * arrastran preguntas oficiales de EPSO publicadas sin solución. */
export function checkExplanations(target: ContentTarget, mod: Bundle): Check {
  const floor = target.phase === 'field-mcq' ? 1 : 0.85
  const withExplanation = mod.QUESTIONS.filter((q) =>
    q.options.some((o) => o.isCorrect && o.explanation?.es && o.explanation?.en),
  ).length
  const total = mod.QUESTIONS.length
  const ratio = total ? withExplanation / total : 1
  const percent = Math.round(ratio * 100)

  const issues =
    ratio < floor
      ? [
          issue(
            target.id,
            `sólo ${withExplanation} de ${total} preguntas explicadas (mínimo ${Math.round(floor * 100)} %)`,
            `only ${withExplanation} of ${total} questions explained (minimum ${Math.round(floor * 100)}%)`,
          ),
        ]
      : []

  return {
    id: `${target.id}:explanations`,
    label: { es: 'Respuestas correctas explicadas', en: 'Correct answers explained' },
    issues,
    detail: {
      es: total ? `${withExplanation}/${total} (${percent} %)` : '—',
      en: total ? `${withExplanation}/${total} (${percent}%)` : '—',
    },
  }
}

/** Todas las comprobaciones de un bloque de contenido. */
export async function checkTarget(target: ContentTarget): Promise<Check[]> {
  const mod = await target.load()
  return [
    checkWellFormed(target, mod),
    checkVolume(target, mod),
    checkAnswerSpread(target, mod),
    checkExplanations(target, mod),
  ]
}

/** Ningún identificador de pregunta puede repetirse entre bloques: el
 * progreso guardado se indexa por id, y un choque mezclaría dos historiales. */
export async function checkUniqueIds(): Promise<Check> {
  const owners = new Map<string, string>()
  const issues: Issue[] = []
  let total = 0
  for (const target of CONTENT_TARGETS) {
    const mod = await target.load()
    for (const q of mod.QUESTIONS) {
      total += 1
      const previous = owners.get(q.id)
      if (previous) {
        issues.push(issue(q.id, `también existe en ${previous}`, `also present in ${previous}`))
      } else {
        owners.set(q.id, target.id)
      }
    }
  }
  return {
    id: 'global:unique-ids',
    label: { es: 'Identificadores únicos en toda la plataforma', en: 'Question ids unique platform-wide' },
    issues,
    detail: { es: `${total} preguntas, ${owners.size} ids`, en: `${total} questions, ${owners.size} ids` },
  }
}

export async function checkEufte(): Promise<Check> {
  const mod = (await loadEufteContent()) as Bundle
  const issues: Issue[] = []
  if (!mod.ESSAY_PROMPTS.length) {
    issues.push(issue('eufte', 'sin enunciados de redacción', 'no essay prompts'))
  }
  const seen = new Set<string>()
  for (const p of mod.ESSAY_PROMPTS) {
    const at = `eufte / ${p.id}`
    if (seen.has(p.id)) issues.push(issue(at, 'id repetido', 'duplicate id'))
    seen.add(p.id)
    issues.push(...localizedIssues(p.title, `${at} · título`))
    issues.push(...localizedIssues(p.briefMd, `${at} · enunciado`))
    for (const [i, doc] of (p.sourceDocsMd ?? []).entries()) {
      issues.push(...localizedIssues(doc, `${at} · documento ${i + 1}`))
    }
    if (!(p.recommendedMinutes > 0)) {
      issues.push(issue(at, 'minutos recomendados no válidos', 'invalid recommended minutes'))
    }
  }
  return {
    id: 'eufte',
    label: { es: 'EUFTE — enunciados de redacción', en: 'EUFTE — essay prompts' },
    issues,
    detail: {
      es: `${mod.ESSAY_PROMPTS.length} enunciados completos en ES y EN`,
      en: `${mod.ESSAY_PROMPTS.length} prompts complete in ES and EN`,
    },
  }
}

export async function checkTestDay(): Promise<Check> {
  const mod = (await loadTestDayContent()) as Bundle
  const issues: Issue[] = []
  if (!mod.THEORY_DOCS.length) issues.push(issue('test-day', 'sin teoría', 'no theory'))
  for (const d of mod.THEORY_DOCS) {
    issues.push(...localizedIssues(d.title, `test-day / ${d.id} · título`))
    issues.push(...localizedIssues(d.summaryMd, `test-day / ${d.id} · cuerpo`))
  }
  return {
    id: 'test-day',
    label: { es: 'Guía del día del examen', en: 'Test-day guide' },
    issues,
    detail: {
      es: `${mod.THEORY_DOCS.length} documento(s)`,
      en: `${mod.THEORY_DOCS.length} document(s)`,
    },
  }
}

/** Coherencia de datos de las figuras: que exista el archivo se comprueba
 * aparte (etapa `dist`, y la propia página descargándolas). */
export async function checkFigureCoverage(): Promise<Check> {
  const mod = (await loadReasoningContent('abstract')) as Bundle
  const real = mod.QUESTIONS.filter((q) => q.tags?.includes('real'))
  const issues: Issue[] = []
  if (!real.length) {
    issues.push(issue('abstract', "sin preguntas marcadas como 'real'", "no questions tagged 'real'"))
  }
  for (const q of real) {
    if (!SCANNED_FIGURES.has(q.id)) {
      issues.push(issue(q.id, 'del banco real y sin figura anunciada', 'from the real bank with no figure declared'))
    }
  }
  return {
    id: 'figures:coverage',
    label: { es: 'Cada pregunta del banco real declara su figura', en: 'Every real-bank question declares its figure' },
    issues,
    detail: {
      es: `${real.length} preguntas ilustradas, ${SCANNED_FIGURES.size} figuras declaradas`,
      en: `${real.length} illustrated questions, ${SCANNED_FIGURES.size} figures declared`,
    },
  }
}

/** Los datos de convocatoria que se muestran como hechos oficiales. */
export function checkCompetitions(): Check[] {
  return COMPETITION_ORDER.map((key) => {
    const c = COMPETITIONS[key]
    const issues: Issue[] = []
    const at = c.id

    const sum = c.fields.reduce((acc, f) => acc + f.posts, 0)
    if (sum !== c.postsTotal) {
      issues.push(
        issue(at, `las plazas por ámbito suman ${sum}, no ${c.postsTotal}`, `field posts add up to ${sum}, not ${c.postsTotal}`),
      )
    }
    if (!c.fields.length) issues.push(issue(at, 'sin ámbitos', 'no fields'))
    if (!c.noticeUrl.startsWith('https://')) {
      issues.push(issue(at, 'el enlace a la convocatoria no es https', 'notice link is not https'))
    }
    if (c.applyUrl && !c.applyUrl.startsWith('https://')) {
      issues.push(issue(at, 'el enlace de inscripción no es https', 'application link is not https'))
    }

    const open = new Date(c.applicationWindow.open).getTime()
    const close = new Date(c.applicationWindow.close).getTime()
    const docs = new Date(c.supportingDocsDeadline).getTime()
    if (Number.isNaN(open) || Number.isNaN(close) || Number.isNaN(docs)) {
      issues.push(issue(at, 'alguna fecha no es válida', 'an invalid date'))
    } else {
      if (close <= open) issues.push(issue(at, 'el plazo cierra antes de abrirse', 'window closes before it opens'))
      if (docs <= close) {
        issues.push(
          issue(at, 'los justificantes vencen antes del cierre', 'supporting docs are due before the window closes'),
        )
      }
    }

    if (!c.fields.some((f) => f.id === c.userField)) {
      issues.push(issue(at, 'el ámbito del usuario no está convocado', "the user's field is not in this competition"))
    }

    return {
      id: `competition:${key}`,
      label: { es: `Datos de ${c.id}`, en: `${c.id} data` },
      issues,
      detail: {
        es: `${c.postsTotal} plazas en ${c.fields.length} ámbitos · ${c.applicationWindow.open} → ${c.applicationWindow.close}`,
        en: `${c.postsTotal} posts across ${c.fields.length} fields · ${c.applicationWindow.open} → ${c.applicationWindow.close}`,
      },
    }
  })
}

/** Cada ámbito pertenece a una sola convocatoria. */
export function checkFieldOwnership(): Check {
  const ids = ALL_FIELDS.map((f) => f.id)
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
  return {
    id: 'competition:fields',
    label: { es: 'Cada ámbito pertenece a una convocatoria', en: 'Each field belongs to one competition' },
    issues: duplicates.map((id) => issue(id, 'aparece en dos convocatorias', 'appears in two competitions')),
    detail: { es: `${ids.length} ámbitos`, en: `${ids.length} fields` },
  }
}
