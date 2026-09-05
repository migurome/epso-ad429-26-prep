import { Check, X } from 'lucide-react'
import clsx from 'clsx'
import { Markdown } from './Markdown'
import { AbstractPromptView } from './AbstractPromptView'
import { FigurePanelView } from './FigurePanelView'
import { ScannedFigure } from './ScannedFigure'
import { SCANNED_FIGURES } from '../data/scannedFigures.generated'
import { asPlainNotation, extractPromptFigures, panelSignature, panelsDrawable, parsePanel } from '../lib/abstractFigure'
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
  // Las preguntas de muestra oficiales de EPSO llegan sin explicación (la
  // fuente solo publica la letra). Sin avisar, al corregir no aparecía nada
  // bajo la respuesta y parecía que faltaba contenido.
  const lacksOfficialExplanation =
    question.tags?.includes('epso-official') === true &&
    !question.options.find((o) => o.isCorrect)?.explanation
  // El banco real viene de un libro cuyas figuras están escaneadas: cuando la
  // pregunta tiene recorte, ése es el enunciado. Es la figura exacta del
  // examen, así que no hay nada que el parser pueda perder por el camino.
  // El banco bonus no tiene libro detrás y se sigue dibujando.
  const scanned = isAbstract && SCANNED_FIGURES.has(question.id)
  // Con recorte, del enunciado sobra la transcripción de la secuencia (el
  // recorte la enseña mejor) pero NO la prosa de alrededor: ahí está descrito
  // el atributo que cambia, que es la mitad de la pregunta.
  const promptProse = scanned ? (extractPromptFigures(prompt)?.remainderMd ?? prompt) : null
  const optionPanels =
    isAbstract && !scanned
      ? question.options.map((opt) => parsePanel(pick(testLocale, opt.text)))
      : null
  // Si dos opciones se dibujarían con las MISMAS figuras pero su texto dice
  // cosas distintas, el icono se ha comido justo la diferencia (p. ej. "tip
  // left" vs "tip right", o hacia dónde mira la muesca de un "pac-man"): una
  // se marca correcta y la otra no, y a la vista son idénticas. Que la
  // diferencia sobreviva en el pie de texto de 10 px no basta. Dos opciones
  // con el MISMO texto sí pueden compartir icono: es el diseño "cuatro de
  // estas cinco comparten una regla, una no".
  const hasIconCollision = (() => {
    if (!optionPanels) return false
    const seen = new Map<string, string>()
    for (let i = 0; i < optionPanels.length; i++) {
      const panel = optionPanels[i]
      if (panel.shapes.length === 0) continue
      const key = panelSignature(panel)
      const previousText = seen.get(key)
      const text = pick(testLocale, question.options[i].text)
      if (previousText !== undefined && previousText !== text) return true
      seen.set(key, text)
    }
    return false
  })()
  // Los iconos son todo-o-nada por pregunta. El banco real describe muchas
  // figuras en prosa ("un elefante gris cuya trompa…") que no se reducen al
  // juego de símbolos, y dibujar solo los paneles que sí se reducían dejaba
  // secuencias mitad iconos mitad párrafos, con el sujeto de la figura
  // escondido en un pie de texto. Si algún panel del enunciado o alguna
  // opción no se puede dibujar entera, la pregunta entera va como texto.
  const promptFigures = isAbstract && !scanned ? extractPromptFigures(prompt) : null
  // Si UNA opción coloca sus figuras en la rejilla 3×3 y las demás no, unas
  // salen enmarcadas y otras sueltas: parecen preguntas distintas. El marco es
  // decisión del grupo entero.
  const optionsFramed =
    optionPanels?.some((p) => p.shapes.some((shape) => shape.position != null || shape.row != null)) ?? false
  const drawFigures =
    isAbstract &&
    optionPanels !== null &&
    panelsDrawable(optionPanels) &&
    !hasIconCollision &&
    (promptFigures === null || panelsDrawable(promptFigures.panels))
  return (
    <div>
      {index != null && (
        <p className={clsx('mb-3 font-semibold text-slate-400', large ? 'text-sm' : 'text-xs')}>
          {t('question_n', { n: index + 1 })}
        </p>
      )}
      {scanned ? (
        <div className="mb-4 space-y-3">
          {/* Del enunciado se conserva la prosa (la regla que hay que
              descubrir) y se descarta la transcripción de la secuencia: el
              recorte la enseña mejor de lo que la describe. */}
          {promptProse && <Markdown className={clsx(large && '[&_p]:text-lg')}>{promptProse}</Markdown>}
          <ScannedFigure questionId={question.id} kind="prompt" alt={t('figure_sequence_alt')} />
        </div>
      ) : isAbstract ? (
        <div className="mb-4">
          <AbstractPromptView prompt={prompt} large={large} forceText={!drawFigures} />
        </div>
      ) : (
        <Markdown className={clsx('mb-4', large && '[&_p]:text-2xl [&_p]:leading-snug [&_p]:tracking-wide')}>
          {prompt}
        </Markdown>
      )}
      {scanned && (
        <ScannedFigure
          questionId={question.id}
          kind="options"
          alt={t('figure_options_alt')}
          className="mb-3"
        />
      )}
      <div
        className={clsx(
          large ? 'space-y-3' : 'space-y-2',
          drawFigures && 'flex flex-wrap justify-center gap-3 space-y-0',
          // Con recorte, la opción ya está dibujada dentro de la imagen: aquí
          // solo hace falta la letra con la que se responde.
          scanned && 'flex flex-wrap justify-center gap-2 space-y-0',
        )}
      >
        {question.options.map((opt, i) => {
          const optText = pick(testLocale, opt.text)
          const optExplanation = opt.explanation ? pick(testLocale, opt.explanation) : undefined
          const isSelected = selectedOptionId === opt.id
          const showCorrect = revealed && opt.isCorrect
          const showWrong = revealed && isSelected && !opt.isCorrect
          const showExplanation = revealed && (isSelected || opt.isCorrect) && optExplanation
          const optionPanel = optionPanels ? optionPanels[i] : null
          const asCard = drawFigures && optionPanel !== null

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

          if (scanned) {
            // La figura de la opción está dentro del recorte, con su letra
            // impresa: aquí solo hace falta el botón con el que se responde.
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => !revealed && onSelect(opt.id)}
                disabled={revealed}
                className={clsx(
                  'flex flex-col items-center gap-1 rounded-xl border px-5 py-2.5 transition-colors',
                  stateClasses,
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className={clsx('font-semibold', large ? 'text-lg' : 'text-base')}>{opt.id}</span>
                  {showCorrect && <Check size={large ? 18 : 15} className="shrink-0 text-emerald-600" />}
                  {showWrong && <X size={large ? 18 : 15} className="shrink-0 text-red-600" />}
                </span>
                {showExplanation && (
                  <span className="max-w-[11rem] text-center text-xs leading-relaxed text-slate-600">
                    {optExplanation}
                  </span>
                )}
              </button>
            )
          }

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
                <FigurePanelView panel={optionPanel!} large={large} framed={optionsFramed} />
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
                  {isAbstract ? asPlainNotation(optText) : optText}
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
      {revealed && lacksOfficialExplanation && (
        <p className={clsx('mt-3 text-slate-500', large ? 'text-sm' : 'text-xs')}>
          {t('no_official_explanation')}
        </p>
      )}
    </div>
  )
}
