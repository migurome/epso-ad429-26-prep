import { PageHeader } from '../components/PageHeader'
import { PhaseCard } from '../components/PhaseCard'
import { FIELDS, PHASES, USER_FIELD } from '../data/competition'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'

export function FieldMcqOverview() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const phase = PHASES.find((p) => p.id === 'field-mcq')!

  return (
    <div>
      <PageHeader eyebrow={t('phase_2')} title={pick(locale, phase.shortLabel)} description={pick(locale, phase.description)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <PhaseCard
            key={field.id}
            to={`/campo/${field.id}`}
            title={pick(locale, field.label)}
            description={t('field_card_description')}
            meta={
              field.id === USER_FIELD
                ? `${field.posts} ${locale === 'es' ? 'plazas' : 'posts'} · ${t('your_field_suffix')}`
                : `${field.posts} ${locale === 'es' ? 'plazas' : 'posts'}`
            }
          />
        ))}
      </div>
    </div>
  )
}
