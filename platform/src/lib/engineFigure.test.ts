// Las figuras del motor llegan como SVG y se pintan dentro de una <img>. Esa
// <img> ya aísla el marcado, pero el importador RECHAZA antes cualquier SVG que
// no haya podido salir del motor tal cual: si un fichero trae un <script>, algo
// lo ha tocado por el camino, y confiar en el aislamiento sería mirar hacia
// otro lado.
import { describe, it, expect } from 'vitest'
import { svgDataUri, svgProblem } from './engineFigure'

/** Con la forma exacta que produce `renderScene` del motor, rayado incluido. */
const ENGINE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img">' +
  '<defs><pattern id="h1" width="6" height="6" patternUnits="userSpaceOnUse">' +
  '<path d="M0 6L6 0" stroke="#1a1d21"/></pattern></defs>' +
  '<rect width="100" height="100" fill="#ffffff"/>' +
  '<circle cx="50" cy="50" r="20" fill="url(#h1)"/>' +
  '<use href="#h1"/>' +
  '<rect x="1" y="1" width="98" height="98" fill="none" stroke="#2f3742" stroke-width="1.4"/>' +
  '</svg>'

const withBody = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`

describe('un SVG tal como sale del motor', () => {
  it('se acepta', () => {
    expect(svgProblem(ENGINE_SVG)).toBeNull()
  })

  it('acepta espacios alrededor', () => {
    expect(svgProblem(`\n  ${ENGINE_SVG}  \n`)).toBeNull()
  })

  it('acepta una referencia interna, que es como funciona el rayado', () => {
    // `href="#h1"` apunta a un <pattern> del propio SVG; confundirlo con un
    // enlace externo rechazaría todas las figuras rayadas del banco. Con el
    // espacio de nombres declarado: sin él, `xlink:` ni siquiera es XML válido
    // y el navegador tampoco lo pintaría.
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">' +
      '<use href="#h1"/><use xlink:href="#h2"/></svg>'
    expect(svgProblem(svg)).toBeNull()
  })
})

describe('lo que no puede haber salido del motor', () => {
  it.each([
    ['un <script>', withBody('<script>alert(1)</script>')],
    ['un <script> en mayúsculas', withBody('<SCRIPT>alert(1)</SCRIPT>')],
    ['un <foreignObject>', withBody('<foreignObject><div>hola</div></foreignObject>')],
    ['un atributo onload', withBody('<rect onload="alert(1)"/>')],
    ['un atributo onclick', withBody('<circle onclick="x()"/>')],
    ['un enlace externo', withBody('<use href="https://ejemplo.eu/figura.svg#a"/>')],
    ['un xlink:href externo', withBody('<image xlink:href="figura.png"/>')],
    ['un javascript:', withBody('<a href="#x"><rect style="background:url(javascript:alert(1))"/></a>')],
  ])('rechaza %s', (_caso, svg) => {
    expect(svgProblem(svg)).not.toBeNull()
  })

  it('rechaza lo que no es un SVG', () => {
    expect(svgProblem('<div>no soy una figura</div>')).not.toBeNull()
  })

  it('rechaza un SVG cortado por la mitad, y dice que está cortado', () => {
    // Un fichero truncado al copiarlo pintaría media figura sin dar error. El
    // análisis XML también lo rechazaría, pero culpando a la etiqueta donde cae
    // el corte, que parece un defecto del renderizador del motor. «No termina en
    // </svg>» manda a mirar la copia, no a abrir una incidencia en el motor.
    const problem = svgProblem(ENGINE_SVG.slice(0, ENGINE_SVG.length - 20))
    expect(problem).not.toBeNull()
    expect(problem!.es).toContain('</svg>')
    expect(problem!.en).toContain('</svg>')
  })

  it('rechaza un SVG sin viewBox, que no escalaría a la casilla', () => {
    expect(svgProblem('<svg xmlns="http://www.w3.org/2000/svg" width="100"><rect/></svg>')).not.toBeNull()
  })

  it('explica el problema en los dos idiomas', () => {
    const problem = svgProblem(withBody('<script/>'))!
    expect(problem.es.trim()).not.toBe('')
    expect(problem.en.trim()).not.toBe('')
  })
})

describe('la URL de datos', () => {
  it('es de tipo SVG', () => {
    expect(svgDataUri(ENGINE_SVG)).toMatch(/^data:image\/svg\+xml;charset=utf-8,/)
  })

  it('escapa la almohadilla, que si no cortaría la URL a mitad de figura', () => {
    // `fill="url(#h1)"` lleva '#'. Sin escapar, el navegador lo toma por el
    // inicio del fragmento y la figura se queda sin el resto del marcado.
    const uri = svgDataUri(ENGINE_SVG)
    expect(uri.slice(uri.indexOf(',') + 1)).not.toContain('#')
  })

  it('devuelve exactamente el SVG al decodificarla', () => {
    const uri = svgDataUri(ENGINE_SVG)
    expect(decodeURIComponent(uri.slice(uri.indexOf(',') + 1))).toBe(ENGINE_SVG)
  })
})

describe('un SVG que no es XML bien formado', () => {
  it('rechaza un atributo repetido, aunque el marcado parezca correcto', () => {
    // El defecto real del primer banco del motor: un trazo girado con el
    // relleno común y, al final, `fill="none"`. El navegador no pinta la
    // figura, y ninguna de las otras comprobaciones lo veía.
    const svg = withBody(
      '<path d="M 45 50 L 55 50" fill="#1a1d21" stroke="#1a1d21" transform="rotate(90 50 50)" fill="none"/>',
    )
    const problem = svgProblem(svg)
    expect(problem).not.toBeNull()
    expect(problem!.es).toMatch(/XML/)
    expect(problem!.en).toMatch(/XML/)
  })

  it('rechaza una etiqueta sin cerrar', () => {
    expect(svgProblem(withBody('<g><rect width="10" height="10"/>'))).not.toBeNull()
  })

  it('el motivo dice qué ha fallado, no sólo que ha fallado', () => {
    const problem = svgProblem(withBody('<rect fill="#000" fill="none"/>'))!
    expect(problem.es).toMatch(/fill/)
  })
})
