// Invariantes del contenido, comprobadas sobre TODOS los bloques a la vez.
//
// El contenido no se escribe a mano: sale de Docs/*.md a través de
// scripts/build_content.py. Por eso los fallos aquí no son "un test roto",
// son un documento mal escrito o un cambio del parser que ha degradado el
// material sin que nada más se entere. Los tres tipos de daño que ya han
// ocurrido en este repositorio y que estas comprobaciones cierran:
//
//   1. Sesgo de letra en las respuestas (commit 4414216): un banco entero con
//      la correcta casi siempre en la misma opción, memorizable sin saber la
//      materia.
//   2. Traducción ausente: una opción con texto en inglés y cadena vacía en
//      español, que en la interfaz sale como un hueco en blanco.
//   3. Figura sin declarar: una pregunta del banco real que no aparece en
//      SCANNED_FIGURES y por tanto se intenta redibujar desde el texto.
//
// La lógica vive en src/lib/selfCheck.ts, no aquí, porque la página
// /verificacion ejecuta exactamente las mismas comprobaciones dentro del
// navegador sobre la web publicada. Este archivo sólo las recorre y exige que
// no haya incidencias.
import { describe, it, expect } from 'vitest'
import {
  CONTENT_TARGETS,
  checkCompetitions,
  checkEufte,
  checkFieldOwnership,
  checkFigureCoverage,
  checkTestDay,
  checkTarget,
  checkUniqueIds,
  type Check,
} from '../lib/selfCheck'

/** Un fallo tiene que decir QUÉ está mal y DÓNDE, no sólo que algo falla. */
function report(check: Check): string {
  return `\n${check.label.es}\n  - ${check.issues
    .map((i) => `${i.where}: ${i.problem.es}`)
    .join('\n  - ')}\n`
}

function expectClean(check: Check) {
  expect(check.issues, report(check)).toEqual([])
}

describe('integridad del contenido', () => {
  // Se acumulan las incidencias de las cuatro comprobaciones del bloque antes
  // de fallar: un solo `vitest run` dice todo lo que hay que arreglar en ese
  // banco, no lo primero que se tuerce.
  it.each(CONTENT_TARGETS.map((t) => [t.id, t] as const))('%s', async (_id, target) => {
    const checks = await checkTarget(target)
    expect(checks.length).toBeGreaterThan(0)
    const failed = checks.filter((c) => c.issues.length)
    expect(failed.map((c) => c.label.es), failed.map(report).join('')).toEqual([])
  })

  it('ningún identificador de pregunta se repite entre bloques', async () => {
    expectClean(await checkUniqueIds())
  })

  it('los enunciados de EUFTE están completos en los dos idiomas', async () => {
    expectClean(await checkEufte())
  })

  it('la guía del día del examen trae teoría en los dos idiomas', async () => {
    expectClean(await checkTestDay())
  })

  it('cada pregunta del banco real declara su figura', async () => {
    expectClean(await checkFigureCoverage())
  })
})

describe('metadatos de las convocatorias', () => {
  it.each(checkCompetitions().map((c) => [c.label.es, c] as const))('%s', (_label, check) => {
    expectClean(check)
  })

  it('cada ámbito pertenece exactamente a una convocatoria', () => {
    expectClean(checkFieldOwnership())
  })
})
