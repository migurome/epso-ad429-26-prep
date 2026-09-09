import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { UserMenu } from './UserMenu'
import { LoadingFallback } from '../LoadingFallback'
import { useCompetitionStore } from '../../lib/competitionStore'
import { useStudyTracker } from '../../lib/useStudyTracker'
import { useT } from '../../lib/useT'

export function Layout() {
  const t = useT()
  const location = useLocation()
  const competition = useCompetitionStore((s) => s.competition)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Cuenta el tiempo de uso de la plataforma, que es lo que alimenta el
  // objetivo semanal del calendario. Va aquí y no en cada página para que
  // siga contando al navegar entre ellas.
  useStudyTracker()

  // El color de acento de toda la interfaz cuelga de este atributo (ver
  // src/index.css): azul para la AD7, rojo para la AD8. Va en <html> y no en un
  // contenedor para que también alcance a lo que se pinta fuera del árbol.
  useEffect(() => {
    document.documentElement.dataset.competition = competition
  }, [competition])

  // Cierra el menú móvil automáticamente al cambiar de ruta (p.ej. tras
  // navegar por un enlace), para no dejar el overlay abierto por accidente.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* La barra superior existe en todos los tamaños porque la sección de
            usuario vive en ella. En móvil lleva además el botón del menú y el
            nombre, que en escritorio ya los da la barra lateral. */}
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t('open_menu')}
            className="-ml-1.5 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold text-slate-800 md:hidden">{t('app_name')}</span>
          <div className="ml-auto">
            <UserMenu />
          </div>
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
