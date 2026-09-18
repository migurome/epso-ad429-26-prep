import { useState } from 'react'
import { LogIn, LogOut, RefreshCw, UserPlus } from 'lucide-react'
import clsx from 'clsx'
import { useSyncStore, type SyncStatus } from '../lib/syncStore'
import { runSync, signIn, signOut, signUp } from '../lib/syncEngine'
import { useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { DictKey } from '../lib/dictionary'

// La sincronización automática, vista desde Ajustes.
//
// Esta tarjeta no decide nada: sólo cuenta en qué punto está y pide pasadas al
// motor (`syncEngine.ts`). Tiene tres caras, y son tres porque lo que el
// candidato puede hacer en cada una es distinto:
//
//   · sin configurar, no hay nada que hacer y lo que toca es decirlo;
//   · sin entrar, entrar —o crear la cuenta la primera vez—;
//   · dentro, sincronizar ahora, salir y apagar el guardado automático.
//
// No hay nada que pegar en ningún sitio: la URL y la clave pública van
// compiladas, y así la sincronización queda encendida en todos los navegadores
// a la vez.

const STATUS_TEXT: Record<SyncStatus, DictKey> = {
  off: 'sync_status_off',
  'signed-out': 'sync_status_signed_out',
  'signing-in': 'sync_status_signing_in',
  ready: 'sync_status_ready',
  syncing: 'sync_status_syncing',
  error: 'sync_status_error',
}

const STATUS_DOT: Record<SyncStatus, string> = {
  off: 'bg-slate-300',
  'signed-out': 'bg-amber-400',
  'signing-in': 'bg-amber-400',
  ready: 'bg-emerald-500',
  syncing: 'bg-emerald-400',
  error: 'bg-red-500',
}

export function SyncCard() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const auto = useSyncStore((s) => s.auto)
  const status = useSyncStore((s) => s.status)
  const error = useSyncStore((s) => s.error)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)
  const email = useSyncStore((s) => s.email)
  const setAuto = useSyncStore((s) => s.setAuto)

  const [draftEmail, setDraftEmail] = useState('')
  const [password, setPassword] = useState('')

  const busy = status === 'signing-in' || status === 'syncing'
  // La cara de la tarjeta la decide quién está dentro, no el estado: un fallo
  // al guardar deja la sesión intacta y sería absurdo volver a pedir la
  // contraseña por eso.
  const signedIn = email !== null
  const canSubmit = draftEmail.trim() !== '' && password !== '' && !busy

  const buttonClass =
    'inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-accent hover:text-accent disabled:opacity-50'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={clsx('inline-block h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[status])}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-slate-800">{t(STATUS_TEXT[status])}</span>
        <span className="text-xs text-slate-500">
          {lastSyncAt
            ? t('sync_last', {
                when: new Date(lastSyncAt).toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB'),
              })
            : t('sync_never')}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {status === 'off' ? (
        <p className="mt-4 text-xs text-slate-500">{t('sync_off_hint')}</p>
      ) : signedIn ? (
        <>
          <p className="mt-3 text-sm text-slate-700">{t('sync_who', { email })}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runSync()}
              disabled={busy}
              className={buttonClass}
            >
              <RefreshCw size={15} />
              {t('sync_now')}
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={busy}
              className={buttonClass}
            >
              <LogOut size={15} />
              {t('sync_out')}
            </button>
          </div>

          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-accent"
            />
            <span>
              <span className="block text-sm text-slate-700">{t('sync_auto')}</span>
              <span className="block text-xs text-slate-500">{t('sync_auto_hint')}</span>
            </span>
          </label>

          <p className="mt-4 text-xs text-slate-400">{t('sync_private')}</p>
        </>
      ) : (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            void signIn(draftEmail, password)
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {t('sync_email')}
              </span>
              <input
                type="email"
                autoComplete="username"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {t('sync_password')}
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!canSubmit} className={buttonClass}>
              <LogIn size={15} />
              {t('sync_in')}
            </button>
            <button
              type="button"
              onClick={() => void signUp(draftEmail, password)}
              disabled={!canSubmit}
              className={buttonClass}
            >
              <UserPlus size={15} />
              {t('sync_up')}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">{t('sync_private')}</p>
        </form>
      )}
    </div>
  )
}
