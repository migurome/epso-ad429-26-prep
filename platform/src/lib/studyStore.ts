import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Field } from '../types/content'
import type { CompetitionId } from '../data/competition'
import { dayKey, type DayLog } from './studyCalendar'

// Ajustes del candidato y registro de uso de la plataforma.
//
// Vive aparte de progressStore a propósito: allí están los INTENTOS (qué se
// respondió y con qué acierto), que son el resultado del estudio, y aquí está
// el USO (cuánto tiempo se ha dedicado y qué se ha configurado), que es el
// hábito. El calendario necesita los dos y los cruza en studyCalendar.ts.
//
// El registro diario se guarda como un mapa 'YYYY-MM-DD' → segundos en vez de
// como una lista de sesiones: ocupa poco, se suma sin recorrer nada y no
// guarda a qué hora se estudió, que no hace falta para nada.

export interface CandidateProfile {
  displayName: string
  email: string
  /** Ámbito elegido en cada convocatoria. Sobrescribe el `userField` que trae
   * COMPETITIONS, para que el candidato pueda cambiar de perfil sin tocar el
   * código. */
  preferredFields: Partial<Record<CompetitionId, Field>>
  /** Fecha prevista de examen, en ISO 'YYYY-MM-DD'. Vacía si no se sabe. */
  targetExamDate: string
}

export interface StudySettings {
  /** Horas de estudio que hay que alcanzar cada semana para darla por
   * cumplida. Configurable; el enunciado de partida eran 5. */
  weeklyGoalHours: number
  /** Minutos sin interacción tras los cuales se deja de contar tiempo de uso.
   * Evita que una pestaña abierta toda la tarde cuente como estudio. */
  idleTimeoutMinutes: number
  /** Registrar automáticamente el tiempo de uso. Si se apaga, el calendario
   * sólo cuenta el tiempo de tests y redacciones. */
  trackUsage: boolean
}

export const DEFAULT_SETTINGS: StudySettings = {
  weeklyGoalHours: 5,
  idleTimeoutMinutes: 3,
  trackUsage: true,
}

export const DEFAULT_PROFILE: CandidateProfile = {
  displayName: '',
  email: '',
  preferredFields: {},
  targetExamDate: '',
}

interface StudyState {
  profile: CandidateProfile
  settings: StudySettings
  /** 'YYYY-MM-DD' → segundos de uso acumulados ese día. */
  dayLog: DayLog
  addActiveSeconds: (seconds: number, when?: Date) => void
  setDaySeconds: (key: string, seconds: number) => void
  updateProfile: (patch: Partial<CandidateProfile>) => void
  updateSettings: (patch: Partial<StudySettings>) => void
  resetSettings: () => void
  clearDayLog: () => void
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      settings: DEFAULT_SETTINGS,
      dayLog: {},

      addActiveSeconds: (seconds, when) =>
        set((state) => {
          if (!(seconds > 0)) return state
          const key = dayKey(when ?? new Date())
          return { dayLog: { ...state.dayLog, [key]: (state.dayLog[key] ?? 0) + seconds } }
        }),

      // Corrección manual desde los ajustes: un día mal registrado (o uno de
      // estudio fuera de la plataforma) se puede ajustar a mano.
      setDaySeconds: (key, seconds) =>
        set((state) => {
          const next = { ...state.dayLog }
          if (seconds > 0) next[key] = seconds
          else delete next[key]
          return { dayLog: next }
        }),

      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
      clearDayLog: () => set({ dayLog: {} }),
    }),
    {
      name: 'epso-prep-study',
      version: 1,
      // Los ajustes ganan campos con el tiempo; sin esta mezcla, un usuario
      // con datos guardados de una versión anterior se quedaría con `undefined`
      // en los campos nuevos y la interfaz mostraría huecos.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<StudyState>
        return {
          ...current,
          ...saved,
          profile: { ...DEFAULT_PROFILE, ...(saved.profile ?? {}) },
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
          dayLog: saved.dayLog ?? {},
        }
      },
    },
  ),
)

/** El ámbito por el que se presenta el candidato en una convocatoria: lo que
 * haya elegido en los ajustes y, si no ha elegido nada, el de la convocatoria. */
export function preferredFieldFor(
  profile: CandidateProfile,
  competition: { key: CompetitionId; userField: Field; fields: { id: Field }[] },
): Field {
  const chosen = profile.preferredFields[competition.key]
  if (chosen && competition.fields.some((f) => f.id === chosen)) return chosen
  return competition.userField
}
