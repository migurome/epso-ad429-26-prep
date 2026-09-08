import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMPETITIONS, type CompetitionId, type CompetitionInfo } from '../data/competition'

// Convocatoria activa. La plataforma cubre dos a la vez (AD7 perfiles TIC y
// AD8 IA/ciberseguridad) porque sus pruebas de razonamiento y de redacción son
// literalmente el mismo examen: lo que cambia son los ámbitos, las plazas y los
// plazos. Se elige como el idioma — se recuerda entre sesiones y tiñe la
// interfaz, azul para la AD7 y rojo para la AD8, para que en ningún momento
// haya duda de a cuál corresponden los datos que se están leyendo.
interface CompetitionState {
  competition: CompetitionId
  setCompetition: (competition: CompetitionId) => void
}

export const useCompetitionStore = create<CompetitionState>()(
  persist(
    (set) => ({
      competition: 'ad8',
      setCompetition: (competition) => set({ competition }),
    }),
    { name: 'epso-prep-competition' },
  ),
)

/** Los datos de la convocatoria activa. */
export function useCompetition(): CompetitionInfo {
  return COMPETITIONS[useCompetitionStore((s) => s.competition)]
}
