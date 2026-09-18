// La cuenta con la que se entra en la web.
//
// «Cuenta» y no «perfil» a propósito: en Ajustes ya hay un *perfil* —el nombre
// y el correo que el candidato escribe para sí mismo, que viven en su navegador
// y viajan en el fichero de estado—. Esto es otra cosa: la identidad de verdad,
// la que gobierna la base de datos. La tabla se llama `profiles` porque así se
// llama en Supabase; de este lado se llama cuenta, y así no hay dos cosas con
// el mismo nombre.

export type AccountRole = 'candidate' | 'admin'

/**
 * `pending` es donde cae todo el que se registra: la cuenta existe y no puede
 * hacer nada hasta que una persona la apruebe.
 */
export type AccountStatus = 'pending' | 'approved' | 'revoked'

/** Una fila de `profiles`, ya traducida a los nombres de esta casa. */
export interface Account {
  userId: string
  email: string
  role: AccountRole
  status: AccountStatus
  createdAt: string
  decidedAt: string | null
}

/** Lo que se sabe de la sesión antes de haber leído la cuenta. */
export interface SignedInUser {
  id: string
  email: string
}
