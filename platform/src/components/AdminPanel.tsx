import { useRef } from 'react'
import { Check, Download, Trash2, Upload, UserX } from 'lucide-react'
import clsx from 'clsx'
import { can, pendingCount, sortAccounts, type AdminAction } from '../lib/admin'
import {
  canRequest,
  hasAccountFor,
  sortRequests,
  waitingRequests,
  type RequestAction,
} from '../lib/access'

/** Todo lo que un administrador puede hacer sobre una cuenta ajena. */
const ACTIONS: AdminAction[] = ['approve', 'revoke', 'delete', 'wipe', 'download', 'restore']
import type { AccessRequest, Account, AccountStatus, RequestStatus } from '../types/account'
import { useT } from '../lib/useT'
import type { DictKey } from '../lib/dictionary'

// El perfil de administrador: quién entra, y el progreso de cada uno.
//
// Recibe todo por props y no toca la base de datos: así las cinco acciones se
// prueban sin red y sin cuentas. El cableado está en `pages/AdminPage.tsx`.
//
// Dos cosas del diseño que no son estéticas:
//
//   · **Quitar el acceso y borrar los datos están separados**, hasta en el
//     color. Son irreversibles de maneras muy distintas: de una se vuelve
//     aprobando otra vez, de la otra no se vuelve.
//   · **La pregunta de «¿seguro?» vive aquí y no en el cableado.** No es donde
//     más bonito queda, es donde se puede probar: una confirmación que ningún
//     test ve es una confirmación que alguien borrará sin que nada falle. Y
//     lleva dentro el correo, porque un «¿estás seguro?» sin nombre es lo que
//     hace que se confirme sin leer.
//   · **Sobre uno mismo no se ofrece nada.** Un administrador que se revoca
//     deja el sistema sin nadie capaz de aprobar a nadie, y eso no se arregla
//     desde la web. La fila propia se marca y se queda sin botones.

const STATUS_TEXT: Record<AccountStatus, DictKey> = {
  pending: 'admin_status_pending',
  approved: 'admin_status_approved',
  revoked: 'admin_status_revoked',
}

const STATUS_TONE: Record<AccountStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  revoked: 'bg-slate-200 text-slate-600',
}

interface Props {
  me: Account
  accounts: Account[]
  busy: boolean
  error: string | null
  notice: string | null
  onApprove: (target: Account) => void
  onRevoke: (target: Account) => void
  onDelete: (target: Account) => void
  onWipe: (target: Account) => void
  onDownload: (target: Account) => void
  onRestore: (target: Account, file: File) => void
  requests: AccessRequest[]
  onApproveRequest: (request: AccessRequest) => void
  onRejectRequest: (request: AccessRequest) => void
  onRemoveRequest: (request: AccessRequest) => void
}

export function AdminPanel({
  me,
  accounts,
  busy,
  error,
  notice,
  onApprove,
  onRevoke,
  onDelete,
  onWipe,
  onDownload,
  onRestore,
  requests,
  onApproveRequest,
  onRejectRequest,
  onRemoveRequest,
}: Props) {
  const t = useT()
  const sorted = sortAccounts(accounts)
  // Dos colas y un solo número: a quien mira le da igual de cuál de las dos
  // viene; lo que quiere saber al abrir la página es si tiene algo que hacer.
  const waiting = pendingCount(accounts) + waitingRequests(requests)

  return (
    <div>
      <p className="text-sm text-slate-600">
        {waiting > 0 ? t('admin_waiting', { n: waiting }) : t('admin_none_waiting')}
      </p>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {notice && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>
      )}

      <h2 className={headingClass}>{t('admin_requests_title')}</h2>
      {requests.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t('admin_requests_empty')}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {sortRequests(requests).map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              hasAccount={hasAccountFor(request.email, accounts)}
              busy={busy}
              onApprove={onApproveRequest}
              onReject={onRejectRequest}
              onRemove={onRemoveRequest}
            />
          ))}
        </ul>
      )}

      <h2 className={headingClass}>{t('admin_accounts_title')}</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {sorted.map((account) => (
          <AccountRow
            key={account.userId}
            account={account}
            me={me}
            busy={busy}
            onApprove={onApprove}
            onRevoke={onRevoke}
            onDelete={onDelete}
            onWipe={onWipe}
            onDownload={onDownload}
            onRestore={onRestore}
          />
        ))}
      </ul>

      {accounts.length === 0 && <p className="mt-5 text-sm text-slate-500">{t('admin_empty')}</p>}
    </div>
  )
}

