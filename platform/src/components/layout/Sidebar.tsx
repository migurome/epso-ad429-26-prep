import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import {
  LayoutDashboard,
  BrainCircuit,
  ListChecks,
  PenLine,
  Link2,
  BarChart3,
  X,
} from 'lucide-react'
import { COMPETITION } from '../../data/competition'
import { useLocaleStore } from '../../lib/localeStore'
import { useT } from '../../lib/useT'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  const NAV_ITEMS = [
    { to: '/', label: t('nav_dashboard'), icon: LayoutDashboard, end: true },
    { to: '/razonamiento', label: t('nav_reasoning'), icon: BrainCircuit },
    { to: '/campo', label: t('nav_field_mcq'), icon: ListChecks },
    { to: '/eufte', label: t('nav_eufte'), icon: PenLine },
    { to: '/recursos', label: t('nav_resources'), icon: Link2 },
    { to: '/progreso', label: t('nav_progress'), icon: BarChart3 },
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 transform flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out',
          'md:static md:z-auto md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-eu-blue">
              {COMPETITION.grade} · {COMPETITION.id}
            </p>
            <h1 className="mt-1 text-sm font-semibold text-slate-800">{t('app_name')}</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close_menu')}
            className="-mr-1.5 -mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-eu-blue text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-xs" aria-label={t('language_selector_label')}>
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={clsx(
                  'flex-1 rounded-md py-1 font-semibold uppercase transition-colors',
                  locale === l ? 'bg-white text-eu-blue shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            {t('sidebar_footer', { posts: COMPETITION.postsTotal })}
          </p>
        </div>
      </aside>
    </>
  )
}
