import { useEffect, useState } from 'react'
import { Cloud, CloudAlert, CloudOff, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useSyncStore, type SyncStatus } from '../../lib/syncStore'
import { runSync } from '../../lib/syncEngine'
import { freshnessOf } from '../../lib/time'
import { useLocaleStore } from '../../lib/localeStore'
import { useT } from '../../lib/useT'
import type { DictKey } from '../../lib/dictionary'

// Guardar ahora, y cuánto hace que se guardó, al lado del perfil.
//
// Esto ya existía en Ajustes, que es exactamente el sitio donde nadie mira
// cuando lo que quiere es asegurarse de que su trabajo está a salvo. Aquí está
// a la vista mientras se estudia, y responde sola a la única pregunta que
// importa: ¿esto que acabo de hacer se ha guardado?
//
// El texto se recalcula cada medio minuto. Sin eso diría «Guardado ahora»
// eternamente, porque nada vuelve a pintar la cabecera mientras se estudia, y
// una hora después seguiría mintiendo con la misma cara.

const TONE: Record<SyncStatus, string> = {
  off: 'text-slate-300',
  idle: 'text-slate-500',
  syncing: 'text-emerald-600',
  ready: 'text-emerald-600',
  error: 'text-red-600',
}

const UNIT_KEY = {
  never: 'sync_ago_never',
  now: 'sync_ago_now',
  minutes: 'sync_ago_minutes',
  hours: 'sync_ago_hours',
  days: 'sync_ago_days',
} satisfies Record<string, DictKey>

/** Cada medio minuto, para que «hace 3 min» siga siendo verdad. */
const TICK_MS = 30_000

export function SyncButton() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const status = useSyncStore((s) => s.status)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(timer)
  }, [])

  // Sin configuración no hay nada que guardar ni nada que prometer.
  if (status === 'off') return null

  const fresh = freshnessOf(lastSyncAt, now)
  const label =
    fresh.unit === 'never' || fresh.unit === 'now'
      ? t(UNIT_KEY[fresh.unit])
      : t(UNIT_KEY[fresh.unit], { n: fresh.value })

  const busy = status === 'syncing'
  const Icon = status === 'error' ? CloudAlert : status === 'ready' ? Cloud : CloudOff

  return (
    <button
      type="button"
      onClick={() => void runSync()}
      disabled={busy}
      // El nombre accesible lleva las dos cosas: lo que hace el botón y en qué
      // punto está. Con sólo el texto visible no diría qué hace, y con sólo la
      // acción se perdería el estado, que es justo lo que se viene a mirar.
      aria-label={`${t('sync_now')} — ${label}`}
      // La hora exacta va en el título: el texto visible dice «hace 3 min»,
      // que es lo que se quiere de un vistazo, y quien necesite el minuto
      // exacto lo tiene a un puntero de distancia.
      title={
        lastSyncAt
          ? t('sync_button_hint', {
              when: new Date(lastSyncAt).toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB'),
            })
          : t('sync_button_hint_never')
      }
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium',
        'transition-colors hover:bg-slate-100 disabled:opacity-60',
        TONE[status],
      )}
    >
      {busy ? (
        <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <Icon size={16} aria-hidden="true" />
      )}
      {/* En un móvil estrecho la cabecera ya lleva el menú, el nombre y el
          perfil: el texto se retira y queda el icono, que sigue diciendo el
          estado por su forma y su color. */}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
