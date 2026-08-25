import { use, useState } from 'react'
import { ChevronDown, PenLine } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader } from '../components/PageHeader'
import { Tabs } from '../components/Tabs'
import { EmptyState } from '../components/EmptyState'
import { FormatBadges } from '../components/FormatBadges'
import { Markdown } from '../components/Markdown'
import { EssayRunner } from '../components/EssayRunner'
import { EssayHistory } from '../components/EssayHistory'
import { TestLocaleSelector } from '../components/TestLocaleSelector'
import { EUFTE_FORMAT, PHASES } from '../data/competition'
import { loadEufteContent } from '../data/contentLoader'
import { useProgressStore } from '../lib/progressStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { useT } from '../lib/useT'

export function EuftePage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const testLocale = useTestLocaleStore((s) => s.locale)
  const phase = PHASES.find((p) => p.id === 'eufte')!
  const { THEORY_DOCS: theory, ESSAY_PROMPTS: essayPrompts } = use(loadEufteContent())
  const essayAttempts = useProgressStore((s) => s.essayAttempts)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <PageHeader eyebrow={t('phase_n', { n: 3 })} title={pick(locale, phase.shortLabel)} description={pick(locale, phase.description)} />
      <FormatBadges format={EUFTE_FORMAT} />

      <Tabs
        tabs={[
          {
            id: 'teoria',
            label: t('tab_theory'),
            content:
              theory.length === 0 ? (
                <EmptyState icon={<PenLine size={28} />} title={t('empty_theory_title')} description={t('empty_theory_description')} />
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
            label: `${t('tab_practice_prompts')} (${essayPrompts.length})`,
            content:
              essayPrompts.length === 0 ? (
                <EmptyState icon={<PenLine size={28} />} title={t('empty_essays_title')} description={t('empty_essays_description')} />
              ) : (
                <div>
                  <TestLocaleSelector />
                  <div className="space-y-2">
                    {essayPrompts.map((prompt) => {
                      const isOpen = expandedId === prompt.id
                      return (
                        <div key={prompt.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isOpen ? null : prompt.id)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left"
                          >
                            <span className="flex-1 text-sm font-medium text-slate-700">{pick(testLocale, prompt.title)}</span>
                            <ChevronDown
                              size={16}
                              className={clsx('shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')}
                            />
                          </button>
                          {isOpen && (
                            <div className="border-t border-slate-100 px-4 py-4">
                              <EssayRunner prompt={prompt} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ),
          },
          {
            id: 'historial',
            label: `${t('tab_history')}${essayAttempts.length > 0 ? ` (${essayAttempts.length})` : ''}`,
            content: <EssayHistory attempts={essayAttempts} prompts={essayPrompts} />,
          },
        ]}
      />
    </div>
  )
}
