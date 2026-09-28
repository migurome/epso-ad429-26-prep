import { useState } from 'react'
import clsx from 'clsx'
import { Check, Copy } from 'lucide-react'
import { CHAR_LIMIT, SECTIONS, remainingOf, stateOf, type SectionId } from '../lib/application'
import { pick, useLocaleStore } from '../lib/localeStore'
import { useT } from '../lib/useT'
import type { ApplicationTexts } from '../lib/applicationStore'

// El editor de la redacción libre. Cuatro cuadros, uno por apartado del
// formulario de EPSO, con su cuenta de caracteres.
//
// Se escribe aquí y se pega allí: por eso cada apartado tiene su botón de
// copiar y el contador es lo más visible del pie. El formulario de EPSO no
// avisa al pasarse del límite — corta —, así que el aviso tiene que estar de
// este lado.

interface ApplicationEditorProps {
  texts: ApplicationTexts
  onChange: (id: SectionId, text: string) => void
}

const COUNTER_TONE: Record<string, string> = {
  empty: 'text-slate-400',
  ok: 'text-slate-500',
  near: 'text-amber-600',
  over: 'text-red-600',
}

export function ApplicationEditor({ texts, onChange }: ApplicationEditorProps) {
  const locale = useLocaleStore((s) => s.locale)

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          title={pick(locale, section.label)}
          prompt={pick(locale, section.prompt)}
          text={texts[section.id]}
          onChange={(text) => onChange(section.id, text)}
        />
      ))}
    </div>
  )
}

function SectionCard({
  title,
  prompt,
  text,
  onChange,
}: {
  title: string
  prompt: string
  text: string
  onChange: (text: string) => void
}) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const state = stateOf(text)
  const remaining = remainingOf(text)
  const intl = locale === 'es' ? 'es-ES' : 'en-GB'

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{prompt}</p>

      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        aria-label={title}
        className={clsx(
          'mt-3 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed text-slate-800',
          'focus:border-accent focus:outline-none',
          state === 'over' ? 'border-red-300 bg-red-50/40' : 'border-slate-200',
        )}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className={clsx('text-xs tabular-nums', COUNTER_TONE[state])}>
          {t('application_counter', {
            used: text.length.toLocaleString(intl),
            limit: CHAR_LIMIT.toLocaleString(intl),
          })}
          {state === 'over' && (
            <span className="ml-2 font-semibold">
              {t('application_over', { over: (-remaining).toLocaleString(intl) })}
            </span>
          )}
          {state === 'near' && (
            <span className="ml-2">
              {t('application_near', { left: remaining.toLocaleString(intl) })}
            </span>
          )}
        </p>
        <CopyButton text={text} />
      </div>
    </section>
  )
}

/** Copiar al portapapeles, que es cómo esto acaba en el formulario de EPSO.
 *
 * El portapapeles puede no existir (contexto no seguro, permiso denegado, o
 * un navegador viejo) y fallar es lo normal, no lo excepcional: por eso el
 * botón dice si ha copiado de verdad en vez de dar por hecho que sí. */
function CopyButton({ text }: { text: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={text === ''}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
        text === ''
          ? 'cursor-not-allowed border-slate-200 text-slate-300'
          : 'border-slate-200 text-slate-600 hover:border-accent hover:text-accent',
      )}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? t('application_copied') : t('application_copy')}
    </button>
  )
}
