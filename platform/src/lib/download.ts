// Entregar un fichero al navegador sin servidor que lo sirva.
//
// Vive aparte y no dentro de la página que lo usa por una razón concreta: la
// línea que de verdad importa es la última. Una URL de objeto que no se libera
// mantiene vivo el contenido entero en memoria mientras la pestaña siga
// abierta, y eso no se nota nunca —no falla nada, no avisa nadie—, así que sólo
// un test puede impedir que se pierda.

export function downloadText(text: string, filename: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
