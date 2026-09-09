import { useEffect, useRef, useState } from 'react'
import { Lock, LoaderCircle } from 'lucide-react'
import clsx from 'clsx'
import { FAILED_ATTEMPT_DELAY_MS, useAuthStore } from '../lib/authStore'
import { useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'

// La portada de acceso. Un intento fallido bloquea el formulario tres segundos
// antes de decir nada: encadenar intentos a ciegas deja de ser gratis, y el
// candidato legítimo, que falla una vez de cada muchas, apenas lo nota.
export function LoginPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const signIn = useAuthStore((s) => s.signIn)

  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Desmontar con la penalización en curso dejaría el temporizador vivo
  // escribiendo en un componente que ya no existe.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (checking) return
    setError(false)
    if (signIn(user, password)) return
    setChecking(true)
    timer.current = setTimeout(() => {
      setChecking(false)
      setError(true)
      setPassword('')
    }, FAILED_ATTEMPT_DELAY_MS)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
            <Lock size={22} aria-hidden="true" />
          </span>
        </div>

        <h1 className="text-center text-lg font-semibold text-slate-800">{t('app_name')}</h1>
        <p className="mt-1 text-center text-sm text-slate-500">{t('login_subtitle')}</p>

        <form onSubmit={submit} className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">{t('login_user')}</span>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={checking}
              className={inputClass}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">{t('login_password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={checking}
              className={inputClass}
            />
          </label>

          <button
            type="submit"
            disabled={checking}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {checking && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
            {checking ? t('login_checking') : t('login_submit')}
          </button>

          <p
            role="status"
            aria-live="polite"
            className={clsx('mt-3 min-h-4 text-center text-xs', error ? 'text-red-600' : 'text-slate-400')}
          >
            {error ? t('login_error') : checking ? t('login_wait') : ''}
          </p>
        </form>

        <div className="mt-6 flex justify-center">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={clsx(
                  'rounded-md px-3 py-1 font-semibold uppercase transition-colors',
                  locale === l ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">{t('login_note')}</p>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-slate-50 disabled:text-slate-400'
