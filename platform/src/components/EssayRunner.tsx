import { useState } from 'react'
import clsx from 'clsx'
import { Play, Save } from 'lucide-react'
import { Markdown } from './Markdown'
import { useCountdown } from '../lib/useCountdown'
import { formatClock } from '../lib/time'
import { useProgressStore } from '../lib/progressStore'
import { pick } from '../lib/localeStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { useT } from '../lib/useT'
import type { EssayAttempt, EssayPrompt } from '../types/content'

interface EssayRunnerProps {
  prompt: EssayPrompt
}

type Stage = 'idle' | 'writing' | 'review'

function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function EssayRunner({ prompt }: EssayRunnerProps) {
  const t = useT()
  const testLocale = useTestLocaleStore((s) => s.locale)
  const addEssayAttempt = useProgressStore((s) => s.addEssayAttempt)

  const [stage, setStage] = useState<Stage>('idle')
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [saved, setSaved] = useState(false)

  const totalSeconds = prompt.recommendedMinutes * 60
  const remaining = useCountdown(totalSeconds, stage === 'writing', () => stopWriting())

  function start() {
    setText('')
    setStartedAt(new Date().toISOString())
    setStage('writing')
    setSaved(false)
  }

  function stopWriting() {
    // Medido contra el reloj y no como `total - restante`: al agotarse el
    // tiempo, `remaining` aún vale 1 en el render vigente (ver useCountdown).
    setElapsedSeconds(
      startedAt
        ? Math.min(totalSeconds, Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)))
        : totalSeconds - remaining,
    )
    setStage('review')
  }

  function save() {
    const attempt: EssayAttempt = {
      id: `essay-${Date.now()}`,
      promptId: prompt.id,
      startedAt: startedAt ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      text,
      timeSpentSeconds: elapsedSeconds,
      selfReviewNotes: notes || undefined,
    }
    addEssayAttempt(attempt)
    setSaved(true)
  }

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <Markdown>{pick(testLocale, prompt.briefMd)}</Markdown>
      </div>

      {stage === 'idle' && (
        <button
          type="button"
          onClick={start}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-eu-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-eu-blue-dark"
        >
          <Play size={16} />
          {t('start_minutes', { n: prompt.recommendedMinutes })}
        </button>
      )}

      {stage === 'writing' && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">{t('n_words', { n: wordCount(text) })}</span>
            <span
              className={clsx(
                'rounded-full px-3 py-1 text-sm font-semibold tabular-nums',
                remaining <= 300 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600',
              )}
            >
              {formatClock(remaining)}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            className="w-full rounded-xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-800 focus:border-eu-blue focus:outline-none"
            placeholder={t('essay_placeholder')}
          />
          <button
            type="button"
            onClick={stopWriting}
            className="mt-3 rounded-lg bg-eu-blue px-5 py-2 text-sm font-semibold text-white hover:bg-eu-blue-dark"
          >
            {t('finish')}
          </button>
        </div>
      )}

      {stage === 'review' && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('your_draft', { n: wordCount(text), t: formatClock(elapsedSeconds) })}
            </p>
            <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
              {text || <span className="text-slate-400">{t('no_text')}</span>}
            </div>
          </div>

          {prompt.sourceDocsMd?.map((doc, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
              <Markdown>{pick(testLocale, doc)}</Markdown>
            </div>
          ))}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('self_review_notes')}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-eu-blue focus:outline-none"
              placeholder={t('self_review_placeholder')}
            />
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saved}
            className="inline-flex items-center gap-2 rounded-lg bg-eu-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-eu-blue-dark disabled:opacity-50"
          >
            <Save size={16} />
            {saved ? t('saved') : t('save_attempt')}
          </button>
        </div>
      )}
    </div>
  )
}