function AccountRow({
  account,
  me,
  busy,
  onApprove,
  onRevoke,
  onDelete,
  onWipe,
  onDownload,
  onRestore,
}: { account: Account; me: Account } & Omit<
  Props,
  'me' | 'accounts' | 'error' | 'notice' | 'requests' | 'onApproveRequest' | 'onRejectRequest' | 'onRemoveRequest'
>) {
  const t = useT()
  const file = useRef<HTMLInputElement>(null)
  const isMe = me.userId === account.userId
  const confirmed = (key: DictKey) => window.confirm(t(key, { email: account.email }))
  // Qué se puede hacer lo dice `can()` y sólo `can()`. Antes esto además
  // comprobaba por su cuenta si la fila era la propia, y esa segunda opinión
  // hacía que la guarda de `can()` no protegiera nada: quitarla no cambiaba la
  // pantalla, y una mutación lo demostró.
  const allowed = (action: AdminAction) => can(action, me, account).ok
  const anything = ACTIONS.some(allowed)

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all text-sm font-medium text-slate-800">{account.email}</span>
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_TONE[account.status],
          )}
        >
          {t(STATUS_TEXT[account.status])}
        </span>
        {account.role === 'admin' && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-white">
            {t('admin_role_admin')}
          </span>
        )}
        {isMe && <span className="text-xs text-slate-400">{t('admin_this_is_you')}</span>}
      </div>

      {!anything ? (
        // Sin botones y con el motivo escrito: un botón desactivado sin
        // explicación desconcierta más que su ausencia.
        <p className="mt-3 text-xs text-slate-500">{t('admin_self_note')}</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {allowed('approve') && (
              <button type="button" onClick={() => onApprove(account)} disabled={busy} className={okClass}>
                <Check size={14} />
                {t('admin_approve')}
              </button>
            )}
            {allowed('revoke') && (
              <button
                type="button"
                onClick={() => confirmed('admin_confirm_revoke') && onRevoke(account)}
                disabled={busy}
                className={plainClass}
              >
                <UserX size={14} />
                {t('admin_revoke')}
              </button>
            )}
            {allowed('download') && (
            <button
              type="button"
              onClick={() => onDownload(account)}
              disabled={busy}
              className={plainClass}
            >
              <Download size={14} />
              {t('admin_download')}
            </button>
            )}
            {allowed('restore') && (
            <button
              type="button"
              onClick={() => file.current?.click()}
              disabled={busy}
              className={plainClass}
            >
              <Upload size={14} />
              {t('admin_restore')}
            </button>
            )}
          </div>

          {/* Borrar va aparte y en rojo: de revocar se vuelve aprobando otra
              vez, de esto no se vuelve. */}
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {allowed('wipe') && (
            <button
              type="button"
              onClick={() => confirmed('admin_confirm_wipe') && onWipe(account)}
              disabled={busy}
              className={dangerClass}
            >
              <Trash2 size={14} />
              {t('admin_wipe')}
            </button>
            )}
            {allowed('delete') && (
            <button
              type="button"
              onClick={() => confirmed('admin_confirm_delete') && onDelete(account)}
              disabled={busy}
              className={dangerClass}
            >
              <Trash2 size={14} />
              {t('admin_delete')}
            </button>
            )}
          </div>

          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            aria-label={t('admin_restore_for', { email: account.email })}
            className="hidden"
            onChange={(e) => {
              const chosen = e.target.files?.[0]
              // El input se vacía siempre: si no, elegir el mismo fichero dos
              // veces seguidas no dispara `change` y el segundo intento no
              // haría nada sin decir por qué.
              e.target.value = ''
              if (chosen) onRestore(account, chosen)
            }}
          />
        </>
      )}
    </li>
  )
}

const base =
  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50'
const plainClass = `${base} border-slate-200 text-slate-700 hover:border-accent hover:text-accent`
const okClass = `${base} border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500`
const dangerClass = `${base} border-red-200 text-red-700 hover:border-red-500`

// La cola de solicitudes: correos que han llamado a la puerta antes de que
// exista ninguna cuenta.
//
// El color no repite el de las cuentas a propósito. «Con el visto bueno» no es
// «con acceso»: es un sí que todavía no ha usado nadie, y mientras esa persona
// no vuelva a poner su contraseña no hay cuenta ninguna. Pintarlo del mismo
// verde haría creer que ya está dentro.
const REQ_STATUS_TEXT: Record<RequestStatus, DictKey> = {
  pending: 'admin_req_status_pending',
  approved: 'admin_req_status_approved',
  rejected: 'admin_req_status_rejected',
}

const REQ_STATUS_TONE: Record<RequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  rejected: 'bg-slate-200 text-slate-600',
}

function RequestCard({
  request,
  hasAccount,
  busy,
  onApprove,
  onReject,
  onRemove,
}: {
  request: AccessRequest
  hasAccount: boolean
  busy: boolean
  onApprove: (request: AccessRequest) => void
  onReject: (request: AccessRequest) => void
  onRemove: (request: AccessRequest) => void
}) {
  const t = useT()
  // Igual que en las cuentas: lo que se puede hacer lo dice el módulo puro y
  // sólo él. Una segunda opinión aquí dejaría su guarda sin proteger nada.
  const allowed = (action: RequestAction) => canRequest(action, request, hasAccount).ok

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all text-sm font-medium text-slate-800">{request.email}</span>
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            REQ_STATUS_TONE[request.status],
          )}
        >
          {t(REQ_STATUS_TEXT[request.status])}
        </span>
      </div>

      {/* Un sí dado no es un sí usado, y saber en cuál de las dos está esa
          persona es lo que distingue «se le olvidó volver» de «ya está dentro». */}
      {request.status === 'approved' && (
        <p className="mt-2 text-xs text-slate-500">
          {request.claimedAt ? t('admin_req_claimed') : t('admin_req_unclaimed')}
        </p>
      )}

      {hasAccount && <p className="mt-2 text-xs text-slate-500">{t('admin_req_account_note')}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {allowed('approve') && (
          <button type="button" onClick={() => onApprove(request)} disabled={busy} className={okClass}>
            <Check size={14} />
            {t('admin_req_approve')}
          </button>
        )}
        {allowed('reject') && (
          <button type="button" onClick={() => onReject(request)} disabled={busy} className={plainClass}>
            <UserX size={14} />
            {t('admin_req_reject')}
          </button>
        )}
        {allowed('remove') && (
          <button
            type="button"
            onClick={() =>
              window.confirm(t('admin_req_confirm_remove', { email: request.email })) &&
              onRemove(request)
            }
            disabled={busy}
            className={dangerClass}
          >
            <Trash2 size={14} />
            {t('admin_req_remove')}
          </button>
        )}
      </div>
    </li>
  )
}

const headingClass = 'mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500'
