import { useMemo, useState } from 'react'
import { Check, ChevronDown, RotateCcw, X } from 'lucide-react'
import clsx from 'clsx'
import { QuestionCard } from './QuestionCard'
import { Markdown } from './Markdown'
import { TestLocaleSelector } from './TestLocaleSelector'
import { extractPromptFigures } from '../lib/abstractFigure'
import { pick } from '../lib/localeStore'
import { usePracticeStore, type PracticeBankRef } from '../lib/practiceStore'
import { shuffleWithSeed } from '../lib/shuffle'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { useT } from '../lib/useT'
import type { Question } from '../types/content'

interface PracticeBankProps {
  questions: Question[]
  /** Identifica el banco para guardar aparte su orden. Ámbito, destreza o
   * módulo del curso: lo que distinga a este banco de los demás. */
  bankId: string
}

function sourceLabel(tags: string[] | undefined): 'real' | 'ai-generated' | null {
  if (!tags) return null
  if (tags.includes('real')) return 'real'
  if (tags.includes('ai-generated')) return 'ai-generated'
  return null
}

// El enunciado de la cabecera. Va entero: cortarlo a mitad de frase obligaba a
// abrir la pregunta sólo para saber cuál era, y dejaba la lista llena de
// oraciones truncadas.
//
// La excepción es el razonamiento abstracto, donde el enunciado no es texto
// sino la secuencia de figuras: ahí la cabecera lleva la prosa que describe la
// regla —lo que identifica la pregunta— y las figuras se quedan en la tarjeta,
// que es donde se pueden dibujar.
function headerPrompt(question: Question, prompt: string): string {
  if (question.skill !== 'abstract') return prompt
  const prose = extractPromptFigures(prompt)?.remainderMd?.trim()
  return prose ? prose : prompt
}

// null mientras no se ha respondido; después, si la opción elegida era la buena.
function verdictOf(question: Question, answer: string | undefined): boolean | null {
  if (answer == null) return null
  return question.options.find((o) => o.id === answer)?.isCorrect === true
}

export function PracticeBank({ questions, bankId }: PracticeBankProps) {
  const t = useT()
  const testLocale = useTestLocaleStore((s) => s.locale)

  // Las respuestas se guardan en el navegador. Antes vivían en el estado del
  // componente: bastaba recargar para que todo volviera a aparecer sin marcar
  // y no hubiera forma de saber qué se había trabajado ya.
  const answers = usePracticeStore((s) => s.answers)
  const recordAnswer = usePracticeStore((s) => s.answer)
  const reactivate = usePracticeStore((s) => s.reactivate)
  const reactivateAll = usePracticeStore((s) => s.reactivateAll)
  const seed = usePracticeStore((s) => s.orderSeed[bankId] ?? 0)

  const hasSourceSplit = useMemo(
    () => questions.some((q) => sourceLabel(q.tags) === 'real') && questions.some((q) => sourceLabel(q.tags) === 'ai-generated'),
    [questions],
  )

  const [sourceFilter, setSourceFilter] = useState<'all' | 'real' | 'ai-generated'>(hasSourceSplit ? 'real' : 'all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const bank: PracticeBankRef = useMemo(
    () => ({ id: bankId, questionIds: questions.map((q) => q.id) }),
    [bankId, questions],
  )

  const ordered = useMemo(() => shuffleWithSeed(questions, seed), [questions, seed])

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return ordered
    return ordered.filter((q) => sourceLabel(q.tags) === sourceFilter)
  }, [ordered, sourceFilter])

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] != null).length,
    [questions, answers],
  )

  return (
    <div>
      <TestLocaleSelector />
      {hasSourceSplit && (
        <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {(
            [
              ['real', t('filter_real_bank')],
              ['ai-generated', t('filter_ai_bank')],
              ['all', t('filter_all')],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSourceFilter(value)}
              className={clsx(
                'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors',
                sourceFilter === value ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs text-slate-400">{t('n_questions', { n: filtered.length })}</p>
        {answeredCount > 0 && (
          <>
            <p className="text-xs text-slate-500 tabular-nums">
              {t('practice_answered', { done: answeredCount, total: questions.length })}
            </p>
            <button
              type="button"
              onClick={() => reactivateAll(bank)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RotateCcw size={13} />
              {t('practice_reactivate_all')}
            </button>
          </>
        )}
        {answeredCount === 0 && seed !== 0 && (
          <p className="text-xs text-slate-400">{t('practice_reshuffled')}</p>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map((q, i) => {
          const isOpen = expandedId === q.id
          const answered = answers[q.id]
          const verdict = verdictOf(q, answered)
          const isAbstract = q.skill === 'abstract'
          const toggle = () => setExpandedId(isOpen ? null : q.id)
          return (
            <div
              key={q.id}
              className={clsx(
                'overflow-hidden rounded-xl border bg-white',
                verdict === true && 'border-emerald-300',
                verdict === false && 'border-red-300',
                verdict === null && 'border-slate-200',
              )}
            >
              {/* Un <button> sólo admite contenido de frase, y el enunciado
                  entero trae párrafos y tablas. De ahí el div con role. */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={toggle}
                onKeyDown={(e) => {
                  // Sin esta guarda, pulsar Intro sobre el botón de reactivar
                  // plegaría además la pregunta, porque el evento sube.
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggle()
                  }
                }}
                className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
              >
                <span
                  className={clsx(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    verdict === true && 'bg-emerald-100 text-emerald-700',
                    verdict === false && 'bg-red-100 text-red-700',
                    verdict === null && 'bg-slate-100 text-slate-500',
                  )}
                >
                  {i + 1}
                </span>
                <Markdown className="min-w-0 flex-1 text-sm">
                  {headerPrompt(q, pick(testLocale, q.prompt))}
                </Markdown>
                {verdict === true && (
                  <span className="mt-0.5 flex shrink-0 items-center text-emerald-600">
                    <Check size={16} aria-hidden="true" />
                    <span className="sr-only">{t('answered_correct')}</span>
                  </span>
                )}
                {verdict === false && (
                  <span className="mt-0.5 flex shrink-0 items-center text-red-600">
                    <X size={16} aria-hidden="true" />
                    <span className="sr-only">{t('answered_wrong')}</span>
                  </span>
                )}
                {verdict !== null && (
                  <button
                    type="button"
                    aria-label={t('practice_reactivate_one')}
                    title={t('practice_reactivate_one')}
                    onClick={(e) => {
                      e.stopPropagation()
                      reactivate(q.id, bank)
                    }}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={clsx('mt-0.5 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')}
                />
              </div>
              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-4">
                  <QuestionCard
                    question={q}
                    selectedOptionId={answered ?? null}
                    revealed={Boolean(answered)}
                    onSelect={(optionId) => recordAnswer(q.id, optionId)}
                    hidePrompt={!isAbstract}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
