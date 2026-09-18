import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { AdminPanel } from '../components/AdminPanel'
import { adminRows } from '../lib/adminApi'
import { accessRows } from '../lib/accessApi'
import { decisionFor, progressFilename } from '../lib/admin'
import { requestDecision } from '../lib/access'
import { useAccountStore } from '../lib/accountStore'
import { readSnapshot } from '../lib/backup'
import { downloadText } from '../lib/download'
import type { AccessRequest, Account } from '../types/account'
import { useT } from '../lib/useT'

// El cableado del perfil de administrador con la base de datos.
//
// Lo visible, y todo lo que se puede probar, está en `components/AdminPanel`.
// Aquí viven tres cosas que sí son de esta capa:
//
//   · **La descarga**, que se delega en `download.ts`.
//   · **La validación de lo que se restaura**, antes de escribirlo en la fila
//     de otra persona. Un fichero que no es una copia de esta aplicación no
//     llega a la base: se rechaza aquí.
//
// Lo que NO hace, y es deliberado: restaurar el progreso de alguien no toca el
// de quien está mirando. Se escribe en su fila y nada más; los almacenes de
// este navegador se quedan como están.

const rows = adminRows()
const queue = accessRows()

export function AdminPage() {
  const t = useT()
  const me = useAccountStore((s) => s.account)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [requests, setRequests] = useState<AccessRequest[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      // Las dos listas a la vez: se leen juntas porque se miran juntas, y una
      // sola de ellas cuenta la mitad de la historia.
      const [cuentas, cola] = await Promise.all([rows.list(), queue.list()])
      setAccounts(cuentas)
      setRequests(cola)
      setError(null)
    } catch (e) {
      setError(message(e))
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  /** Todo lo que toca la base pasa por aquí: un sitio para el cerrojo y el fallo. */
  const run = async (what: () => Promise<void>, done: string) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await what()
      setNotice(done)
      await reload()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }

  if (!me) return null

  return (
    <div>
      <PageHeader title={t('admin_title')} description={t('admin_description')} />

      {accounts === null || requests === null ? (
        <p className="text-sm text-slate-500">{error ?? t('admin_loading')}</p>
      ) : (
        <AdminPanel
          me={me}
          accounts={accounts}
          busy={busy}
          error={error}
          notice={notice}
          onApprove={(target) =>
            void run(
              () => rows.decide(target.userId, decisionFor('approved', me, new Date())),
              t('admin_done_approve', { email: target.email }),
            )
          }
          onRevoke={(target) =>
            void run(
              () => rows.decide(target.userId, decisionFor('revoked', me, new Date())),
              t('admin_done_revoke', { email: target.email }),
            )
          }
          onWipe={(target) =>
            void run(
              () => rows.wipeProgress(target.userId),
              t('admin_done_wipe', { email: target.email }),
            )
          }
          onDelete={(target) =>
            void run(
              () => rows.removeProfile(target.userId),
              t('admin_done_delete', { email: target.email }),
            )
          }
          onDownload={(target) =>
            void run(async () => {
              const text = await rows.progressOf(target.userId)
              if (text === null) {
                // No es un fallo: es que esa persona todavía no ha estudiado.
                setNotice(t('admin_no_progress', { email: target.email }))
                return
              }
              downloadText(text, progressFilename(target.email, new Date()))
            }, '')
          }
          requests={requests}
          onApproveRequest={(target) =>
            void run(
              () => queue.decide(target.id, requestDecision('approved', me, new Date())),
              t('admin_done_req_approve', { email: target.email }),
            )
          }
          onRejectRequest={(target) =>
            void run(
              () => queue.decide(target.id, requestDecision('rejected', me, new Date())),
              t('admin_done_req_reject', { email: target.email }),
            )
          }
          onRemoveRequest={(target) =>
            void run(
              () => queue.remove(target.id),
              t('admin_done_req_remove', { email: target.email }),
            )
          }
          onRestore={(target, file) =>
            void run(async () => {
              const text = await file.text()
              const read = readSnapshot(text)
              // Se valida antes de escribir: un fichero ajeno o roto no llega
              // a la fila de nadie.
              if (!read.ok) throw new Error(t('admin_bad_file'))
              await rows.restoreProgress(target.userId, JSON.parse(text))
            }, t('admin_done_restore', { email: target.email }))
          }
        />
      )}
    </div>
  )
}


function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
