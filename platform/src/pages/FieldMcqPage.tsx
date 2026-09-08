import { use, useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { BookOpen, ClipboardList } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Tabs } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { FormatBadges } from '../components/FormatBadges'
import { Markdown } from '../components/Markdown'
import { PracticeBank } from '../components/PracticeBank'
import { TimedTest } from '../components/TimedTest'
import { AttemptHistory } from '../components/AttemptHistory'
import { COMPETITIONS, COMPETITION_ORDER, FIELD_MCQ_FORMAT } from '../data/competition'
import { useCompetition, useCompetitionStore } from '../lib/competitionStore'
import { loadFieldContent } from '../data/contentLoader'
import { useProgressStore } from '../lib/progressStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { Field } from '../types/content'

export function FieldMcqPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const { fieldId } = useParams<{ fieldId: string }>()
  const competition = useCompetition()
  const setCompetition = useCompetitionStore((s) => s.setCompetition)

  // El ámbito de la URL manda sobre la convocatoria activa: cada ámbito
  // pertenece a una sola, así que llegar por enlace directo a uno de la otra
  // cambia de convocatoria en vez de rebotar a una lista donde ese ámbito ni
  // siquiera aparece.
  const owner = COMPETITION_ORDER.map((key) => COMPETITIONS[key]).find((c) =>
    c.fields.some((f) => f.id === fieldId),
  )
  const field = owner?.fields.find((f) => f.id === fieldId)

  const testAttempts = useProgressStore((s) => s.testAttempts)

  useEffect(() => {
    if (owner && owner.key !== competition.key) setCompetition(owner.key)
  }, [owner, competition.key, setCompetition])

  if (!field || !owner) return <Navigate to="/campo" replace />

  const fieldTyped = field.id as Field
  const { QUESTIONS: questions, THEORY_DOCS: theory } = use(loadFieldContent(fieldTyped))
  const attempts = testAttempts.filter((a) => a.phase === 'field-mcq' && a.field === fieldTyped)

  return (
    <div>
      <PageHeader
        eyebrow={t('nav_field_mcq')}
        title={pick(locale, field.label)}
        description={`${field.posts} ${locale === 'es' ? 'plazas en la lista de reserva para este campo.' : 'posts on the reserve list for this field.'}${
          field.id === owner.userField ? ` ${t('your_field_chosen_suffix')}` : ''
        }`}
      />
      <FormatBadges format={FIELD_MCQ_FORMAT} />

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
                // Los ámbitos de la AD8 no están sin banco por descuido, sino
                // porque su convocatoria es de septiembre de 2026: conviene
                // decirlo y remitir al alcance oficial, que sí está.
                <EmptyState
                  icon={<ClipboardList size={28} />}
                  title={owner.key === 'ad8' ? t('empty_ad8_bank_title') : t('empty_bank_title')}
                  description={
                    owner.key === 'ad8'
                      ? t('empty_ad8_bank_description')
                      : t('empty_field_bank_description')
                  }
                />
              ) : (
                <PracticeBank questions={questions} />
              ),
          },
          {
            id: 'test',
            label: t('tab_timed_test'),
            content: (
              <TimedTest questions={questions} format={FIELD_MCQ_FORMAT} phase="field-mcq" field={fieldTyped} />
            ),
          },
          {
            id: 'historial',
            label: `${t('tab_history')}${attempts.length > 0 ? ` (${attempts.length})` : ''}`,
            content: <AttemptHistory attempts={attempts} maxScore={FIELD_MCQ_FORMAT.maxScore} />,
          },
        ]}
      />
    </div>
  )
}
