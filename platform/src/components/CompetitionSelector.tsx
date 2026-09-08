import clsx from 'clsx'
import { COMPETITIONS, COMPETITION_ORDER } from '../data/competition'
import { useCompetitionStore } from '../lib/competitionStore'
import { useT } from '../lib/useT'

/** Selector de convocatoria (AD 7 / AD 8).
 *
 * Se comporta como el selector de idioma: cambia lo que se muestra en toda la
 * plataforma y se recuerda entre sesiones. Va arriba del todo de la barra
 * lateral porque no es una preferencia menor — decide de qué oposición son los
 * plazos, los ámbitos y las plazas que se están leyendo, y equivocarse de
 * convocatoria es un error caro. Por eso también cambia el color de la
 * interfaz (ver src/index.css).
 */
export function CompetitionSelector({ className }: { className?: string }) {
  const t = useT()
  const competition = useCompetitionStore((s) => s.competition)
  const setCompetition = useCompetitionStore((s) => s.setCompetition)

  return (
    <div
      className={clsx('flex gap-1 rounded-lg bg-slate-100 p-1 text-xs', className)}
      role="group"
      aria-label={t('competition_selector_label')}
    >
      {COMPETITION_ORDER.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => setCompetition(key)}
          aria-pressed={competition === key}
          className={clsx(
            'flex-1 rounded-md px-2 py-1 font-semibold transition-colors',
            competition === key
              ? 'bg-white text-accent shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {COMPETITIONS[key].grade}
        </button>
      ))}
    </div>
  )
}
