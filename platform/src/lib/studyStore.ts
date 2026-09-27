import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Field } from '../types/content'
import {
  ALL_FIELDS,
  COMPETITIONS,
  competitionOf,
  type CompetitionId,
  type CompetitionInfo,
} from '../data/competition'
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
  /** El ámbito por el que se presenta el candidato. Uno solo, de cualquiera de
   * las dos convocatorias: de él salen la convocatoria, sus plazos y el color
   * de la interfaz (ver competitionOf). */
  field: Field
  /** Los ámbitos dados de alta: los que aparecen en el menú, bajo
   * Field-Related MCQ. La plataforma cubre seis, pero un candidato no se
   * prepara seis: se dan de alta los que interesan y el menú enseña ésos. El
   * ámbito activo cuenta siempre como dado de alta, esté o no en la lista. */
  activeFields: Field[]
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
  field: 'cybersecurity',
  // Los dos ámbitos por los que se presenta el candidato de esta plataforma,
  // uno por convocatoria. Dar de alta los seis de entrada sería llenar el menú
  // de material que nadie va a examinar.
  activeFields: ['data-science', 'cybersecurity'],
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
      version: 2,
      // v2: el ámbito dejó de guardarse por convocatoria. Había un mapa
      // { ad7: ..., ad8: ... } y un selector aparte que decía cuál valía; ahora
      // hay un solo ámbito y la convocatoria se deduce de él. Se recupera el
      // que el candidato estuviera viendo —el de la convocatoria que tenía
      // activa—, no el primero del mapa: quedarse con el otro le cambiaría de
      // oposición sin avisar.
      migrate: (persisted, from) => {
        const saved = (persisted ?? {}) as Record<string, unknown>
        if (from >= 2) return saved
        const profile = (saved.profile ?? {}) as Record<string, unknown>
        const byCompetition = (profile.preferredFields ?? {}) as Record<string, string>
        const active = lastActiveCompetition()
        const chosen = byCompetition[active] ?? byCompetition[active === 'ad7' ? 'ad8' : 'ad7']
        const { preferredFields: _dropped, ...rest } = profile
        // Lo que estuviera elegido en cada convocatoria queda dado de alta:
        // eran los ámbitos a los que el candidato llegaba antes, y perderlos
        // del menú al actualizar sería quitarle sitios donde ya estudiaba.
        const registered = Object.values(byCompetition)
          .map(knownField)
          .filter((f): f is Field => f !== null)
        return {
          ...saved,
          profile: {
            ...rest,
            field: knownField(chosen) ?? defaultFieldOf(active),
            activeFields: registered.length > 0 ? registered : DEFAULT_PROFILE.activeFields,
          },
        }
      },
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

/** El ámbito guardado, si sigue estando convocado. Cualquier otra cosa —un
 * ámbito retirado, un dato corrupto, un `undefined`— no vale. */
export function knownField(value: unknown): Field | null {
  return ALL_FIELDS.some((f) => f.id === value) ? (value as Field) : null
}

/** El ámbito por defecto de una convocatoria, para cuando no hay nada
 * elegido. */
function defaultFieldOf(competition: CompetitionId): Field {
  return COMPETITIONS[competition].userField
}

/** La convocatoria que estaba activa antes de que desapareciera el selector.
 * Vivía en su propio almacén persistido; se lee una sola vez, al migrar, y
 * después ese almacén ya no le importa a nadie. */
function lastActiveCompetition(): CompetitionId {
  try {
    const raw = globalThis.localStorage?.getItem('epso-prep-competition')
    if (!raw) return 'ad8'
    const parsed = JSON.parse(raw) as { state?: { competition?: string } }
    return parsed.state?.competition === 'ad7' ? 'ad7' : 'ad8'
  } catch {
    // Almacenamiento bloqueado o JSON roto: no es motivo para no arrancar.
    return 'ad8'
  }
}

/** El ámbito por el que se presenta el candidato. */
export function useField(): Field {
  return knownField(useStudyStore((s) => s.profile.field)) ?? DEFAULT_PROFILE.field
}

/** Los ámbitos dados de alta, en el orden en que se convocan y sin repetidos.
 *
 * El ámbito activo entra siempre, aunque no se haya dado de alta: se llega a
 * un ámbito también por enlace directo, y un menú que no contuviera la página
 * abierta no tendría de dónde volver. Si no queda ninguno —lista vaciada a
 * mano, datos corruptos—, se cae a los de fábrica en vez de a un menú vacío. */
export function activeFieldsOf(profile: CandidateProfile): Field[] {
  const chosen = knownField(profile.field) ?? DEFAULT_PROFILE.field
  const saved = (profile.activeFields ?? [])
    .map(knownField)
    .filter((f): f is Field => f !== null)
  const wanted = new Set(saved.length > 0 ? saved : DEFAULT_PROFILE.activeFields)
  wanted.add(chosen)
  return ALL_FIELDS.filter((f) => wanted.has(f.id)).map((f) => f.id)
}

export function useActiveFields(): Field[] {
  return activeFieldsOf(useStudyStore((s) => s.profile))
}

/** Alias histórico de useField. Field-Related MCQ y Formación se ciñen a él:
 * enseñar los demás ámbitos era material que el candidato no va a examinar,
 * compitiendo por su atención con el que sí. */
export const usePreferredField = useField

/** Los datos de la convocatoria a la que pertenece el ámbito elegido: sus
 * plazos, sus plazas y su color. No se elige aparte — se deduce. */
export function useCompetition(): CompetitionInfo {
  return competitionOf(useField())
}
