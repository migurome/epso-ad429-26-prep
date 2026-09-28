import { PageHeader } from '../components/PageHeader'
import { ApplicationEditor } from '../components/ApplicationEditor'
import { SECTIONS, readyCount } from '../lib/application'
import { useApplicationStore } from '../lib/applicationStore'
import { useCompetition } from '../lib/studyStore'
import { pick, useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'

export function ApplicationPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const competition = useCompetition()
  const texts = useApplicationStore((s) => s.texts)
  const setText = useApplicationStore((s) => s.setText)

  return (
    <div>
      <PageHeader
        eyebrow={`${competition.id} — ${pick(locale, competition.title)}`}
        title={t('application_title')}
        description={t('application_description')}
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-600">{t('application_board_note')}</p>
        <p className="mt-2 text-xs tabular-nums text-slate-500">
          {t('application_ready', {
            ready: String(readyCount(texts)),
            total: String(SECTIONS.length),
          })}
        </p>
      </div>

      <ApplicationEditor texts={texts} onChange={setText} />

      <p className="mt-6 text-xs text-slate-400">{t('application_local_note')}</p>
    </div>
  )
}
