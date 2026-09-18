import { useState } from 'react'
import { Lock, LoaderCircle, MailCheck } from 'lucide-react'
import clsx from 'clsx'
import type { SignInResult, SignUpResult } from '../lib/accountEngine'
import { checkEmail, type RequestOutcome } from '../lib/access'
import { useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'

// La portada de acceso, con tres cosas distintas que se pueden hacer desde
// ella. Antes eran dos, y el orden de la segunda estaba mal:
//
//   · **Entrar**, con correo y contraseña.
//   · **Pedir acceso**, dejando sólo el correo. No crea ninguna cuenta: deja
//     una fila en la cola del administrador. Elegir una contraseña aquí sería
//     pedirla para una cuenta que quizá nunca se apruebe —y es la contraseña
//     que la gente reutiliza y olvida—, además de dejar en `auth.users` una
//     cuenta muerta por cada persona a la que se diga que no.
//   · **Poner la contraseña**, cuando ya hay un sí. Esto sí crea la cuenta, y
//     la base la deja aprobada de entrada porque encuentra la solicitud con el
//     visto bueno dado.
//
// Los tres modos viven en el mismo formulario y no en tres pantallas porque
// quien llega no sabe en cuál está: se equivoca, lee el texto de debajo y
// cambia con un clic sin perder lo escrito.
//
// El fallo se enseña tal como lo cuenta Supabase. Es lo mismo que hace el resto
// de la web con los errores del servidor: un texto que se puede pegar en una
// consulta vale más que uno bonito que esconde la causa.
//
// Las tres acciones entran por props y no se llama a Supabase desde aquí: así
// las ramas que salen bien y las que fallan se prueban sin red y sin cuenta. El
// cableado está en `pages/LoginPage.tsx`.

type Mode = 'in' | 'ask' | 'new'

interface Props {
  onSignIn: (email: string, password: string) => Promise<SignInResult>
  onSignUp: (email: string, password: string) => Promise<SignUpResult>
  onRequest: (email: string) => Promise<RequestOutcome>
}

export function LoginForm({ onSignIn, onSignUp, onRequest }: Props) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  const [mode, setMode] = useState<Mode>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<'asked' | 'created' | null>(null)

  const asking = mode === 'ask'
  // Pedir acceso no lleva contraseña; entrar y crearla, sí.
  const canSubmit = email.trim() !== '' && (asking || password !== '') && !checking

  function go(next: Mode) {
    setMode(next)
    setError(null)
    setPanel(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)

    if (asking) {
      // Se comprueba la forma del correo aquí y no en el botón: un botón
      // apagado no dice qué le pasa a lo escrito, y la tabla contestaría con
      // un error de Postgres ilegible.
      const read = checkEmail(email)
      if (!read.ok) {
        setError(t('login_ask_bad_email'))
        return
      }
      setChecking(true)
      const result = await onRequest(read.email)
      setChecking(false)
      if (result.ok) setPanel('asked')
      else setError(result.message)
      return
    }

    if (mode === 'new') {
      setChecking(true)
      const result = await onSignUp(email, password)
      setChecking(false)
      if (!result.ok) {
        setError(result.message)
        setPassword('')
        return
      }
      // Salir bien no siempre es estar dentro. Supabase contesta que sí y no
      // devuelve sesión si el proyecto exige confirmar el correo, y también
      // —callándoselo, para no delatar quién está registrado— si esa cuenta ya
      // existía. Sin este aviso la persona pulsa y no ocurre nada visible, que
      // es la manera más rápida de que crea que la web está rota.
      if (!result.inside) setPanel('created')
      return
    }

    setChecking(true)
    const result = await onSignIn(email, password)
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
            {panel ? <MailCheck size={22} aria-hidden="true" /> : <Lock size={22} aria-hidden="true" />}
          </span>
        </div>

        <h1 className="text-center text-lg font-semibold text-slate-800">{t('app_name')}</h1>
        <p className="mt-1 text-center text-sm text-slate-500">{t('login_subtitle')}</p>

        {panel ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <h2 className="text-sm font-semibold text-slate-800">
              {t(panel === 'asked' ? 'login_ask_sent_title' : 'login_created_title')}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t(panel === 'asked' ? 'login_ask_sent_body' : 'login_created_body')}
            </p>
            <button
              type="button"
              onClick={() => go('in')}
              className="mt-5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent"
            >
              {t('login_ask_back')}
            </button>
          </div>
        ) : (
          <Form
            mode={mode}
            email={email}
            password={password}
            checking={checking}
            error={error}
            canSubmit={canSubmit}
            onEmail={setEmail}
            onPassword={setPassword}
            onSubmit={submit}
            onMode={go}
          />
        )}

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

/** El formulario propiamente dicho: lo que cambia entre los tres modos. */
function Form({
  mode,
  email,
  password,
  checking,
  error,
  canSubmit,
  onEmail,
  onPassword,
  onSubmit,
  onMode,
}: {
  mode: Mode
  email: string
  password: string
  checking: boolean
  error: string | null
  canSubmit: boolean
  onEmail: (value: string) => void
  onPassword: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onMode: (next: Mode) => void
}) {
  const t = useT()
  const asking = mode === 'ask'

  const submitText =
    mode === 'ask' ? 'login_ask_submit' : mode === 'new' ? 'login_create_submit' : 'login_submit'
  const noteText =
    mode === 'ask' ? 'login_ask_note' : mode === 'new' ? 'login_create_note' : 'login_note'

  return (
    <>
      {/* `noValidate` a propósito: el navegador rechazaría el correo antes
          de llegar aquí, con un globo en SU idioma y con una regla más
          floja que la nuestra —acepta «a@b», sin punto—. El aviso lo da
          la web, traducido, y así además se puede probar. */}
      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">{t('login_email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            disabled={checking}
            className={inputClass}
          />
        </label>

        {!asking && (
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {t('login_password')}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => onPassword(e.target.value)}
              autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
              disabled={checking}
              className={inputClass}
            />
          </label>
        )}

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
          {checking ? t('login_checking') : t(submitText)}
        </button>

        {/* Desde entrar se llega a los otros dos; desde ellos, de vuelta. Sin
            perder lo escrito: quien se equivoca de sitio no reescribe nada. */}
        <div className="mt-3 flex flex-col gap-1.5">
          {mode === 'in' ? (
            <>
              <button type="button" onClick={() => onMode('ask')} disabled={checking} className={linkClass}>
                {t('login_ask')}
              </button>
              <button type="button" onClick={() => onMode('new')} disabled={checking} className={linkClass}>
                {t('login_create')}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => onMode('in')} disabled={checking} className={linkClass}>
              {t('login_have_account')}
            </button>
          )}
        </div>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">{t(noteText)}</p>
    </>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-accent focus:outline-none disabled:bg-slate-50'
const linkClass =
  'w-full text-center text-xs text-slate-500 underline-offset-2 hover:underline disabled:opacity-60'
