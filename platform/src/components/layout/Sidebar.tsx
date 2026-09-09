import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  LayoutDashboard,
  BrainCircuit,
  ListChecks,
  GraduationCap,
  PenLine,
  Link2,
  ChevronRight,
  X,
} from 'lucide-react'
import { CompetitionSelector } from '../CompetitionSelector'
import { useCompetition } from '../../lib/competitionStore'
import { useLocaleStore } from '../../lib/localeStore'
import { usePreferredField } from '../../lib/studyStore'
import { hasCourse } from '../../data/contentLoader'
import { useT } from '../../lib/useT'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const competition = useCompetition()
  const field = usePreferredField()
  const location = useLocation()

  // La formación no es una fase de la oposición: es material de apoyo del test
  // de ámbito, así que cuelga de él en vez de competir a su altura. Existe hoy
  // sólo para ciberseguridad; con cualquier otro ámbito, Field-Related MCQ no
  // tiene nada dentro y se comporta como un enlace normal, sin desplegable.
  const fieldChildren = hasCourse(field)
    ? [{ to: '/formacion', label: t('nav_course'), icon: GraduationCap }]
    : []
  const inFieldSection =
    location.pathname.startsWith('/campo') || location.pathname.startsWith('/formacion')
  const [fieldOpen, setFieldOpen] = useState(inFieldSection)
  // Entrar en la sección la abre; salir no la cierra, para no deshacer al
  // navegar lo que el candidato haya abierto a mano.
  useEffect(() => {
    if (inFieldSection) setFieldOpen(true)
  }, [inFieldSection])

  const NAV_ITEMS = [
    { to: '/', label: t('nav_dashboard'), icon: LayoutDashboard, end: true },
    { to: '/razonamiento', label: t('nav_reasoning'), icon: BrainCircuit },
    { to: '/campo', label: t('nav_field_mcq'), icon: ListChecks, children: fieldChildren },
    { to: '/eufte', label: t('nav_eufte'), icon: PenLine },
    { to: '/recursos', label: t('nav_resources'), icon: Link2 },
  ]

  // Lo del candidato —progreso, calendario, día del examen, ajustes y la
  // verificación— vive en el menú de usuario de la barra superior. Aquí se
  // quedan sólo las fases de la oposición, que es lo que se abre a diario.

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
          <div className="min-w-0 flex-1">
            <CompetitionSelector className="mb-2" />
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-accent">
              {competition.id}
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
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, children }) => (
            <div key={to}>
              <div className="flex items-center gap-1">
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    clsx(
                      'flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
                {children && children.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFieldOpen((v) => !v)}
                    aria-expanded={fieldOpen}
                    aria-label={t('toggle_subsection', { section: label })}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <ChevronRight
                      size={15}
                      className={clsx('transition-transform', fieldOpen && 'rotate-90')}
                    />
                  </button>
                )}
              </div>

              {children && children.length > 0 && fieldOpen && (
                // La sangría y la guía vertical dicen a qué cuelga esto, sin
                // necesidad de repetir el nombre del padre en cada hijo.
                <div className="mt-1 ml-5 space-y-1 border-l border-slate-200 pl-3">
                  {children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-accent/10 font-semibold text-accent'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                        )
                      }
                    >
                      <child.icon size={16} />
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
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
                  locale === l ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {/* La versión, no el recuento de plazas: las plazas ya están en la
              cabecera de cada ámbito, y lo que aquí hace falta saber es qué
              versión de la plataforma se está usando. */}
          <p className="text-xs tabular-nums text-slate-400">
            {t('app_version', { version: __APP_VERSION__ })}
          </p>
        </div>
      </aside>
    </>
  )
}
