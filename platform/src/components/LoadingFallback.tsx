import { Loader2 } from 'lucide-react'
import { useT } from '../lib/useT'

/** Se muestra mientras el chunk de contenido de la página (preguntas/teoría,
 * cargadas bajo demanda vía contentLoader.ts) todavía se está descargando. */
export function LoadingFallback() {
  const t = useT()
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-400">
      <Loader2 size={18} className="animate-spin" />
      {t('loading')}
    </div>
  )
}
