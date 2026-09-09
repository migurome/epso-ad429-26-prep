import { useEffect, useMemo, useState } from 'react'
import { Check, Download, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useProgressStore } from '../lib/progressStore'
import { useStudyStore } from '../lib/studyStore'
import { useCompetitionStore } from '../lib/competitionStore'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'
import { COMPETITIONS, COMPETITION_ORDER } from '../data/competition'
import { currentWeek, formatDuration, type CalendarInput } from '../lib/studyCalendar'
import type { Field } from '../types/content'

/** Cuánto puede valer el objetivo semanal. Menos de una hora no es un plan de
 * estudio y más de cuarenta no cabe en una semana con trabajo. */
const MIN_GOAL_HOURS = 1
const MAX_GOAL_HOURS = 40

export function SettingsPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)

  const profile = useStudyStore((s) => s.profile)
  const settings = useStudyStore((s) => s.settings)
  const dayLog = useStudyStore((s) => s.dayLog)
  const updateProfile = useStudyStore((s) => s.updateProfile)
  const updateSettings = useStudyStore((s) => s.updateSettings)
  const resetSettings = useStudyStore((s) => s.resetSettings)
  const clearDayLog = useStudyStore((s) => s.clearDayLog)

  const tests = useProgressStore((s) => s.testAttempts)
  const essays = useProgressStore((s) => s.essayAttempts)
  const activeCompetition = useCompetitionStore((s) => s.competition)

  // Los campos editan un borrador, no el almacén. Antes cada pulsación se
  // guardaba sola y sin decir nada: no había forma de saber si un cambio había
  // entrado, ni de deshacerlo antes de que contara.
  const [draftProfile, setDraftProfile] = useState(profile)
  const [draftSettings, setDraftSettings] = useState(settings)
  const [justSaved, setJustSaved] = useState(false)

  // Si el almacén cambia por otra vía —restaurar ajustes, otra pestaña— el
  // borrador vuelve a partir de lo guardado.
  useEffect(() => setDraftProfile(profile), [profile])
  useEffect(() => setDraftSettings(settings), [settings])

  // Comparación por serialización: los dos objetos salen del mismo sitio y se
  // construyen extendiéndolo, así que el orden de claves coincide.
  const dirty =
    JSON.stringify(draftProfile) !== JSON.stringify(profile) ||
    JSON.stringify(draftSettings) !== JSON.stringify(settings)

  function editProfile(patch: Partial<typeof profile>) {
    setJustSaved(false)
    setDraftProfile((prev) => ({ ...prev, ...patch }))
  }

  function editSettings(patch: Partial<typeof settings>) {
    setJustSaved(false)
    setDraftSettings((prev) => ({ ...prev, ...patch }))
  }

  function save() {
    updateProfile(draftProfile)
    updateSettings(draftSettings)
    setJustSaved(true)
  }

  function discard() {
    setJustSaved(false)
    setDraftProfile(profile)
    setDraftSettings(settings)
  }

  // La previsión sigue al borrador: enseña lo que el objetivo pasaría a ser,
  // que es justamente lo que hay que ver antes de confirmar.
  const input: CalendarInput = useMemo(
    () => ({ tests, essays, dayLog, weeklyGoalHours: draftSettings.weeklyGoalHours }),
    [tests, essays, dayLog, draftSettings.weeklyGoalHours],
  )
  const week = useMemo(() => currentWeek(input), [input])

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      dayLog,
      testAttempts: tests,
      essayAttempts: essays,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `epso-prep-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('settings_eyebrow')}
        title={t('settings_title')}
        description={t('settings_description')}
      />

      <div className="space-y-6">
        {/* ── Datos del candidato ───────────────────────────────────────── */}
        <Card title={t('settings_candidate')}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('settings_name')}>
              <input
                type="text"
                value={draftProfile.displayName}
                onChange={(e) => editProfile({ displayName: e.target.value })}
                placeholder={t('settings_name_placeholder')}
                className={inputClass}
              />
            </FormField>
            <FormField label={t('settings_email')}>
              <input
                type="email"
                value={draftProfile.email}
                onChange={(e) => editProfile({ email: e.target.value })}
                placeholder="nombre@ejemplo.eu"
                className={inputClass}
              />
            </FormField>
            <FormField label={t('settings_exam_date')} hint={t('settings_exam_date_hint')}>
              <input
                type="date"
                value={draftProfile.targetExamDate}
                onChange={(e) => editProfile({ targetExamDate: e.target.value })}
                className={inputClass}
              />
            </FormField>
          </div>

          <p className="mt-4 text-xs text-slate-400">{t('settings_local_note')}</p>
        </Card>

        {/* ── Ámbito por convocatoria ───────────────────────────────────── */}
        <Card title={t('settings_fields')} description={t('settings_fields_description')}>
          <div className="space-y-4">
            {COMPETITION_ORDER.map((key) => {
              const competition = COMPETITIONS[key]
              const value = draftProfile.preferredFields[key] ?? competition.userField
              return (
                <FormField
                  key={key}
                  label={`${competition.id} — ${pick(locale, competition.title)}`}
                  hint={key === activeCompetition ? t('settings_active_competition') : undefined}
                >
                  <select
                    value={value}
                    onChange={(e) =>
                      editProfile({
                        preferredFields: {
                          ...draftProfile.preferredFields,
                          [key]: e.target.value as Field,
                        },
                      })
                    }
                    className={inputClass}
                  >
                    {competition.fields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {pick(locale, f.label)} ({f.posts})
                      </option>
                    ))}
                  </select>
                </FormField>
              )
            })}
          </div>
        </Card>

        {/* ── Objetivo semanal ──────────────────────────────────────────── */}
        <Card title={t('settings_goal')} description={t('settings_goal_description')}>
          <div className="flex flex-wrap items-end gap-4">
            <FormField label={t('settings_goal_hours')}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={MIN_GOAL_HOURS}
                  max={MAX_GOAL_HOURS}
                  step={1}
                  value={draftSettings.weeklyGoalHours}
                  onChange={(e) => editSettings({ weeklyGoalHours: Number(e.target.value) })}
                  className="h-1.5 w-48 cursor-pointer accent-[var(--color-accent)]"
                />
                <input
                  type="number"
                  min={MIN_GOAL_HOURS}
                  max={MAX_GOAL_HOURS}
                  value={draftSettings.weeklyGoalHours}
                  onChange={(e) =>
                    editSettings({
                      weeklyGoalHours: clamp(Number(e.target.value), MIN_GOAL_HOURS, MAX_GOAL_HOURS),
                    })
                  }
                  className={`${inputClass} w-20 tabular-nums`}
                />
                <span className="text-sm text-slate-500">{t('settings_hours_per_week')}</span>
              </div>
            </FormField>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {t('settings_goal_daily', {
              daily: formatDuration((draftSettings.weeklyGoalHours * 3600) / 7, locale),
            })}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            {t('calendar_week_progress', {
              done: formatDuration(week.seconds, locale),
              goal: formatDuration(week.goalSeconds, locale),
              percent: Math.round(week.ratio * 100),
            })}
          </p>
        </Card>

        {/* ── Registro de uso ───────────────────────────────────────────── */}
        <Card title={t('settings_tracking')} description={t('settings_tracking_description')}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={draftSettings.trackUsage}
              onChange={(e) => editSettings({ trackUsage: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className="text-sm text-slate-700">{t('settings_track_usage')}</span>
          </label>

          <div className="mt-4 max-w-xs">
            <FormField label={t('settings_idle')} hint={t('settings_idle_hint')}>
              <input
                type="number"
                min={1}
                max={60}
                value={draftSettings.idleTimeoutMinutes}
                onChange={(e) =>
                  editSettings({ idleTimeoutMinutes: clamp(Number(e.target.value), 1, 60) })
                }
                disabled={!draftSettings.trackUsage}
                className={`${inputClass} w-24 tabular-nums disabled:opacity-50`}
              />
            </FormField>
          </div>
        </Card>

        {/* ── Datos ─────────────────────────────────────────────────────── */}
        <Card title={t('settings_data')} description={t('settings_data_description')}>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportData} className={buttonClass}>
              <Download size={15} />
              {t('settings_export')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('settings_reset_confirm'))) resetSettings()
              }}
              className={buttonClass}
            >
              <RotateCcw size={15} />
              {t('settings_reset')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('settings_clear_log_confirm'))) clearDayLog()
              }}
              className={`${buttonClass} border-red-200 text-red-700 hover:bg-red-50`}
            >
              <Trash2 size={15} />
              {t('settings_clear_log')}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {t('settings_log_size', { days: Object.keys(dayLog).length })}
          </p>
        </Card>

        {/* ── Confirmar ─────────────────────────────────────────────────────
            Pegada abajo: la página es larga y el candidato no debería tener
            que buscar dónde se confirma lo que acaba de escribir. */}
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
          >
            <Check size={15} />
            {t('settings_save')}
          </button>
          {dirty && (
            <button type="button" onClick={discard} className={buttonClass}>
              <Undo2 size={15} />
              {t('settings_discard')}
            </button>
          )}
          <span
            className={
              dirty ? 'text-xs font-medium text-amber-700' : 'text-xs text-slate-400'
            }
          >
            {dirty ? t('settings_unsaved') : justSaved ? t('settings_saved') : t('settings_no_changes')}
          </span>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent'

const buttonClass =
  'flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50'

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {description && <p className="mt-1 mb-4 text-xs text-slate-500">{description}</p>}
      <div className={description ? '' : 'mt-4'}>{children}</div>
    </section>
  )
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}
