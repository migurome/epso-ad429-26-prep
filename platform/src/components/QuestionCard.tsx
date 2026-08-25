import { Check, X } from 'lucide-react'
import clsx from 'clsx'
import { Markdown } from './Markdown'
import { AbstractPromptView } from './AbstractPromptView'
import { FigurePanelView } from './FigurePanelView'
import { parsePanel } from '../lib/abstractFigure'
import { pick } from '../lib/localeStore'
import { useTestLocaleStore } from '../lib/testLocaleStore'
import { useT } from '../lib/useT'
import type { Question } from '../types/content'

interface QuestionCardProps {
  question: Question
  index?: number
  selectedOptionId: string | null
  revealed: boolean
  onSelect: (optionId: string) => void
  size?: 'default' | 'large'
}

export function QuestionCard({
  question,
  index,
  selectedOptionId,
  revealed,
  onSelect,
  size = 'default',
}: QuestionCardProps) {
  const t = useT()
  const testLocale = useTestLocaleStore((s) => s.locale)
  const large = size === 'large'
  const isAbstract = question.skill === 'abstract'
  const prompt = pick(testLocale, question.prompt)
  return (
    <div>
      {index != null && (
        <p className={clsx('mb-3 font-semibold text-slate-400', large ? 'text-sm' : 'text-xs')}>
          {t('question_n', { n: index + 1 })}
        </p>
      )}
      {isAbstract ? (
        <div className="mb-4">
          <AbstractPromptView prompt={prompt} large={large} />
        </div>
      ) : (
        <Markdown className={clsx('mb-4', large && '[&_p]:text-2xl [&_p]:leading-snug [&_p]:tracking-wide')}>
          {prompt}
        </Markdown>
      )}
      <div className={clsx(large ? 'space-y-3' : 'space-y-2', isAbstract && 'flex flex-wrap justify-center gap-3 space-y-0')}>
        {question.options.map((opt) => {
          const optText = pick(testLocale, opt.text)
          const optExplanation = opt.explanation ? pick(testLocale, opt.explanation) : undefined
          const isSelected = selectedOptionId === opt.id
          const showCorrect = revealed && opt.isCorrect
          const showWrong = revealed && isSelected && !opt.isCorrect
          const showExplanation = revealed && (isSelected || opt.isCorrect) && optExplanation
          const optionPanel = isAbstract ? parsePanel(optText) : null
          const asCard = isAbstract && optionPanel && optionPanel.shapes.length > 0

          const stateClasses = clsx(
            !revealed && isSelected && 'border-eu-blue bg-eu-blue/5',
            !revealed && !isSelected && 'border-slate-200 hover:border-slate-300 cursor-pointer',
            showCorrect && 'border-emerald-500 bg-emerald-50',
            showWrong && 'border-red-500 bg-red-50',
            revealed && !isSelected && !opt.isCorrect && 'border-slate-200 opacity-60',
          )

          const badge = (
            <span
              className={clsx(
                'flex shrink-0 items-center justify-center rounded-full border font-semibold',
                large ? 'h-7 w-7 text-sm' : 'h-5 w-5 text-[11px]',
                asCard ? 'mb-1.5' : 'mt-0.5',
                showCorrect && 'border-emerald-500 text-emerald-700',
                showWrong && 'border-red-500 text-red-700',
                !revealed && isSelected && 'border-eu-blue text-eu-blue',
                (!revealed && !isSelected) || (revealed && !isSelected && !opt.isCorrect)
                  ? 'border-slate-300 text-slate-500'
                  : '',
              )}
            >
              {opt.id}
            </span>
          )

          if (asCard) {
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => !revealed && onSelect(opt.id)}
                disabled={revealed}
                className={clsx(
                  'flex flex-col items-center rounded-xl border p-3 transition-colors',
                  large ? 'min-w-[6.5rem]' : 'min-w-[5rem]',
                  stateClasses,
                )}
              >
                {badge}
                <FigurePanelView panel={optionPanel!} large={large} />
                {showCorrect && <Check size={large ? 20 : 16} className="mt-1 shrink-0 text-emerald-600" />}
                {showWrong && <X size={large ? 20 : 16} className="mt-1 shrink-0 text-red-600" />}
                {showExplanation && (
                  <span className="mt-2 max-w-[9rem] text-center text-xs leading-relaxed text-slate-600">
                    {optExplanation}
                  </span>
                )}
              </button>
            )
          }

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !revealed && onSelect(opt.id)}
              disabled={revealed}
              className={clsx(
                'flex w-full items-start gap-3 rounded-lg border text-left transition-colors',
                large ? 'px-5 py-4 text-base' : 'px-4 py-3 text-sm',
                stateClasses,
              )}
            >
              {badge}
              <span className="flex-1">
                <span className={clsx('block whitespace-pre-wrap', large && 'text-xl tracking-wide')}>
                  {optText}
                </span>
                {showExplanation && (
                  <span className="mt-2 block text-xs leading-relaxed text-slate-600">{optExplanation}</span>
                )}
              </span>
              {showCorrect && <Check size={large ? 20 : 16} className="mt-0.5 shrink-0 text-emerald-600" />}
              {showWrong && <X size={large ? 20 : 16} className="mt-0.5 shrink-0 text-red-600" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
