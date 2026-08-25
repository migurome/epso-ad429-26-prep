import { PageHeader } from '../components/PageHeader'
import { PhaseCard } from '../components/PhaseCard'
import { REASONING_SKILLS, PHASES } from '../data/competition'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'

export function ReasoningOverview() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const phase = PHASES.find((p) => p.id === 'reasoning')!

  return (
    <div>
      <PageHeader eyebrow={t('phase_1')} title={pick(locale, phase.shortLabel)} description={pick(locale, phase.description)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {REASONING_SKILLS.map((skill) => (
          <PhaseCard
            key={skill.id}
            to={`/razonamiento/${skill.id}`}
            title={pick(locale, skill.label)}
            description={t('reasoning_skill_card_description')}
            meta={t('questions_and_minutes', { q: skill.format.questions, m: skill.format.minutes })}
          />
        ))}
      </div>
    </div>
  )
}
