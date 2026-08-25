import { History } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { formatClock } from '../lib/time'
import { useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { TestAttempt } from '../types/content'

interface AttemptHistoryProps {
  attempts: TestAttempt[]
  maxScore: number
}

export function AttemptHistory({ attempts, maxScore }: AttemptHistoryProps) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)

  if (attempts.length === 0) {
    return <EmptyState icon={<History size={28} />} title={t('no_attempts_title')} description={t('no_attempts_description')} />
  }

  const sorted = [...attempts].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">{t('col_date')}</th>
            <th className="px-4 py-2.5">{t('col_score')}</th>
            <th className="px-4 py-2.5">{t('col_correct')}</th>
            <th className="px-4 py-2.5">{t('col_time')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((a) => {
            const correct = a.results.filter((r) => r.correct).length
            const scaled = a.totalQuestions > 0 ? (correct / a.totalQuestions) * maxScore : 0
            return (
              <tr key={a.id}>
                <td className="px-4 py-2.5 text-slate-600">
                  {new Date(a.startedAt).toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-800">
                  {scaled.toFixed(1)} / {maxScore}
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {correct} / {a.totalQuestions}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{formatClock(a.timeSpentSeconds)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
