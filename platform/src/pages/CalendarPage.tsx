import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, PenLine, Target, Timer } from 'lucide-react'
import clsx from 'clsx'
import { PageHeader } from '../components/PageHeader'
import { useProgressStore } from '../lib/progressStore'
import { useStudyStore } from '../lib/studyStore'
import { useLocaleStore, pick, type Locale } from '../lib/localeStore'
import { useT } from '../lib/useT'
import {
  buildMonth,
  completedWeekStreak,
  currentWeek,
  dayKey,
  formatDuration,
  type CalendarInput,
  type DaySummary,
  type WeekSummary,
} from '../lib/studyCalendar'

function intlLocale(locale: Locale): string {
  return locale === 'es' ? 'es-ES' : 'en-GB'
}

export function CalendarPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const tests = useProgressStore((s) => s.testAttempts)
  const essays = useProgressStore((s) => s.essayAttempts)
  const dayLog = useStudyStore((s) => s.dayLog)
  const weeklyGoalHours = useStudyStore((s) => s.settings.weeklyGoalHours)

  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState<string>(() => dayKey(today))

  const input: CalendarInput = useMemo(
    () => ({ tests, essays, dayLog, weeklyGoalHours, now: today }),
    [tests, essays, dayLog, weeklyGoalHours, today],
  )

  const weeks = useMemo(
    () => buildMonth(cursor.getFullYear(), cursor.getMonth(), input),
    [cursor, input],
  )
  const week = useMemo(() => currentWeek(input), [input])
  const streak = useMemo(() => completedWeekStreak(input), [input])

  const selected = useMemo(
    () => weeks.flatMap((w) => w.days).find((d) => d.key === selectedKey) ?? null,
    [weeks, selectedKey],
  )

  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'long',
    year: 'numeric',
  }).format(cursor)

  // Cabeceras de columna en el idioma activo, empezando en lunes.
  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short' })
    // 2024-01-01 fue lunes: sirve de semana de referencia para los nombres.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)))
  }, [locale])

  function shiftMonth(months: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + months, 1))
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('calendar_eyebrow')}
        title={t('calendar_title')}
        description={t('calendar_description')}
      />

      <WeekGoalCard week={week} streak={streak} locale={locale} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <header className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={t('calendar_previous_month')}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="flex-1 text-center text-sm font-semibold text-slate-800 first-letter:uppercase">
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t('calendar_next_month')}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ChevronRight size={18} />
            </button>
          </header>

          <div className="mb-1 grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-1">
            <span aria-hidden="true" />
            {weekdayNames.map((name) => (
              <span
                key={name}
                className="pb-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400"
              >
                {name}
              </span>
            ))}
          </div>

          <div className="space-y-1">
            {weeks.map((w) => (
              <div key={w.key} className="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-1">
                <WeekBadge week={w} locale={locale} />
                {w.days.map((day) => (
                  <DayCell
                    key={day.key}
                    day={day}
                    goalHours={weeklyGoalHours}
                    selected={day.key === selectedKey}
                    onSelect={() => setSelectedKey(day.key)}
                  />
                ))}
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-400">{t('calendar_legend')}</p>
        </section>

        <DayDetail day={selected} locale={locale} />
      </div>
    </div>
  )
}

function WeekGoalCard({
  week,
  streak,
  locale,
}: {
  week: WeekSummary
  streak: number
  locale: Locale
}) {
  const t = useT()
  const percent = Math.round(week.ratio * 100)
  const remaining = Math.max(0, week.goalSeconds - week.seconds)

  return (
    <div
      className={clsx(
        'rounded-xl border p-5',
        week.complete ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Target size={20} className={week.complete ? 'text-emerald-600' : 'text-accent'} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {week.complete
              ? t('calendar_week_complete')
              : t('calendar_week_remaining', { time: formatDuration(remaining, locale) })}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {t('calendar_week_progress', {
              done: formatDuration(week.seconds, locale),
              goal: formatDuration(week.goalSeconds, locale),
              percent,
            })}
          </p>
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            <Flame size={14} />
            {t('calendar_streak', { n: streak })}
          </span>
        )}
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={clsx(
            'h-full rounded-full transition-[width] duration-300',
            week.complete ? 'bg-emerald-500' : 'bg-accent',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/** Marca de la semana a la izquierda de la fila: un anillo que se llena. */
function WeekBadge({ week, locale }: { week: WeekSummary; locale: Locale }) {
  const t = useT()
  const percent = Math.round(week.ratio * 100)
  return (
    <div
      className="flex items-center justify-center"
      title={week.isFuture ? '' : t('calendar_week_progress', {
        done: formatDuration(week.seconds, locale),
        goal: formatDuration(week.goalSeconds, locale),
        percent,
      })}
    >
      <div
        className={clsx(
          'flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-bold',
          week.complete
            ? 'bg-emerald-500 text-white'
            : percent > 0
              ? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
              : 'text-slate-300',
        )}
      >
        {week.isFuture ? '' : week.complete ? '✓' : `${percent}`}
      </div>
    </div>
  )
}

function DayCell({
  day,
  goalHours,
  selected,
  onSelect,
}: {
  day: DaySummary
  goalHours: number
  selected: boolean
  onSelect: () => void
}) {
  // La intensidad se mide contra la parte proporcional diaria del objetivo, no
  // contra un valor fijo: si subes el objetivo semanal, un día "lleno" exige
  // más, que es justo lo que se ha pedido al subirlo.
  const dailyTarget = (Math.max(1, goalHours) * 3600) / 7
  const ratio = dailyTarget > 0 ? Math.min(1, day.seconds / dailyTarget) : 0
  const level = day.seconds === 0 ? 0 : ratio >= 1 ? 4 : ratio >= 0.66 ? 3 : ratio >= 0.33 ? 2 : 1

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={day.isToday ? 'date' : undefined}
      aria-pressed={selected}
      className={clsx(
        'relative flex aspect-square min-h-[2.5rem] flex-col items-center justify-center rounded-lg text-xs transition-colors',
        !day.inMonth && 'opacity-35',
        selected
          ? 'ring-2 ring-accent'
          : day.isToday
            ? 'ring-1 ring-accent/50'
            : 'ring-1 ring-transparent',
        level === 0 && 'bg-slate-50 text-slate-400 hover:bg-slate-100',
        level === 1 && 'bg-accent/15 text-slate-700 hover:bg-accent/25',
        level === 2 && 'bg-accent/35 text-slate-800 hover:bg-accent/45',
        level === 3 && 'bg-accent/60 text-white hover:bg-accent/70',
        level === 4 && 'bg-accent text-white hover:brightness-110',
        day.isFuture && 'bg-transparent text-slate-300 hover:bg-slate-50',
      )}
    >
      <span className={clsx('font-semibold tabular-nums', day.isToday && 'underline')}>
        {day.date.getDate()}
      </span>
      {day.events.length > 0 && (
        <span
          aria-hidden="true"
          className={clsx(
            'absolute bottom-1 h-1 w-1 rounded-full',
            level >= 3 ? 'bg-white' : 'bg-accent',
          )}
        />
      )}
    </button>
  )
}

function DayDetail({ day, locale }: { day: DaySummary | null; locale: Locale }) {
  const t = useT()

  if (!day) {
    return (
      <aside className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">{t('calendar_pick_a_day')}</p>
      </aside>
    )
  }

  const heading = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(day.date)

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-800 first-letter:uppercase">{heading}</h3>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-slate-400">{t('calendar_time_total')}</dt>
          <dd className="font-semibold tabular-nums text-slate-800">
            {formatDuration(day.seconds, locale)}
          </dd>
        </div>
        {day.activeSeconds > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-slate-400">{t('calendar_time_usage')}</dt>
            <dd className="tabular-nums text-slate-600">
              {formatDuration(day.activeSeconds, locale)}
            </dd>
          </div>
        )}
        {day.eventSeconds > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-slate-400">{t('calendar_time_tests')}</dt>
            <dd className="tabular-nums text-slate-600">
              {formatDuration(day.eventSeconds, locale)}
            </dd>
          </div>
        )}
      </dl>

      <h4 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t('calendar_activity_heading')}
      </h4>

      {day.events.length === 0 ? (
        <p className="text-sm text-slate-500">
          {day.seconds > 0 ? t('calendar_only_usage') : t('calendar_nothing_that_day')}
        </p>
      ) : (
        <ul className="space-y-3">
          {day.events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-slate-400">
                {event.kind === 'essay' ? <PenLine size={15} /> : <Timer size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{pick(locale, event.label)}</p>
                <p className="text-xs text-slate-500">
                  {pick(locale, event.detail)}
                  {event.score && ` · ${event.score.value}/${event.score.max}`}
                  {` · ${formatDuration(event.seconds, locale)}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
