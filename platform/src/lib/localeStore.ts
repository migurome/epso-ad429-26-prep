import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'es' | 'en'

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'es',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'epso-prep-locale' },
  ),
)

export interface Localized {
  es: string
  en: string
}

export function pick(locale: Locale, value: Localized): string {
  return value[locale]
}
