import { useState } from 'react'
import { Lock, LoaderCircle } from 'lucide-react'
import clsx from 'clsx'
import type { SignInResult } from '../lib/accountEngine'
import { useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'

// La portada de acceso.
//
// Antes esto comparaba con un usuario y una contraseña compilados en el
// paquete, y lo decía sin rodeos: era un cerrojo de puerta mosquitera. Ahora es
// una cuenta de verdad, con su fila en la base de datos y su progreso propio.
//
// Crear la cuenta **no da acceso**: deja una solicitud en la cola. Eso tiene
// que estar escrito aquí, antes de pulsar, porque alguien que se registre y
// aterrice en una pantalla de espera sin haberlo leído pensará que la web se ha
// roto.
//
// El fallo se enseña tal como lo cuenta Supabase. Es lo mismo que hace el resto
// de la web con los errores del servidor: un texto que se puede pegar en una
// consulta vale más que uno bonito que esconde la causa.
//
// Entrar y registrarse entran por props, y no se llama a Supabase desde aquí:
// así las dos ramas —la que sale bien y la que falla— se prueban sin red y sin
// cuenta. El cableado está en `pages/LoginPage.tsx`.
interface Props {
  onSignIn: (email: string, password: string) => Promise<SignInResult>
  onSignUp: (email: string, password: string) => Promise<SignInResult>
}

export function LoginForm({ onSignIn, onSignUp }: Props) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email.trim() !== '' && password !== '' && !checking

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setChecking(true)
    const result = creating ? await onSignUp(email, password) : await onSignIn(email, password)
    setChecking(false)
    // Si sale bien no hay nada que hacer aquí: el almacén de cuenta cambia de
    // fase y esta pantalla deja de estar montada.
    if (!result.ok) {
      setError(result.message)
      setPassword('')
    }
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
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {t('login_email')}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={checking}
              className={inputClass}
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {t('login_password')}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={creating ? 'new-password' : 'current-password'}
              disabled={checking}
              className={inputClass}
            />
          </label>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className={clsx(
              'mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5',
              'text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60',
            )}
          >
            {checking && <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />}
            {checking
              ? t('login_checking')
              : creating
                ? t('login_create_submit')
                : t('login_submit')}
          </button>

          <button
            type="button"
            onClick={() => {
              setCreating(!creating)
              setError(null)
            }}
            disabled={checking}
            className="mt-3 w-full text-center text-xs text-slate-500 underline-offset-2 hover:underline disabled:opacity-60"
          >
            {creating ? t('login_have_account') : t('login_create')}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">{t('login_note')}</p>

        <div className="mt-6 flex justify-center gap-2">
          {(['es', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={clsx(
                'rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors',
                locale === code ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {code}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-accent focus:outline-none disabled:bg-slate-50'
