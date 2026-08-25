import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { QuestionCard } from './QuestionCard'
import { TestLocaleSelector } from './TestLocaleSelector'
import { pick } from '../lib/localeStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { useT } from '../lib/useT'
import type { Question } from '../types/content'

interface PracticeBankProps {
  questions: Question[]
}

function sourceLabel(tags: string[] | undefined): 'real' | 'ai-generated' | null {
  if (!tags) return null
  if (tags.includes('real')) return 'real'
  if (tags.includes('ai-generated')) return 'ai-generated'
  return null
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\|.*\|/g, ' ')
    .replace(/[#>*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function PracticeBank({ questions }: PracticeBankProps) {
  const t = useT()
  const testLocale = useTestLocaleStore((s) => s.locale)
  const hasSourceSplit = useMemo(
    () => questions.some((q) => sourceLabel(q.tags) === 'real') && questions.some((q) => sourceLabel(q.tags) === 'ai-generated'),
    [questions],
  )

  const [sourceFilter, setSourceFilter] = useState<'all' | 'real' | 'ai-generated'>(hasSourceSplit ? 'real' : 'all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return questions
    return questions.filter((q) => sourceLabel(q.tags) === sourceFilter)
  }, [questions, sourceFilter])

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
                sourceFilter === value ? 'bg-white text-eu-blue shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <p className="mb-3 text-xs text-slate-400">{t('n_questions', { n: filtered.length })}</p>

      <div className="space-y-2">
        {filtered.map((q, i) => {
          const isOpen = expandedId === q.id
          const answered = answers[q.id]
          return (
            <div key={q.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : q.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span
                  className={clsx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    answered ? 'bg-eu-blue/10 text-eu-blue' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-slate-700">
                  {stripMarkdown(pick(testLocale, q.prompt)).slice(0, 110)}
                </span>
                <ChevronDown
                  size={16}
                  className={clsx('shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-4 py-4">
                  <QuestionCard
                    question={q}
                    selectedOptionId={answered ?? null}
                    revealed={Boolean(answered)}
                    onSelect={(optionId) => setAnswers((prev) => ({ ...prev, [q.id]: optionId }))}
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
