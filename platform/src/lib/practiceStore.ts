import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Lo respondido en los bancos de práctica, y el orden en que se presentan.
//
// Vive aparte de progressStore porque aquí no hay «intentos»: no se puntúa como
// examen y no se guarda un histórico. Es el rastro de qué preguntas ya se han
// trabajado — que es justo lo que el candidato no puede reconstruir de memoria
// cuando vuelve al día siguiente y todo aparece sin marcar.

/**
 * Una respuesta suelta.
 *
 * Antes esto era sólo el id de la opción elegida, y esa cadena a secas no podía
 * contestar tres preguntas que sí importan: cuándo se contestó —lo que permite
 * que el calendario cuente el trabajo suelto—, cuánto se tardó, y si el
 * candidato ya ha dado la pregunta por repasada.
 *
 * `done` es deliberadamente distinto de «respondida». Entre contestar y
 * entender la explicación hay un paso, y es donde está el aprendizaje: si al
 * marcar la opción la pregunta se plegara y desapareciera de la lista de
 * pendientes, la explicación se cerraría en las narices de quien más la
 * necesita —el que ha fallado—. Se cierra cuando lo diga el candidato.
 */
export interface PracticeAnswer {
  optionId: string
  /** Momento de la respuesta, en ISO. Vacío en lo respondido antes de que esto
   * se guardara: no se inventa una fecha, se admite no saberla. */
  at: string
  /** Segundos que llevó, si el contador corría. */
  seconds?: number
  /** Repasada y cerrada por quien la contestó. */
  done?: boolean
}

export interface PracticeBankRef {
  /** Identifica el banco. Sirve para barajar uno sin tocar los demás. */
  id: string
  /** Las preguntas que lo componen, para saber cuándo se ha vaciado. */
  questionIds: string[]
}

interface PracticeState {
  /** id de pregunta → lo respondido. Los ids de pregunta son únicos en todo el
   * contenido (lo garantiza `checkUniqueIds`), así que un solo mapa vale para
   * todos los bancos sin colisiones. */
  answers: Record<string, PracticeAnswer>
  /** id de banco → semilla de orden. Cero es el orden del documento. */
  orderSeed: Record<string, number>
  answer: (questionId: string, optionId: string, seconds?: number) => void
  /** La da por repasada. Sobre una sin responder no hace nada: no se puede
   * cerrar lo que no se ha abierto. */
  complete: (questionId: string) => void
  /** Devuelve una pregunta al estado sin responder. Si con eso el banco se
   * queda sin ninguna respondida, se baraja: empezar otra vuelta en el mismo
   * orden convierte el repaso en un ejercicio de memoria posicional. */
  reactivate: (questionId: string, bank: PracticeBankRef) => void
  reactivateAll: (bank: PracticeBankRef) => void
}

/** Semilla nueva. Basta con que cambie; el valor concreto no significa nada. */
function newSeed(): number {
  return Date.now() >>> 0 || 1
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set) => ({
      answers: {},
      orderSeed: {},

      answer: (questionId, optionId, seconds) =>
        set((s) => ({
          answers: {
            ...s.answers,
            [questionId]: { optionId, at: new Date().toISOString(), seconds },
          },
        })),

      complete: (questionId) =>
        set((s) => {
          const current = s.answers[questionId]
          if (!current) return s
          return { answers: { ...s.answers, [questionId]: { ...current, done: true } } }
        }),

      reactivate: (questionId, bank) =>
        set((s) => {
          const answers = { ...s.answers }
          delete answers[questionId]
          const anyLeft = bank.questionIds.some((id) => answers[id] != null)
          return anyLeft
            ? { answers }
            : { answers, orderSeed: { ...s.orderSeed, [bank.id]: newSeed() } }
        }),

      reactivateAll: (bank) =>
        set((s) => {
          const answers = { ...s.answers }
          for (const id of bank.questionIds) delete answers[id]
          return { answers, orderSeed: { ...s.orderSeed, [bank.id]: newSeed() } }
        }),
    }),
    {
      name: 'epso-prep-practice',
      // La versión 0 guardaba `answers` como id de pregunta → id de opción, una
      // cadena pelada. Se convierte al entrar en vez de tolerar las dos formas
      // por todo el código: sin fecha, porque inventarle una sería mentir al
      // calendario, y eso se nota justo donde se confía en él.
      version: 1,
      migrate: (persisted, from) => {
        const state = persisted as Partial<PracticeState> | undefined
        if (from >= 1 || !state?.answers) return state as PracticeState
        const answers: Record<string, PracticeAnswer> = {}
        for (const [id, value] of Object.entries(state.answers)) {
          if (typeof value === 'string') answers[id] = { optionId: value, at: '' }
          else if (value && typeof value === 'object') answers[id] = value
        }
        return { ...state, answers } as PracticeState
      },
    },
  ),
)
