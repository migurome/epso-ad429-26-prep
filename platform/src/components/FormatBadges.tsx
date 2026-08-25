import type { TestFormat } from '../data/competition'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'

interface FormatBadgesProps {
  format: TestFormat
}

export function FormatBadges({ format }: FormatBadgesProps) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)

  const items = [
    format.questions === 1 ? t('n_exercise', { n: format.questions }) : t('n_questions', { n: format.questions }),
    `${format.minutes} min`,
    `${locale === 'es' ? 'puntuación' : 'score'} 0–${format.maxScore}`,
    format.passMark != null
      ? `${locale === 'es' ? 'corte' : 'pass mark'} ${format.passMark}/${format.maxScore}`
      : format.passMarkNote
        ? pick(locale, format.passMarkNote)
        : null,
  ].filter(Boolean)

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
