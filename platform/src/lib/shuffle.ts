/** Barajado determinista: la misma semilla da siempre el mismo orden, que es
 * lo que permite que el orden de un banco sobreviva a recargar la página.
 * La semilla cero deja el orden del documento sin tocar. */
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const result = [...items]
  if (!seed) return result
  const random = mulberry32(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Generador pseudoaleatorio de 32 bits, pequeño y de distribución uniforme.
 * Hace falta uno propio porque Math.random no admite semilla. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
