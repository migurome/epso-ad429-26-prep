// El identificador de cliente OAuth con el que la web pide permiso a Drive.
//
// Va aquí, a la vista, porque **no es un secreto**: en una aplicación que vive
// entera en el navegador no hay dónde esconder nada, y Google lo sabe. Lo que
// impide que otro sitio lo use es la lista de orígenes autorizados que se
// configura en Google Cloud junto a él; sin estar en esa lista, el mismo
// identificador no sirve para nada.
//
// Vacío significa «sin sincronización»: la tarjeta de Ajustes lo dice y no se
// carga ningún script de Google. Se puede rellenar de dos maneras:
//
//   · aquí, y entonces vale para todos los dispositivos sin configurar nada;
//   · pegándolo en Ajustes, que lo guarda sólo en ese navegador.
export const GOOGLE_CLIENT_ID = ''

/** El que manda: lo pegado a mano en este navegador, o lo compilado. */
export function resolveClientId(fromSettings: string): string {
  return (fromSettings || GOOGLE_CLIENT_ID).trim()
}
