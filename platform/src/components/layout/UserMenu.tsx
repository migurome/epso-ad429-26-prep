import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { BarChart3, CalendarDays, Settings, ShieldCheck, User, Video } from 'lucide-react'
import { useStudyStore } from '../../lib/studyStore'
import { useT } from '../../lib/useT'

// La sección de usuario: lo que es del candidato y no de la oposición. Su
// progreso, su calendario, cómo será su día de examen, y los ajustes. Vivían
// mezclados con las fases en la barra lateral, donde competían por atención con
// el material de estudio, que es lo que se abre todos los días.

/** Iniciales del nombre configurado; hasta dos, como en cualquier avatar. */
export function initialsOf(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function UserMenu() {
  const t = useT()
  const location = useLocation()
  const profile = useStudyStore((s) => s.profile)
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  const initials = initialsOf(profile.displayName)

  const SECTIONS = [
    [
      { to: '/progreso', label: t('nav_progress'), icon: BarChart3 },
      { to: '/calendario', label: t('nav_calendar'), icon: CalendarDays },
      { to: '/dia-del-examen', label: t('nav_test_day'), icon: Video },
    ],
    [
      { to: '/ajustes', label: t('nav_settings'), icon: Settings },
      { to: '/verificacion', label: t('nav_selfcheck'), icon: ShieldCheck },
    ],
  ]

  // Al navegar el menú sobra: la página ya cambió.
  useEffect(() => setOpen(false), [location.pathname])

  // Pulsar fuera o Escape lo cierra. Sin esto, un menú abierto tapa la esquina
  // de la página y sólo se quita volviendo a pulsar el mismo botón.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!container.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('user_menu_label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
          open
            ? 'border-accent bg-accent text-white'
            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900',
        )}
      >
        {initials || <User size={17} aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-800">
              {profile.displayName || t('user_menu_anonymous')}
            </p>
            <p className="truncate text-xs text-slate-400">
              {profile.email || t('user_menu_set_name')}
            </p>
          </div>

          {SECTIONS.map((section, i) => (
            <div key={i} className={clsx('p-1.5', i > 0 && 'border-t border-slate-100')}>
              {section.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  role="menuitem"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-accent/10 font-semibold text-accent'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
