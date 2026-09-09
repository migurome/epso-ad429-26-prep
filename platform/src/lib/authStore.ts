import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Puerta de entrada a la plataforma.
//
// Conviene decir con claridad qué es y qué no es esto. La aplicación es
// estática: no hay servidor, no hay sesión que validar y todo el contenido se
// sirve desde el mismo sitio público. Las credenciales de abajo viajan dentro
// del paquete JavaScript y cualquiera con las herramientas del navegador puede
// leerlas. Esto es un cerrojo de puerta mosquitera, no una cerradura: sirve
// para que la página no se abra sola ante quien pase por delante, y para nada
// más. Nada de lo que hay detrás es secreto —son apuntes de oposición—, así que
// la protección es proporcionada al valor de lo protegido.
//
// Si algún día hubiera datos que sí importara proteger, esto habría que
// sustituirlo por autenticación de verdad contra un servidor.

const USER = 'migurome'
const PASSWORD = 'migurome'

/** Penalización por intento fallido, en milisegundos. Con las credenciales
 * dentro del paquete no frena a nadie decidido; frena el tanteo a ciegas. */
export const FAILED_ATTEMPT_DELAY_MS = 3000

interface AuthState {
  user: string | null
  signIn: (user: string, password: string) => boolean
  signOut: () => void
}

/** Compara sin distinguir mayúsculas en el usuario, como cualquier login. */
export function credentialsMatch(user: string, password: string): boolean {
  return user.trim().toLowerCase() === USER && password === PASSWORD
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user, password) => {
        if (!credentialsMatch(user, password)) return false
        set({ user: user.trim() })
        return true
      },
      signOut: () => set({ user: null }),
    }),
    { name: 'epso-prep-auth' },
  ),
)
