import { Navigate, useParams } from 'react-router-dom'
import { BookOpen, ClipboardList } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Tabs } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { FormatBadges } from '../components/FormatBadges'
import { Markdown } from '../components/Markdown'
import { PracticeBank } from '../components/PracticeBank'
import { FullscreenPractice } from '../components/FullscreenPractice'
import { TimedTest } from '../components/TimedTest'
import { AttemptHistory } from '../components/AttemptHistory'
import { REASONING_SKILLS } from '../data/competition'
import { QUESTIONS, THEORY_DOCS } from '../data/content'
import { useProgressStore } from '../lib/progressStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { ReasoningSkill } from '../types/content'

export function ReasoningSkillPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const { skillId } = useParams<{ skillId: string }>()
  const skill = REASONING_SKILLS.find((s) => s.id === skillId)
  const skillTyped = skill?.id as ReasoningSkill | undefined

  const testAttempts = useProgressStore((s) => s.testAttempts)

  if (!skill) return <Navigate to="/razonamiento" replace />

  const attempts = testAttempts.filter((a) => a.phase === 'reasoning' && a.skill === skillTyped)
  const theory = THEORY_DOCS.filter((d) => d.skill === skillTyped)
  const questions = QUESTIONS.filter((q) => q.skill === skillTyped)

  return (
    <div>
      <PageHeader eyebrow={t('nav_reasoning')} title={pick(locale, skill.label)} />
      <FormatBadges format={skill.format} />

      <Tabs
        tabs={[
          {
            id: 'teoria',
            label: t('tab_theory'),
            content:
              theory.length === 0 ? (
                <EmptyState icon={<BookOpen size={28} />} title={t('empty_theory_title')} description={t('empty_theory_description')} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  {theory.map((doc) => (
                    <Markdown key={doc.id}>{pick(locale, doc.summaryMd)}</Markdown>
                  ))}
                </div>
              ),
          },
          {
            id: 'practica',
            label: `${t('tab_practice_bank')} (${questions.length})`,
            content:
              questions.length === 0 ? (
                <EmptyState icon={<ClipboardList size={28} />} title={t('empty_bank_title')} description={t('empty_bank_description')} />
              ) : skillTyped === 'abstract' ? (
                <FullscreenPractice questions={questions} />
              ) : (
                <PracticeBank questions={questions} />
              ),
          },
          {
            id: 'test',
            label: t('tab_timed_test'),
            content: <TimedTest questions={questions} format={skill.format} phase="reasoning" skill={skillTyped} />,
          },
          {
            id: 'historial',
            label: `${t('tab_history')}${attempts.length > 0 ? ` (${attempts.length})` : ''}`,
            content: <AttemptHistory attempts={attempts} maxScore={skill.format.maxScore} />,
          },
        ]}
      />
    </div>
  )
}
