import { History } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { formatClock } from '../lib/time'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { useT } from '../lib/useT'
import type { EssayAttempt, EssayPrompt } from '../types/content'

interface EssayHistoryProps {
  attempts: EssayAttempt[]
  prompts: EssayPrompt[]
}

function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function EssayHistory({ attempts, prompts }: EssayHistoryProps) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const testLocale = useTestLocaleStore((s) => s.locale)

  if (attempts.length === 0) {
    return <EmptyState icon={<History size={28} />} title={t('no_essays_title')} description={t('no_essays_description')} />
  }

  const sorted = [...attempts].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )

  return (
    <div className="space-y-3">
      {sorted.map((a) => {
        const prompt = prompts.find((p) => p.id === a.promptId)
        return (
          <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{prompt ? pick(testLocale, prompt.title) : a.promptId}</p>
              <span className="text-xs text-slate-400">
                {new Date(a.startedAt).toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t('essay_history_meta', { n: wordCount(a.text), t: formatClock(a.timeSpentSeconds) })}
            </p>
            {a.selfReviewNotes && <p className="mt-2 text-sm italic text-slate-600">"{a.selfReviewNotes}"</p>}
          </div>
        )
      })}
    </div>
  )
}
