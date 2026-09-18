import type { DriveBackend, RemoteFile } from './driveSync'

// Las llamadas a la API de Drive, y nada más: aquí no hay ninguna decisión
// sobre qué sincronizar (eso está en `driveSync.ts`, probado sin red).
//
// Se usa `fetch` contra la API REST en vez de la biblioteca `gapi` de Google:
// son cuatro llamadas contadas, y meter un cliente entero para eso añadiría
// otro script externo que cargar y otra versión que vigilar.
//
// El permiso que pide la aplicación es `drive.file`, el más estrecho que
// existe: sólo alcanza a los ficheros y carpetas que ella misma crea. El resto
// del Drive del candidato es invisible para la web, y eso es a propósito.

const FILES = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

export class DriveError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'DriveError'
    this.status = status
  }
}

/** Las comillas simples son el único carácter que rompe una consulta de Drive. */
function quote(value: string): string {
  return value.replace(/'/g, "\\'")
}

async function call(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new DriveError(
      `Drive respondió ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
      response.status,
    )
  }
  return response
}

/** La carpeta de la aplicación, creada la primera vez. */
export async function ensureFolder(token: string, name: string): Promise<string> {
  const query = `mimeType='${FOLDER_MIME}' and name='${quote(name)}' and trashed=false`
  const found = (await (
    await call(token, `${FILES}?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`)
  ).json()) as { files?: { id: string }[] }
  if (found.files && found.files.length > 0) return found.files[0].id

  const created = (await (
    await call(token, `${FILES}?fields=id`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME }),
    })
  ).json()) as { id: string }
  return created.id
}

export async function findFile(
  token: string,
  folderId: string,
  name: string,
): Promise<{ id: string; modifiedTime: string } | null> {
  const query = `name='${quote(name)}' and '${quote(folderId)}' in parents and trashed=false`
  const found = (await (
    await call(
      token,
      `${FILES}?q=${encodeURIComponent(query)}&fields=files(id,modifiedTime)&pageSize=1`,
    )
  ).json()) as { files?: { id: string; modifiedTime: string }[] }
  return found.files && found.files.length > 0 ? found.files[0] : null
}

export async function downloadFile(token: string, fileId: string): Promise<string> {
  return await (await call(token, `${FILES}/${fileId}?alt=media`)).text()
}

/**
 * Sube el estado, creando el fichero o reescribiendo el que ya está.
 *
 * Va en una sola petición «multipart»: los metadatos y el contenido juntos. En
 * dos peticiones, un corte de red entre ellas dejaría en Drive un fichero
 * vacío con el nombre bueno, que es peor que no tener ninguno.
 */
export async function uploadFile(
  token: string,
  options: { fileId?: string; folderId: string; name: string; text: string },
): Promise<{ fileId: string; modifiedTime: string }> {
  const { fileId, folderId, name, text } = options
  const boundary = `epso-${Math.random().toString(36).slice(2)}`
  const metadata = fileId ? { name } : { name, parents: [folderId] }
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    text,
    `--${boundary}--`,
    '',
  ].join('\r\n')

  const url = `${UPLOAD}${fileId ? `/${fileId}` : ''}?uploadType=multipart&fields=id,modifiedTime`
  const written = (await (
    await call(token, url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: { 'content-type': `multipart/related; boundary=${boundary}` },
      body,
    })
  ).json()) as { id: string; modifiedTime: string }
  return { fileId: written.id, modifiedTime: written.modifiedTime }
}

/**
 * El acceso a Drive tal como lo espera el sincronizador.
 *
 * `getToken` se pide en cada llamada y no se guarda: el token de Google dura
 * una hora, y quien lo tenga guardado acabará usando uno caducado.
 */
export function driveBackend(options: {
  getToken: () => Promise<string>
  folderId: string
  fileName: string
  fileId?: string
}): DriveBackend {
  const { getToken, folderId, fileName } = options
  let known = options.fileId

  return {
    async read(): Promise<RemoteFile | null> {
      const token = await getToken()
      const found = await findFile(token, folderId, fileName)
      if (!found) return null
      known = found.id
      return {
        fileId: found.id,
        modifiedTime: found.modifiedTime,
        text: await downloadFile(token, found.id),
      }
    },
    async write(text: string, fileId?: string) {
      const token = await getToken()
      const written = await uploadFile(token, {
        fileId: fileId ?? known,
        folderId,
        name: fileName,
        text,
      })
      known = written.fileId
      return written
    },
  }
}
