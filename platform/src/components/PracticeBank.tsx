import { useMemo, useState } from 'react'
import { Check, ChevronDown, RotateCcw, X } from 'lucide-react'
import clsx from 'clsx'
import { QuestionCard } from './QuestionCard'
import { Markdown } from './Markdown'
import { TestLocaleSelector } from './TestLocaleSelector'
import { extractPromptFigures } from '../lib/abstractFigure'
import { pick, useLocaleStore, type Locale } from '../lib/localeStore'
import { usePracticeStore, type PracticeAnswer, type PracticeBankRef } from '../lib/practiceStore'
import {
  PACE_SECONDS,
  answeredOn,
  countsFor,
  formatPace,
  paceOf,
  showsUnder,
  type PracticeFilter,
} from '../lib/practiceView'
import { shuffleWithSeed } from '../lib/shuffle'
import { useStopwatch } from '../lib/useStopwatch'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { useT } from '../lib/useT'
import type { DictKey } from '../lib/dictionary'
import type { Question } from '../types/content'
import { SOURCE_LABEL_KEY, defaultSource, sourceOf, sourcesIn, type QuestionSource } from '../lib/questionSource'

interface PracticeBankProps {
  questions: Question[]
  /** Identifica el banco para guardar aparte su orden. Ámbito, destreza o
   * módulo del curso: lo que distinga a este banco de los demás. */
  bankId: string
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
function verdictOf(question: Question, optionId: string | undefined): boolean | null {
  if (optionId == null) return null
  return question.options.find((o) => o.id === optionId)?.isCorrect === true
}

const FILTERS: { value: PracticeFilter; key: DictKey }[] = [
  { value: 'all', key: 'practice_filter_all' },
  { value: 'pending', key: 'practice_filter_pending' },
  { value: 'answered', key: 'practice_filter_answered' },
]

export function PracticeBank({ questions, bankId }: PracticeBankProps) {
  const t = useT()
  const testLocale = useTestLocaleStore((s) => s.locale)

  // Las respuestas se guardan en el navegador. Antes vivían en el estado del
  // componente: bastaba recargar para que todo volviera a aparecer sin marcar
  // y no hubiera forma de saber qué se había trabajado ya.
  const answers = usePracticeStore((s) => s.answers)
  const recordAnswer = usePracticeStore((s) => s.answer)
  const complete = usePracticeStore((s) => s.complete)
  const reactivate = usePracticeStore((s) => s.reactivate)
  const reactivateAll = usePracticeStore((s) => s.reactivateAll)
  const seed = usePracticeStore((s) => s.orderSeed[bankId] ?? 0)

  const sources = useMemo(() => sourcesIn(questions), [questions])

  const [sourceFilter, setSourceFilter] = useState<QuestionSource | 'all'>(defaultSource(sources))
  const [stateFilter, setStateFilter] = useState<PracticeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const bank: PracticeBankRef = useMemo(
    () => ({ id: bankId, questionIds: questions.map((q) => q.id) }),
    [bankId, questions],
  )

  const ordered = useMemo(() => shuffleWithSeed(questions, seed), [questions, seed])

  const filtered = useMemo(
    () =>
      ordered.filter(
        (q) =>
          (sourceFilter === 'all' || sourceOf(q.tags) === sourceFilter) &&
          showsUnder(stateFilter, answers[q.id]),
      ),
    [ordered, sourceFilter, stateFilter, answers],
  )

  const counts = useMemo(() => countsFor(bank.questionIds, answers), [bank.questionIds, answers])

  return (
    <div>
      <TestLocaleSelector />
      {sources.length >= 2 && (
        <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs sm:text-sm">
          {[
            ...sources.map((source) => [source, t(SOURCE_LABEL_KEY[source])] as const),
            ['all', t('filter_all')] as const,
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSourceFilter(value)}
              className={clsx(
                'flex-1 rounded-md px-2 py-1.5 font-medium transition-colors sm:px-3',
                sourceFilter === value ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* El filtro por estado va aparte del de procedencia y no fundido con él:
          son dos preguntas distintas —de dónde sale y si ya la he trabajado— y
          un solo grupo de pestañas obligaría a elegir una de las dos. */}
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs sm:text-sm">
        {FILTERS.map(({ value, key }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStateFilter(value)}
            className={clsx(
              'flex-1 rounded-md px-2 py-1.5 font-medium tabular-nums transition-colors sm:px-3',
              stateFilter === value ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t(key)}{' '}
            <span className="text-slate-400">
              {value === 'all' ? counts.total : value === 'answered' ? counts.answered : counts.pending}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs text-slate-400">{t('n_questions', { n: filtered.length })}</p>
        {counts.answered > 0 && (
          <>
            <p className="text-xs text-slate-500 tabular-nums">
              {t('practice_answered', { done: counts.answered, total: counts.total })}
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
        {counts.answered === 0 && seed !== 0 && (
          <p className="text-xs text-slate-400">{t('practice_reshuffled')}</p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          {t('practice_none_under_filter')}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((q, i) => (
            <PracticeRow
              key={q.id}
              question={q}
              index={i}
              answer={answers[q.id]}
              isOpen={expandedId === q.id}
              testLocale={testLocale}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
              onAnswer={(optionId, seconds) => recordAnswer(q.id, optionId, seconds)}
              onDone={() => {
                complete(q.id)
                // Se pliega sola: darla por repasada es cerrarla, y dejarla
                // abierta obligaría a un segundo clic para lo mismo.
                setExpandedId(null)
              }}
              onReactivate={() => reactivate(q.id, bank)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

interface RowProps {
  question: Question
  index: number
  answer: PracticeAnswer | undefined
  isOpen: boolean
  testLocale: Locale
  onToggle: () => void
  onAnswer: (optionId: string, seconds: number) => void
  onDone: () => void
  onReactivate: () => void
}

// Una fila de la lista.
//
// Dos cosas del diseño que no son estéticas:
//
//   · **Sólo la flecha pliega.** Antes la fila entera era un botón, y eso
//     tenía un efecto que no se buscaba: arrastrar el ratón para subrayar una
//     palabra del enunciado terminaba en un clic y cerraba la pregunta. En un
//     texto de razonamiento verbal, señalar con el dedo es parte de leerlo.
//   · **El contador corre por fila.** Cada pregunta monta el suyo, así que
//     pasar de una abierta a la siguiente lo reinicia solo. Con un contador
//     único arriba, abrir la segunda sin contestar la primera heredaba el
//     tiempo de aquélla.
function PracticeRow({
  question,
  index,
  answer,
  isOpen,
  testLocale,
  onToggle,
  onAnswer,
  onDone,
  onReactivate,
}: RowProps) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const running = isOpen && answer == null
  const elapsed = useStopwatch(running)

  const verdict = verdictOf(question, answer?.optionId)
  const when = answeredOn(answer)
  const intl = locale === 'es' ? 'es-ES' : 'en-GB'
  const pace = paceOf(elapsed)

  return (
    <li
      className={clsx(
        'overflow-hidden rounded-xl border bg-white',
        verdict === true && 'border-emerald-300',
        verdict === false && 'border-red-300',
        verdict === null && 'border-slate-200',
      )}
    >
      <div className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span
          className={clsx(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
            verdict === true && 'bg-emerald-100 text-emerald-700',
            verdict === false && 'bg-red-100 text-red-700',
            verdict === null && 'bg-slate-100 text-slate-500',
          )}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <Markdown className="text-sm">{headerPrompt(question, pick(testLocale, question.prompt))}</Markdown>
          {when && (
            <p className="mt-1 text-[11px] text-slate-400" title={when.toLocaleString(intl)}>
              {t('practice_answered_on', {
                date: when.toLocaleDateString(intl, { day: 'numeric', month: 'short' }),
              })}
            </p>
          )}
        </div>

        {running && (
          <span
            title={t('practice_pace_hint', { n: PACE_SECONDS })}
            className={clsx(
              'mt-0.5 shrink-0 text-xs font-medium tabular-nums',
              pace.over ? 'text-red-600' : 'text-slate-400',
            )}
          >
            {formatPace(elapsed)}
          </span>
        )}

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

        {answer != null && (
          <button
            type="button"
            aria-label={t('practice_reactivate_one')}
            title={t('practice_reactivate_one')}
            onClick={onReactivate}
            className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <RotateCcw size={14} />
          </button>
        )}

        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? t('practice_collapse') : t('practice_expand')}
          title={isOpen ? t('practice_collapse') : t('practice_expand')}
          onClick={onToggle}
          className="-mt-0.5 shrink-0 rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={clsx('transition-transform', isOpen && 'rotate-180')}
          />
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 px-4 py-4">
          <QuestionCard
            question={question}
            selectedOptionId={answer?.optionId ?? null}
            revealed={answer != null}
            onSelect={(optionId) => onAnswer(optionId, elapsed)}
            hidePrompt={question.skill !== 'abstract'}
          />

          {/* Responder no cierra nada. La explicación aparece en ese momento y
              le hace falta justo a quien acaba de fallar; plegar la pregunta
              ahí sería cerrarle la puerta. Cierra el candidato, cuando ha
              terminado de leer. */}
          {answer != null && answer.done !== true && (
            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={onDone}
                title={t('practice_done_hint')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:border-emerald-500"
              >
                <Check size={14} />
                {t('practice_done')}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
