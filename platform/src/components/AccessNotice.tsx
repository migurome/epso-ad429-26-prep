import { Clock, LogOut, RefreshCw, ShieldOff, TriangleAlert } from 'lucide-react'
import { useT } from '../lib/useT'
import type { DictKey } from '../lib/dictionary'

// Lo que se ve cuando hay sesión pero no se entra.
//
// Tres motivos distintos y tres textos distintos, porque decirle «no puedes
// entrar» a las tres cosas sería mentir en dos de ellas:
//
//   · **pendiente** — la cuenta existe y espera a una persona. No hay nada roto.
//   · **revocado** — alguien decidió que no. Y hay que decir que el progreso
//     sigue ahí, porque lo primero que se teme es haberlo perdido.
//   · **no se sabe** — la base de datos no contestó. Esto NO es una negativa, y
//     el texto lo dice con esas palabras; lo que toca es reintentar, no pedir
//     permiso a nadie.
//
// Recibe todo por props y no toca ningún almacén: así las tres caras se prueban
// sin sesión, sin red y sin base de datos.

export type AccessNoticeKind = 'pending' | 'revoked' | 'unavailable'

const TITLE: Record<AccessNoticeKind, DictKey> = {
  pending: 'access_pending_title',
  revoked: 'access_revoked_title',
  unavailable: 'access_unavailable_title',
}

const BODY: Record<AccessNoticeKind, DictKey> = {
  pending: 'access_pending_body',
  revoked: 'access_revoked_body',
  unavailable: 'access_unavailable_body',
}

const ICON: Record<AccessNoticeKind, typeof Clock> = {
  pending: Clock,
  revoked: ShieldOff,
  unavailable: TriangleAlert,
}

const TONE: Record<AccessNoticeKind, string> = {
  pending: 'bg-amber-100 text-amber-700',
  revoked: 'bg-red-100 text-red-700',
  unavailable: 'bg-slate-200 text-slate-600',
}

interface Props {
  kind: AccessNoticeKind
  email: string | null
  /** El fallo de la base de datos, tal cual, cuando no se sabe. */
  failure?: string | null
  onRetry: () => void
  onSignOut: () => void
}

export function AccessNotice({ kind, email, failure, onRetry, onSignOut }: Props) {
  const t = useT()
  const Icon = ICON[kind]

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TONE[kind]}`}
          >
            <Icon size={22} aria-hidden="true" />
          </span>
        </div>

        <h1 className="text-lg font-semibold text-slate-800">{t(TITLE[kind])}</h1>
        <p className="mt-3 text-sm text-slate-600">{t(BODY[kind])}</p>

        {/* El motivo técnico sólo cuando lo hay: en una espera normal sería
            ruido, y en un fallo es lo único que permite arreglarlo. */}
        {kind === 'unavailable' && failure && (
          <p className="mt-3 break-words rounded-lg bg-white px-3 py-2 font-mono text-xs text-red-600">
            {failure}
          </p>
        )}

        {email && <p className="mt-4 text-xs text-slate-400">{t('access_signed_in_as', { email })}</p>}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onRetry} className={buttonClass}>
            <RefreshCw size={15} />
            {t('access_retry')}
          </button>
          <button type="button" onClick={onSignOut} className={buttonClass}>
            <LogOut size={15} />
            {t('user_menu_sign_out')}
          </button>
        </div>
      </div>
    </div>
  )
}

const buttonClass =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-accent hover:text-accent'
