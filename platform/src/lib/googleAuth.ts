// El permiso de Google, aislado en su propio módulo.
//
// La web es estática: no hay servidor donde guardar un secreto, así que el
// navegador pide el permiso directamente con «Google Identity Services» y
// recibe un token de acceso que dura una hora. No hay token de refresco —eso
// sólo se da a un servidor—, y por eso de vez en cuando hay que volver a
// autorizar con un clic.
//
// El identificador de cliente NO es un secreto: va en el paquete a la vista de
// todos, y lo que impide que otro lo use es la lista de orígenes autorizados
// que se configura en Google Cloud. Un secreto de verdad no podría vivir aquí.
//
// El token se guarda sólo en memoria. En `localStorage` sobreviviría al cierre
// del navegador y seguiría siendo válido un rato para quien se sentara después
// delante del ordenador; tenerlo en memoria significa volver a pedirlo al
// recargar, que es un precio pequeño.

/** Lo que la aplicación necesita: sólo lo que ella misma crea en Drive. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void
}

interface GoogleIdentity {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string
        scope: string
        prompt?: string
        callback: (response: TokenResponse) => void
        error_callback?: (error: { type?: string; message?: string }) => void
      }): TokenClient
      revoke(token: string, done?: () => void): void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleAuthError'
  }
}

let scriptLoad: Promise<GoogleIdentity> | null = null

/** Carga el script de Google una sola vez, por muchas veces que se llame. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (scriptLoad) return scriptLoad
  scriptLoad = new Promise<GoogleIdentity>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google)
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => {
      if (window.google?.accounts?.oauth2) resolve(window.google)
      else reject(new GoogleAuthError('el script de Google cargó pero no trae lo que esperábamos'))
    }
    script.onerror = () => {
      scriptLoad = null
      reject(new GoogleAuthError('no se pudo cargar el script de Google; ¿hay conexión?'))
    }
    document.head.appendChild(script)
  })
  return scriptLoad
}

let cached: { token: string; expiresAt: number } | null = null
/** Margen antes de que caduque: pedirlo justo al límite deja peticiones a medias. */
const EARLY_MS = 60_000

/**
 * Un token de acceso válido.
 *
 * `interactive: false` intenta renovarlo sin molestar, que es lo que se hace al
 * arrancar la sesión y cada cinco minutos. Con `true` Google abre su ventana de
 * permiso, y eso **tiene que salir de un clic** del candidato o el navegador la
 * bloqueará por ser una ventana emergente no pedida.
 */
export async function getAccessToken(
  clientId: string,
  { interactive }: { interactive: boolean },
): Promise<string> {
  if (cached && cached.expiresAt - EARLY_MS > Date.now()) return cached.token
  if (!clientId) throw new GoogleAuthError('falta el identificador de cliente de Google')

  const google = await loadGoogleIdentity()
  return await new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (!response.access_token) {
          reject(
            new GoogleAuthError(
              response.error_description ?? response.error ?? 'Google no dio el permiso',
            ),
          )
          return
        }
        cached = {
          token: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
        }
        resolve(response.access_token)
      },
      error_callback: (error) => {
        reject(new GoogleAuthError(error.message ?? error.type ?? 'Google rechazó la petición'))
      },
    })
    // Cadena vacía: «no preguntes si no hace falta». Con `consent` Google
    // vuelve a enseñar la pantalla de permisos siempre.
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

/** Olvida el token de esta pestaña y retira el permiso en Google. */
export async function forgetAccessToken(): Promise<void> {
  const token = cached?.token
  cached = null
  if (!token) return
  const google = await loadGoogleIdentity().catch(() => null)
  google?.accounts.oauth2.revoke(token)
}

/** Sólo para los tests: deja el módulo como recién cargado. */
export function resetGoogleAuthForTests(): void {
  cached = null
  scriptLoad = null
}
