import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { QuestionCard } from './QuestionCard'
import { TestLocaleSelector } from './TestLocaleSelector'
import { useT } from '../lib/useT'
import type { Question } from '../types/content'

interface FullscreenPracticeProps {
  questions: Question[]
}

function sourceLabel(tags: string[] | undefined): 'real' | 'ai-generated' | null {
  if (!tags) return null
  if (tags.includes('real')) return 'real'
  if (tags.includes('ai-generated')) return 'ai-generated'
  return null
}

// Vista de práctica "una pregunta a pantalla completa": una sola pregunta
// grande y centrada por vez, con navegación anterior/siguiente, en vez del
// acordeón de PracticeBank. Pensada para razonamiento abstracto, donde el
// contenido (figuras/símbolos) se beneficia de más tamaño y foco visual.
export function FullscreenPractice({ questions }: FullscreenPracticeProps) {
  const t = useT()
  const hasSourceSplit = useMemo(
    () =>
      questions.some((q) => sourceLabel(q.tags) === 'real') &&
      questions.some((q) => sourceLabel(q.tags) === 'ai-generated'),
    [questions],
  )

  const [sourceFilter, setSourceFilter] = useState<'all' | 'real' | 'ai-generated'>(hasSourceSplit ? 'real' : 'all')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return questions
    return questions.filter((q) => sourceLabel(q.tags) === sourceFilter)
  }, [questions, sourceFilter])

  const safeIndex = Math.min(index, Math.max(0, filtered.length - 1))
  const current = filtered[safeIndex]

  function changeFilter(next: 'all' | 'real' | 'ai-generated') {
    setSourceFilter(next)
    setIndex(0)
  }

  if (!current) return null

  return (
    <div>
      <TestLocaleSelector />
      {hasSourceSplit && (
        <div className="mx-auto mb-4 flex max-w-md gap-1 rounded-lg bg-slate-100 p-1 text-sm">
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
              onClick={() => changeFilter(value)}
              className={clsx(
                'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors',
                sourceFilter === value ? 'bg-white text-eu-blue shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <p className="mb-3 text-center text-sm font-medium text-slate-500">
        {t('question_x_of_y', { x: safeIndex + 1, y: filtered.length })}
      </p>

      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <QuestionCard
          question={current}
          selectedOptionId={answers[current.id] ?? null}
          revealed={Boolean(answers[current.id])}
          onSelect={(optionId) => setAnswers((prev) => ({ ...prev, [current.id]: optionId }))}
          size="large"
        />
      </div>

      <div className="mx-auto mt-6 flex max-w-2xl items-center justify-between">
        <button
          type="button"
          disabled={safeIndex === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          {t('previous')}
        </button>
        <button
          type="button"
          disabled={safeIndex === filtered.length - 1}
          onClick={() => setIndex((i) => Math.min(filtered.length - 1, i + 1))}
          className="inline-flex items-center gap-1 rounded-lg bg-eu-blue px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t('next')}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
