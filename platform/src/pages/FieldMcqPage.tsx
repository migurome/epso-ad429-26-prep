import { use, useEffect, useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
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
import { usePreferredField } from '../lib/studyStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { Field } from '../types/content'

export function FieldMcqPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const { fieldId } = useParams<{ fieldId: string }>()
  const navigate = useNavigate()
  const competition = useCompetition()
  const setCompetition = useCompetitionStore((s) => s.setCompetition)
  const preferredField = usePreferredField()

  // El ámbito de la URL manda sobre la convocatoria activa: cada ámbito
  // pertenece a una sola, así que llegar por enlace directo a uno de la otra
  // cambia de convocatoria en vez de rebotar a una lista donde ese ámbito ni
  // siquiera aparece.
  const owner = COMPETITION_ORDER.map((key) => COMPETITIONS[key]).find((c) =>
    c.fields.some((f) => f.id === fieldId),
  )
  const field = owner?.fields.find((f) => f.id === fieldId)

  const testAttempts = useProgressStore((s) => s.testAttempts)

  // ...pero si es el candidato quien cambia de convocatoria en el selector
  // estando en un ámbito de la otra, manda el selector: se le lleva al ámbito
  // que tenga elegido en la nueva. Sin distinguir quién ha cambiado qué, el
  // efecto devolvía la convocatoria a la del ámbito de la URL en el mismo
  // render, y el selector no servía para nada dentro de toda esta fase.
  const lastCompetition = useRef(competition.key)
  useEffect(() => {
    if (!owner) return
    const switchedByHand = lastCompetition.current !== competition.key
    lastCompetition.current = competition.key
    if (owner.key === competition.key) return
    if (switchedByHand) navigate(`/campo/${preferredField}`, { replace: true })
    else setCompetition(owner.key)
  }, [owner, competition.key, preferredField, navigate, setCompetition])

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
                // Un ámbito sin banco no lo está por descuido: la convocatoria
                // AD8 es de septiembre de 2026 y su banco aún no está escrito.
                // Conviene decirlo y remitir al alcance oficial, que sí está.
                <EmptyState
                  icon={<ClipboardList size={28} />}
                  title={field.bankPending ? t('empty_ad8_bank_title') : t('empty_bank_title')}
                  description={
                    field.bankPending ? t('empty_ad8_bank_description') : t('empty_field_bank_description')
                  }
                />
              ) : (
                <PracticeBank questions={questions} bankId={`field:${fieldTyped}`} />
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
