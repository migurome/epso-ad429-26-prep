import { useState } from 'react'
import { Cloud, CloudOff, RefreshCw, Unlink } from 'lucide-react'
import clsx from 'clsx'
import { DRIVE_FOLDER, SNAPSHOT_FILE } from '../lib/driveSync'
import { useDriveStore, type DriveStatus } from '../lib/driveStore'
import { connectDrive, disconnectDrive, runSync } from '../lib/driveSyncEngine'
import { resolveClientId } from '../lib/googleConfig'
import { useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { DictKey } from '../lib/dictionary'

// La sincronización automática, vista desde Ajustes.
//
// Esta tarjeta no decide nada: sólo cuenta en qué punto está y pide pasadas al
// motor (`driveSyncEngine.ts`). Lo que sí hace es no esconder los dos límites
// que el candidato tiene que conocer, porque si no acabará pensando que la web
// se ha roto: el permiso de Google caduca cada hora, y el guardado automático
// sólo corre con la pestaña abierta.

const STATUS_TEXT: Record<DriveStatus, DictKey> = {
  off: 'drive_status_off',
  disconnected: 'drive_status_disconnected',
  connecting: 'drive_status_connecting',
  ready: 'drive_status_ready',
  syncing: 'drive_status_syncing',
  error: 'drive_status_error',
}

const STATUS_DOT: Record<DriveStatus, string> = {
  off: 'bg-slate-300',
  disconnected: 'bg-amber-400',
  connecting: 'bg-amber-400',
  ready: 'bg-emerald-500',
  syncing: 'bg-emerald-400',
  error: 'bg-red-500',
}

export function DriveSyncCard() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const clientId = useDriveStore((s) => s.clientId)
  const auto = useDriveStore((s) => s.auto)
  const status = useDriveStore((s) => s.status)
  const error = useDriveStore((s) => s.error)
  const lastSyncAt = useDriveStore((s) => s.lastSyncAt)
  const setClientId = useDriveStore((s) => s.setClientId)
  const setAuto = useDriveStore((s) => s.setAuto)

  const [draft, setDraft] = useState(clientId)
  const configured = resolveClientId(clientId) !== ''
  const busy = status === 'connecting' || status === 'syncing'

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
            ? t('drive_last_sync', {
                when: new Date(lastSyncAt).toLocaleString(locale === 'es' ? 'es-ES' : 'en-GB'),
              })
            : t('drive_never_synced')}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {configured ? (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            {status === 'ready' ? (
              <button
                type="button"
                onClick={() => void runSync()}
                disabled={busy}
                className={buttonClass}
              >
                <RefreshCw size={15} />
                {t('drive_sync_now')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void connectDrive()}
                disabled={busy}
                className={buttonClass}
              >
                <Cloud size={15} />
                {t('drive_connect')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void disconnectDrive()}
              disabled={busy}
              className={buttonClass}
            >
              <Unlink size={15} />
              {t('drive_disconnect')}
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
              <span className="block text-sm text-slate-700">{t('drive_auto')}</span>
              <span className="block text-xs text-slate-500">{t('drive_auto_hint')}</span>
            </span>
          </label>

          <p className="mt-4 text-xs text-slate-400">
            {t('drive_where', { folder: DRIVE_FOLDER, file: SNAPSHOT_FILE })}
          </p>
        </>
      ) : (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            setClientId(draft)
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {t('drive_client_label')}
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="123456789-abc.apps.googleusercontent.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 focus:border-accent focus:outline-none"
            />
            <span className="mt-1 block text-xs text-slate-400">{t('drive_client_hint')}</span>
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={draft.trim() === ''} className={buttonClass}>
              <CloudOff size={15} />
              {t('drive_client_save')}
            </button>
            <span className="text-xs text-slate-500">{t('drive_client_not_secret')}</span>
          </div>
        </form>
      )}
    </div>
  )
}
