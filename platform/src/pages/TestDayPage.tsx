import { use } from 'react'
import { Markdown } from '../components/Markdown'
import { PageHeader } from '../components/PageHeader'
import { loadTestDayContent } from '../data/contentLoader'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'

export function TestDayPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const { THEORY_DOCS: theory } = use(loadTestDayContent())
  const doc = theory[0]

  return (
    <div>
      <PageHeader eyebrow={t('test_day_eyebrow')} title={t('test_day_title')} description={t('test_day_description')} />
      {doc && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <Markdown>{pick(locale, doc.summaryMd)}</Markdown>
        </div>
      )}
    </div>
  )
}
