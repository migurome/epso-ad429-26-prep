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
import { ALL_FIELDS, competitionOf, FIELD_MCQ_FORMAT } from '../data/competition'
import { loadFieldContent } from '../data/contentLoader'
import { useProgressStore } from '../lib/progressStore'
import { useStudyStore } from '../lib/studyStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { Field } from '../types/content'

export function FieldMcqPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const { fieldId } = useParams<{ fieldId: string }>()
  const updateProfile = useStudyStore((s) => s.updateProfile)

  const field = ALL_FIELDS.find((f) => f.id === fieldId)
  const owner = field ? competitionOf(field.id) : undefined

  const testAttempts = useProgressStore((s) => s.testAttempts)

  // Abrir un ámbito es elegirlo. Es la barra lateral quien lleva aquí y allí
  // la lista de ámbitos ES el selector, así que no tendría sentido que la
  // plataforma siguiera dando por bueno el anterior: los plazos de la portada
  // y el color de la interfaz se quedarían en la otra convocatoria mientras se
  // estudia ésta. Vale también para un enlace directo, que es la misma
  // intención escrita de otra forma.
  useEffect(() => {
    if (field) updateProfile({ field: field.id })
  }, [field, updateProfile])

  if (!field || !owner) return <Navigate to="/campo" replace />

  const fieldTyped = field.id as Field
  const { QUESTIONS: questions, THEORY_DOCS: theory } = use(loadFieldContent(fieldTyped))
  const attempts = testAttempts.filter((a) => a.phase === 'field-mcq' && a.field === fieldTyped)

  return (
    <div>
      {/* La convocatoria va en el antetítulo porque ya no hay pestaña que la
          diga: el ámbito es lo que se elige, y ésta es la oposición a la que
          pertenece. */}
      <PageHeader
        eyebrow={`${t('nav_field_mcq')} · ${owner.id}`}
        title={pick(locale, field.label)}
        description={`${field.posts} ${locale === 'es' ? 'plazas en la lista de reserva para este campo.' : 'posts on the reserve list for this field.'}`}
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
                <PracticeBank
                  questions={questions}
                  bankId={`field:${fieldTyped}`}
                  format={FIELD_MCQ_FORMAT}
                />
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
