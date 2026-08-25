import { BarChart3, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { formatClock } from '../lib/time'
import { useProgressStore } from '../lib/progressStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'
import { EUFTE_FORMAT, FIELD_MCQ_FORMAT, REASONING_SKILLS } from '../data/competition'
import type { TestAttempt } from '../types/content'

interface Row {
  key: string
  label: string
  attempts: TestAttempt[]
  maxScore: number
}

function summarize(attempts: TestAttempt[], maxScore: number) {
  const scores = attempts.map((a) => {
    const correct = a.results.filter((r) => r.correct).length
    return a.totalQuestions > 0 ? (correct / a.totalQuestions) * maxScore : 0
  })
  const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
  const best = scores.length > 0 ? Math.max(...scores) : 0
  const totalTime = attempts.reduce((s, a) => s + a.timeSpentSeconds, 0)
  return { avg, best, totalTime, count: attempts.length }
}

export function ProgressPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const testAttempts = useProgressStore((s) => s.testAttempts)
  const essayAttempts = useProgressStore((s) => s.essayAttempts)
  const clearAll = useProgressStore((s) => s.clearAll)

  const hasActivity = testAttempts.length > 0 || essayAttempts.length > 0

  const rows: Row[] = [
    ...REASONING_SKILLS.map((s) => ({
      key: `reasoning-${s.id}`,
      label: pick(locale, s.label),
      attempts: testAttempts.filter((a) => a.phase === 'reasoning' && a.skill === s.id),
      maxScore: s.format.maxScore,
    })),
    {
      key: 'field-mcq',
      label: t('nav_field_mcq'),
      attempts: testAttempts.filter((a) => a.phase === 'field-mcq'),
      maxScore: FIELD_MCQ_FORMAT.maxScore,
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow={t('progress_eyebrow')}
        title={t('progress_title')}
        description={t('progress_description')}
        actions={
          hasActivity ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('clear_history_confirm'))) {
                  clearAll()
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-600"
            >
              <Trash2 size={14} />
              {t('clear_history')}
            </button>
          ) : undefined
        }
      />

      {!hasActivity && (
        <EmptyState icon={<BarChart3 size={28} />} title={t('no_tests_completed_title')} description={t('no_tests_completed_description')} />
      )}

      {hasActivity && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">{t('col_test')}</th>
                    <th className="px-4 py-2.5">{t('col_attempts')}</th>
                    <th className="px-4 py-2.5">{t('col_average')}</th>
                    <th className="px-4 py-2.5">{t('col_best')}</th>
                    <th className="px-4 py-2.5">{t('col_total_time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows
                    .filter((r) => r.attempts.length > 0)
                    .map((r) => {
                      const { avg, best, totalTime, count } = summarize(r.attempts, r.maxScore)
                      return (
                        <tr key={r.key}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{r.label}</td>
                          <td className="px-4 py-2.5 text-slate-600">{count}</td>
                          <td className="px-4 py-2.5 text-slate-600">
                            {avg.toFixed(1)} / {r.maxScore}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            {best.toFixed(1)} / {r.maxScore}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{formatClock(totalTime)}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {essayAttempts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-800">{t('nav_eufte')}</p>
              <p className="mt-1 text-sm text-slate-600">
                {t('eufte_progress_summary', {
                  n: essayAttempts.length,
                  plural: essayAttempts.length === 1 ? '' : locale === 'es' ? 'es' : 's',
                  t: formatClock(essayAttempts.reduce((s, a) => s + a.timeSpentSeconds, 0)),
                  m: EUFTE_FORMAT.minutes,
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
