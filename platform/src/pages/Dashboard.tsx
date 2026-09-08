import { BrainCircuit, ListChecks, PenLine } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PhaseCard } from '../components/PhaseCard'
import { EmptyState } from '../components/EmptyState'
import { PHASES } from '../data/competition'
import { useCompetition } from '../lib/competitionStore'
import { useProgressStore } from '../lib/progressStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'

const PHASE_ICONS = {
  reasoning: BrainCircuit,
  'field-mcq': ListChecks,
  eufte: PenLine,
}

const PHASE_ROUTES: Record<string, string> = {
  reasoning: '/razonamiento',
  'field-mcq': '/campo',
  eufte: '/eufte',
}

export function Dashboard() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const competition = useCompetition()
  const attemptCount =
    useProgressStore((s) => s.testAttempts.length) +
    useProgressStore((s) => s.essayAttempts.length)

  return (
    <div>
      <PageHeader
        eyebrow={`${competition.grade} · ${competition.id}`}
        title={t('dashboard_title')}
        description={t('dashboard_description')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PHASES.map((phase) => {
          const Icon = PHASE_ICONS[phase.id]
          return (
            <PhaseCard
              key={phase.id}
              to={PHASE_ROUTES[phase.id]}
              order={phase.order}
              title={pick(locale, phase.shortLabel)}
              description={pick(locale, phase.description)}
              icon={<Icon size={20} />}
            />
          )
        })}
      </div>

      <div className="mt-8">
        {attemptCount === 0 ? (
          <EmptyState title={t('dashboard_empty_title')} description={t('dashboard_empty_description')} />
        ) : null}
      </div>
    </div>
  )
}
