import { ExternalLink } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { COMPETITION, FIELDS } from '../data/competition'
import { REFERENCE_LINKS } from '../data/content'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'

function groupByCategory<T extends { category: string }>(items: T[]) {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const list = groups.get(item.category) ?? []
    list.push(item)
    groups.set(item.category, list)
  }
  return groups
}

export function ResourcesPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const grouped = groupByCategory(REFERENCE_LINKS)

  return (
    <div>
      <PageHeader eyebrow={t('resources_eyebrow')} title={t('resources_title')} description={t('resources_description')} />

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">
          {COMPETITION.id} — {pick(locale, COMPETITION.title)}
        </h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">{t('total_posts')}</dt>
            <dd className="font-medium text-slate-700">{COMPETITION.postsTotal}</dd>
          </div>
          <div>
            <dt className="text-slate-400">{t('fields_label')}</dt>
            <dd className="font-medium text-slate-700">
              {FIELDS.map((f) => `${pick(locale, f.label)} (${f.posts})`).join(' · ')}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{t('application_window')}</dt>
            <dd className="font-medium text-slate-700">
              {COMPETITION.applicationWindow.open} → {COMPETITION.applicationWindow.close}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">{t('language_regime')}</dt>
            <dd className="font-medium text-slate-700">{pick(locale, COMPETITION.languageRule)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          {t('resources_verified_note')}{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">
            Docs/0.- Selection procedure overview.md
          </code>
          .
        </p>
      </div>

      <div className="space-y-8">
        {[...grouped.entries()].map(([category, links]) => (
          <div key={category}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {category}
            </h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm transition-colors hover:border-eu-blue"
                  >
                    <ExternalLink
                      size={15}
                      className="mt-0.5 shrink-0 text-slate-300 group-hover:text-eu-blue"
                    />
                    <span>
                      <span className="font-medium text-slate-800">{link.title}</span>
                      {link.notes && (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {link.notes}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
