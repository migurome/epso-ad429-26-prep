import { create } from 'zustand'
import { phaseOf, type AccountPhase } from './account'
import type { Account } from '../types/account'

// Quién ha entrado. Lo que gobierna la puerta.
//
// **No se persiste, y es a propósito.** La sesión ya la guarda el cliente de
// Supabase en su propia clave; lo que no puede guardarse es la cuenta, porque
// un «aprobado» en el disco sobreviviría a una revocación: el administrador
// quitaría el acceso y el interesado seguiría entrando hasta vaciar su
// almacenamiento. Al arrancar no se sabe nada, se pregunta, y hasta que hay
// respuesta la fase es `starting`.

interface AccountState {
  /** Si ya se resolvió la primera pregunta por la sesión. */
  started: boolean
  userId: string | null
  email: string | null
  account: Account | null
  /** Por qué no se pudo leer la cuenta, tal cual. */
  failure: string | null
  /** Lo que hay que enseñar ahora mismo. Se deriva, no se guarda. */
  phase: () => AccountPhase
  session: (user: { id: string; email: string } | null) => void
  loaded: (account: Account | null) => void
  failed: (failure: string) => void
  markStarted: () => void
}

export const useAccountStore = create<AccountState>()((set, get) => ({
  started: false,
  userId: null,
  email: null,
  account: null,
  failure: null,

  // Derivada de los cuatro datos de arriba y de una sola función, para que no
  // haya dos sitios capaces de opinar sobre si alguien entra.
  phase: () => {
    const { started, userId, account, failure } = get()
    return phaseOf({ started, userId, account, failure })
  },

  session: (user) =>
    set({
      userId: user?.id ?? null,
      email: user?.email ?? null,
      // Al cambiar de sesión la cuenta de antes deja de valer, y dejarla
      // puesta un instante enseñaría la aplicación a quien acaba de entrar
      // antes de saber si puede.
      account: null,
      failure: null,
    }),

  loaded: (account) => set({ account, failure: null, started: true }),
  failed: (failure) => set({ failure, account: null, started: true }),
  markStarted: () => set({ started: true }),
}))
