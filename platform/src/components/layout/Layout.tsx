import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { LoadingFallback } from '../LoadingFallback'
import { useT } from '../../lib/useT'

export function Layout() {
  const t = useT()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Cierra el menú móvil automáticamente al cambiar de ruta (p.ej. tras
  // navegar por un enlace), para no dejar el overlay abierto por accidente.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t('open_menu')}
            className="-ml-1.5 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold text-slate-800">{t('app_name')}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
