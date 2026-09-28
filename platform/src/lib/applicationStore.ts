import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SECTIONS, type SectionId } from './application'

// Los cuatro textos de la redacción libre, tal como se van escribiendo.
//
// Almacén propio y no un campo más del perfil: son hasta ocho mil caracteres
// que cambian mientras se redacta, y mezclarlos con los ajustes haría que cada
// tecla reescribiera también el objetivo semanal y la fecha de examen.
export type ApplicationTexts = Record<SectionId, string>

export const EMPTY_TEXTS: ApplicationTexts = Object.fromEntries(
  SECTIONS.map((s) => [s.id, '']),
) as ApplicationTexts

interface ApplicationState {
  texts: ApplicationTexts
  setText: (id: SectionId, text: string) => void
  clearTexts: () => void
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set) => ({
      texts: EMPTY_TEXTS,
      setText: (id, text) => set((state) => ({ texts: { ...state.texts, [id]: text } })),
      clearTexts: () => set({ texts: EMPTY_TEXTS }),
    }),
    {
      name: 'epso-prep-application',
      // Un apartado que no estuviera guardado tiene que llegar como cadena
      // vacía y no como `undefined`: el <textarea> pasaría a no controlado y
      // React se queja, pero sobre todo el contador no sabría qué contar.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ApplicationState>
        return { ...current, texts: { ...EMPTY_TEXTS, ...(saved.texts ?? {}) } }
      },
    },
  ),
)

/** Los textos guardados, con todos los apartados presentes. */
export function normaliseTexts(value: unknown): ApplicationTexts {
  const raw = (value ?? {}) as Record<string, unknown>
  const out = { ...EMPTY_TEXTS }
  for (const section of SECTIONS) {
    const text = raw[section.id]
    if (typeof text === 'string') out[section.id] = text
  }
  return out
}
