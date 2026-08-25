import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from './localeStore'

// Idioma en el que se muestran enunciados, opciones y explicaciones de las
// preguntas (bancos de práctica y tests cronometrados). Deliberadamente
// independiente del idioma de la interfaz (localeStore): en el examen real el
// razonamiento se hace en la Lengua 1 del candidato, pero conviene poder
// practicar también en el otro idioma sin cambiar toda la interfaz.
interface TestLocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useTestLocaleStore = create<TestLocaleState>()(
  persist(
    (set) => ({
      locale: 'es',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'epso-prep-test-locale' },
  ),
)
