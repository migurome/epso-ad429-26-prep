// La entrega de un fichero al navegador.
//
// Tres líneas de código y un test, porque la que importa no falla nunca a la
// vista: si la URL temporal no se libera, el contenido entero se queda en
// memoria mientras la pestaña siga abierta y nada lo delata.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { downloadText } from './download'

let creadas: string[]
let liberadas: string[]

beforeEach(() => {
  creadas = []
  liberadas = []
  let n = 0
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => {
      const url = `blob:falsa/${++n}`
      creadas.push(url)
      return url
    }),
    revokeObjectURL: vi.fn((url: string) => liberadas.push(url)),
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('entregar un fichero', () => {
  it('libera la URL temporal en vez de dejarla colgando', () => {
    // Lo que se vigila aquí: sin esto, el fichero entero se queda en memoria
    // hasta que se cierre la pestaña, y no hay síntoma que lo delate.
    downloadText('{"a":1}', 'cosa.json')
    expect(liberadas).toEqual(creadas)
  })

  it('pincha un enlace con el nombre pedido', () => {
    const clicks: { download: string; href: string }[] = []
    const original = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push({ download: this.download, href: this.href })
    }
    try {
      downloadText('{}', 'epso-progreso-yo-2026-09-18.json')
    } finally {
      HTMLAnchorElement.prototype.click = original
    }

    expect(clicks).toHaveLength(1)
    expect(clicks[0].download).toBe('epso-progreso-yo-2026-09-18.json')
    expect(clicks[0].href).toBe(creadas[0])
  })

  it('no deja el enlace pegado en la página', () => {
    // Nunca se añade al documento: no hace falta para pinchar en él, y añadirlo
    // dejaría basura en el DOM en cada descarga.
    downloadText('{}', 'cosa.json')
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
})
