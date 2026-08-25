import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EssayAttempt, TestAttempt } from '../types/content'

interface ProgressState {
  testAttempts: TestAttempt[]
  essayAttempts: EssayAttempt[]
  addTestAttempt: (attempt: TestAttempt) => void
  addEssayAttempt: (attempt: EssayAttempt) => void
  clearAll: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      testAttempts: [],
      essayAttempts: [],
      addTestAttempt: (attempt) =>
        set((state) => ({ testAttempts: [...state.testAttempts, attempt] })),
      addEssayAttempt: (attempt) =>
        set((state) => ({ essayAttempts: [...state.essayAttempts, attempt] })),
      clearAll: () => set({ testAttempts: [], essayAttempts: [] }),
    }),
    { name: 'epso-prep-progress' },
  ),
)
