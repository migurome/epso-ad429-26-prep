// Figuras del motor de razonamiento abstracto.
//
// El motor (el repositorio «Abstract figures Gen») entrega cada figura ya
// renderizada como SVG, y aquí no se vuelve a pintar a propósito: la unicidad
// de la respuesta se demuestra sobre SU escena, y otro renderizador enseñaría
// al candidato algo distinto de lo que se demostró.
//
// Se pintan con <img src="data:image/svg+xml,…"> en vez de insertar el
// marcado en el DOM. Dentro de una <img> un SVG no ejecuta scripts ni carga
// recursos, sus estilos no se escapan a la página, y sus ids no chocan con los
// de otra figura: el rayado usa <pattern id>, y una pregunta lleva once.

/** Lo que un SVG del motor no puede contener. Dentro de una <img> nada de esto
 * llegaría a ejecutarse, pero un fichero que lo traiga no ha salido del motor
 * tal cual, así que se rechaza al importar en vez de confiar en el
 * aislamiento. */
const FORBIDDEN: { pattern: RegExp; es: string; en: string }[] = [
  { pattern: /<script\b/i, es: 'contiene <script>', en: 'contains <script>' },
  { pattern: /<foreignObject\b/i, es: 'contiene <foreignObject>', en: 'contains <foreignObject>' },
  { pattern: /\son[a-z]+\s*=/i, es: 'lleva un atributo de evento (on…)', en: 'carries an event attribute (on…)' },
  {
    // Una referencia interna ('#rayado') es legítima; cualquier otra carga algo
    // de fuera, que en un sitio estático es justo lo que no puede pasar.
    pattern: /(?:xlink:)?href\s*=\s*["'](?!#)/i,
    es: 'enlaza un recurso externo',
    en: 'links an external resource',
  },
  { pattern: /javascript:/i, es: 'contiene «javascript:»', en: 'contains «javascript:»' },
]

/** Por qué un SVG no vale, en los dos idiomas; `null` si vale. */
export function svgProblem(svg: string): { es: string; en: string } | null {
  const text = svg.trim()
  if (!text.startsWith('<svg')) return { es: 'no empieza por <svg', en: 'does not start with <svg' }
  if (!text.endsWith('</svg>')) return { es: 'no termina en </svg>', en: 'does not end with </svg>' }
  // Sin viewBox la figura no escala: se pintaría a su tamaño en píxeles y se
  // saldría de la celda o quedaría diminuta.
  if (!/\sviewBox="[^"]+"/.test(text)) return { es: 'no declara viewBox', en: 'declares no viewBox' }
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(text)) return { es: rule.es, en: rule.en }
  }
  // Tiene que ser XML bien formado. Dentro de una <img> el navegador no
  // perdona nada: un atributo repetido basta para que la figura entera no se
  // pinte, sin ningún error visible. Así llegaron tres preguntas del primer
  // banco del motor —un `fill` duplicado en los trazos girados— y ninguna de
  // las comprobaciones de arriba lo vio, porque el marcado parecía correcto.
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml')
  const error = parsed.getElementsByTagName('parsererror')[0]
  if (error) {
    const detail = (error.textContent ?? '').trim().slice(0, 120)
    return { es: `no es XML válido (${detail})`, en: `is not valid XML (${detail})` }
  }
  return null
}

/** El SVG como URL de datos, para una <img>. Se codifica entero: un `#` sin
 * escapar corta la URL y deja la figura a medias sin ningún error visible. */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
