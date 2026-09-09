import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Lo respondido en los bancos de práctica, y el orden en que se presentan.
//
// Vive aparte de progressStore porque aquí no hay «intentos»: no se puntúa, no
// se cronometra y no se guarda un histórico. Es sólo el rastro de qué preguntas
// ya se han trabajado — que es justo lo que el candidato no puede reconstruir
// de memoria cuando vuelve al día siguiente y todo aparece sin marcar.

export interface PracticeBankRef {
  /** Identifica el banco. Sirve para barajar uno sin tocar los demás. */
  id: string
  /** Las preguntas que lo componen, para saber cuándo se ha vaciado. */
  questionIds: string[]
}

interface PracticeState {
  /** id de pregunta → id de la opción elegida. Los ids de pregunta son únicos
   * en todo el contenido (lo garantiza `checkUniqueIds`), así que un solo mapa
   * vale para todos los bancos sin colisiones. */
  answers: Record<string, string>
  /** id de banco → semilla de orden. Cero es el orden del documento. */
  orderSeed: Record<string, number>
  answer: (questionId: string, optionId: string) => void
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

      answer: (questionId, optionId) =>
        set((s) => ({ answers: { ...s.answers, [questionId]: optionId } })),

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
    { name: 'epso-prep-practice' },
  ),
)
