import { CalendarClock, ExternalLink, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader } from './PageHeader'
import {
  STAGE_ORDER,
  byStage,
  daysLeft,
  formatDay,
  isFresh,
  lastNewsOn,
  publishedOn,
} from '../lib/board'
import { useT } from '../lib/useT'
import type { BoardFile, BoardNotice, BoardStage } from '../types/board'
import type { DictKey } from '../lib/dictionary'

const STAGE_HEADING: Record<BoardStage, DictKey> = {
  open: 'board_stage_open',
  'in-progress': 'board_stage_in_progress',
  closed: 'board_stage_closed',
}

/** Cuánto queda de plazo, dicho como lo diría una persona. */
function DeadlineLine({ notice }: { notice: BoardNotice }) {
  const t = useT()
  const left = daysLeft(notice.deadline, new Date())
  const urgent = left !== null && left <= 7 && left > 0

  return (
    <p className="flex items-center gap-2 text-sm text-slate-600">
      <CalendarClock size={15} className="shrink-0 text-slate-400" />
      {/* El plazo se enseña tal como lo publica EPSO, con su hora de
          Bruselas: pasarlo a la zona del navegador es la manera más fácil de
          que alguien llegue tarde por culpa nuestra. */}
      <span className="font-medium tabular-nums text-slate-800">{notice.deadlineText}</span>
      {left !== null && (
        <span className={clsx('text-xs', urgent ? 'font-semibold text-accent' : 'text-slate-500')}>
          {left <= 0
            ? t('board_deadline_passed')
            : left === 1
              ? t('board_day_left')
              : t('board_days_left', { days: left })}
        </span>
      )}
    </p>
  )
}

function NoticeCard({ notice, since }: { notice: BoardNotice; since: string | null }) {
  const t = useT()
  // Verde: publicada hace menos de un mes. Es lo que el candidato busca al
  // entrar aquí, y así lo encuentra sin leerse la lista entera.
  const fresh = isFresh(notice, since, new Date())
  const published = publishedOn(notice, since)

  return (
    <li
      className={clsx(
        'rounded-xl border p-5',
        fresh ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="mr-auto min-w-0">
          {notice.reference && (
            <p className="font-mono text-xs tabular-nums text-slate-500">{notice.reference}</p>
          )}
          <h3 className="mt-0.5 text-base font-semibold text-slate-900">{notice.title}</h3>
        </div>
        {fresh && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            {t('board_new')}
          </span>
        )}
        {notice.grade && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {notice.grade}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {notice.deadlineText && <DeadlineLine notice={notice} />}
        {notice.locations && notice.locations.length > 0 && (
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
            <span>{notice.locations.join(' · ')}</span>
          </p>
        )}
        {published && (
          <p className={clsx('text-xs', fresh ? 'font-medium text-emerald-700' : 'text-slate-400')}>
            {t('board_opened_on', { date: formatDay(published) })}
          </p>
        )}
        {notice.stageChangedOn && (
          <p className="text-xs text-slate-400">
            {t('board_stage_changed', { date: formatDay(notice.stageChangedOn) })}
          </p>
        )}
        {notice.updatedOn && (
          <p className="text-xs text-slate-400">
            {t('board_updated', { date: formatDay(notice.updatedOn) })}
          </p>
        )}
      </div>

      <a
        href={notice.url}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          'mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
          fresh
            ? 'border-emerald-300 bg-white text-emerald-800 hover:border-emerald-500'
            : 'border-slate-200 text-slate-700 hover:border-accent hover:text-accent',
        )}
      >
        <ExternalLink size={14} />
        {t('board_apply')}
      </a>
    </li>
  )
}

/** El tablón. Recibe los datos, para que una prueba pueda pasarle cualquier
 * estado —vacío, con novedades, con convocatorias ya terminadas— sin tocar el
 * fichero generado. */
export function BoardView({ board }: { board: BoardFile }) {
  const t = useT()
  const groups = byStage(board.notices)
  const news = lastNewsOn(board.notices)

  return (
    <div>
      <PageHeader
        eyebrow={t('board_eyebrow')}
        title={t('board_title')}
        description={t('board_description')}
      />

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 text-sm">
        {board.sources.length > 0 ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('board_sources')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {board.sources.map((source) => (
                <li key={source.stage}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-accent"
                  >
                    <ExternalLink size={13} className="text-slate-400" />
                    {t(STAGE_HEADING[source.stage])}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="font-medium text-slate-800">{t('board_never_checked')}</p>
        )}
        <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
          {board.year !== null && (
            <div className="flex gap-1.5">
              <dt>{t('board_year')}</dt>
              <dd className="font-medium tabular-nums text-slate-700">{board.year}</dd>
            </div>
          )}
          {board.since && (
            <div className="flex gap-1.5">
              <dt>{t('board_watching_since')}</dt>
              <dd className="font-medium tabular-nums text-slate-700">{formatDay(board.since)}</dd>
            </div>
          )}
          {news && (
            <div className="flex gap-1.5">
              <dt>{t('board_last_news')}</dt>
              <dd className="font-medium tabular-nums text-slate-700">{formatDay(news)}</dd>
            </div>
          )}
        </dl>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-50" />
          {t('board_fresh_legend')}
        </p>
      </div>

      {board.notices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <h2 className="text-sm font-semibold text-slate-800">{t('board_empty_title')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t('board_empty_body')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {STAGE_ORDER.filter((stage) => groups[stage].length > 0).map((stage) => (
            <section key={stage}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t(STAGE_HEADING[stage])}
              </h2>
              <ul className="space-y-3">
                {groups[stage].map((notice) => (
                  <NoticeCard key={notice.id} notice={notice} since={board.since} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-slate-400">{t('board_source_note')}</p>
    </div>
  )
}
