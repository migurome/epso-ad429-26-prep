#!/usr/bin/env node
// Verificación completa de la plataforma en un solo comando: `npm run verify`.
//
// Encadena las etapas en el orden en que un fallo es más barato de entender —
// primero el contenido, que es de donde sale todo lo demás; luego los tipos,
// el estilo, los tests y la construcción; y al final una auditoría de lo que
// realmente queda en dist/, que es lo único que ve el navegador.
//
// Cada etapa es independiente y se puede lanzar sola:
//   node scripts/verify.mjs --only=unit
//   node scripts/verify.mjs --skip=lint,build
//
// El proceso termina con código 1 si algo falla, para que valga tal cual en
// un hook de git o en CI.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const REPO = dirname(ROOT)

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const OFF = '\x1b[0m'

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const only = flag('only')?.split(',').filter(Boolean)
const skip = flag('skip')?.split(',').filter(Boolean) ?? []
const verbose = args.includes('--verbose')

/** Ejecuta un comando en platform/ y devuelve {ok, output}. */
function run(command, { cwd = ROOT } = {}) {
  const result = spawnSync(command, { cwd, shell: true, encoding: 'utf8' })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  return { ok: result.status === 0, output, status: result.status }
}

/** Las etapas devuelven true, o lanzan/devuelven un mensaje de error. Las que
 * no aplican en esta máquina devuelven {skipped: 'motivo'}. */
const STAGES = [
  {
    id: 'content',
    title: 'El contenido generado corresponde a los Docs/*.md actuales',
    run: () => {
      const python = run('python --version')
      if (!python.ok) return { skipped: 'python no está disponible en el PATH' }

      const built = run('python scripts/build_content.py')
      if (!built.ok) return { error: `build_content.py ha fallado:\n${built.output}` }

      // Si regenerar cambia algo, es que alguien editó un documento y no
      // volvió a construir: lo que hay en src/data no es lo que dicen los Docs.
      //
      // Sólo se miran los archivos GENERADOS. En src/data conviven con ellos
      // piezas escritas a mano —contentLoader.ts, content.ts— y compararlas
      // aquí convertiría cualquier edición legítima de esas piezas en un fallo
      // de sincronía que no lo es.
      const diff = run('git diff --name-only -- "src/data/*.generated.ts"', { cwd: ROOT })
      const dirty = diff.output
        .split('\n')
        .map((s) => s.trim())
        // git avisa por stderr del cambio de fin de línea en Windows; eso no es
        // un archivo y no debe aparecer en la lista de problemas.
        .filter((line) => line && !line.startsWith('warning:'))
      if (dirty.length) {
        return {
          error:
            'regenerar el contenido ha cambiado archivos ya versionados;\n' +
            'los Docs/*.md y src/data/*.generated.ts estaban desincronizados.\n' +
            'Revisa y commitea:\n  - ' +
            dirty.join('\n  - '),
        }
      }
      return { detail: built.output.trim().split('\n').at(-2) ?? '' }
    },
  },
  {
    id: 'typecheck',
    title: 'TypeScript compila sin errores',
    run: () => {
      const r = run('npx tsc -b')
      return r.ok ? {} : { error: r.output }
    },
  },
  {
    id: 'lint',
    title: 'El linter no encuentra problemas',
    run: () => {
      const r = run('npx oxlint')
      if (r.ok) return {}
      // oxlint es un binario nativo. En equipos con Control de aplicaciones de
      // Windows (o WDAC) el .node viene bloqueado por directiva y el proceso
      // ni siquiera arranca: eso no es un hallazgo del linter y no debe
      // teñirse de rojo como si el código estuviera mal.
      if (/Cannot find module '\.\/oxlint|Control de aplicaciones|Application Control/i.test(r.output)) {
        return { skipped: 'el binario nativo de oxlint está bloqueado en este equipo' }
      }
      return { error: r.output }
    },
  },
  {
    id: 'unit',
    title: 'Tests: contenido, rutas, componentes y utilidades',
    run: () => {
      const r = run('npx vitest run --reporter=dot')
      const summary = r.output.match(/Tests\s+.*/)?.[0]?.trim()
      return r.ok ? { detail: summary } : { error: r.output }
    },
  },
  {
    id: 'build',
    title: 'La construcción de producción termina',
    run: () => {
      const r = run('npx vite build')
      return r.ok ? {} : { error: r.output }
    },
  },
  {
    id: 'dist',
    title: 'Lo publicado en dist/ está completo y bien enlazado',
    run: () => distAudit(),
  },
]

// ── Auditoría de dist/ ──────────────────────────────────────────────────────
// jsdom no descarga nada: los tests de rutas pasan aunque falte un .webp o
// aunque la ruta base sea otra. Esto se comprueba sobre los archivos reales.
function distAudit() {
  const dist = join(ROOT, 'dist')
  if (!existsSync(dist)) return { error: 'no existe dist/ — lanza primero la etapa build' }

  const problems = []

  const indexPath = join(dist, 'index.html')
  if (!existsSync(indexPath)) return { error: 'falta dist/index.html' }
  const index = readFileSync(indexPath, 'utf8')

  // La ruta base tiene que ser la que espera GitHub Pages: si cambia, la web
  // publicada carga un index en blanco y ningún test de jsdom lo nota.
  const base = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8').match(/base:\s*'([^']+)'/)?.[1]
  if (!base) problems.push('no se ha podido leer `base` de vite.config.ts')
  else if (!index.includes(base)) problems.push(`dist/index.html no referencia la ruta base ${base}`)

  // Todo lo que index.html pide tiene que existir en disco.
  const referenced = [...index.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((href) => base && href.startsWith(base))
    .map((href) => href.slice(base.length))
  for (const rel of referenced) {
    if (!existsSync(join(dist, rel))) problems.push(`dist/index.html enlaza a ${rel}, que no existe`)
  }
  if (!referenced.some((r) => r.endsWith('.js'))) {
    problems.push('dist/index.html no carga ningún módulo JavaScript')
  }

  // Un chunk de contenido por bloque: si Rollup deja de separarlos, la carga
  // inicial pasa a arrastrar las ~970 preguntas de golpe.
  const assets = existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')) : []
  const chunks = assets.filter((f) => f.startsWith('content.') && f.endsWith('.js'))
  const sources = readdirSync(join(ROOT, 'src', 'data')).filter(
    (f) => f.startsWith('content.') && f.endsWith('.generated.ts'),
  )
  if (chunks.length !== sources.length) {
    problems.push(
      `${chunks.length} chunks de contenido en dist/assets para ${sources.length} bloques generados`,
    )
  }

  // Las 240 figuras del banco real de razonamiento abstracto: son archivos
  // estáticos, no pasan por el bundler, y su ausencia sólo se ve al abrir la
  // página como una imagen rota.
  const figureIds = [
    ...readFileSync(join(ROOT, 'src', 'data', 'scannedFigures.generated.ts'), 'utf8').matchAll(
      /'([^']+)'/g,
    ),
  ].map((m) => m[1])
  const missingFigures = figureIds.flatMap((id) =>
    ['prompt', 'options']
      .map((kind) => `figures/abstract/${id}-${kind}.webp`)
      .filter((rel) => !existsSync(join(dist, rel))),
  )
  if (missingFigures.length) {
    const n = missingFigures.length
    problems.push(
      n === 1
        ? `falta una figura en dist/: ${missingFigures[0]}`
        : `faltan ${n} figuras en dist/, empezando por ${missingFigures[0]}`,
    )
  }

  // Un archivo de 0 bytes se cuela sin que nada falle hasta que se abre.
  const empty = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (statSync(full).size === 0) empty.push(full.slice(dist.length + 1))
    }
  }
  walk(dist)
  if (empty.length) problems.push(`archivos vacíos en dist/: ${empty.join(', ')}`)

  if (problems.length) return { error: problems.map((p) => `  - ${p}`).join('\n') }
  return {
    detail:
      `${figureIds.length} preguntas ilustradas (${figureIds.length * 2} .webp), ` +
      `${chunks.length} chunks de contenido, base ${base}`,
  }
}

// ── Ejecución ───────────────────────────────────────────────────────────────
const selected = STAGES.filter((s) => (only ? only.includes(s.id) : true)).filter(
  (s) => !skip.includes(s.id),
)

if (!selected.length) {
  console.error(`No hay etapas que ejecutar. Disponibles: ${STAGES.map((s) => s.id).join(', ')}`)
  process.exit(2)
}

console.log(`\n${BOLD}Verificación de la plataforma${OFF} ${DIM}(${REPO})${OFF}\n`)

const results = []
for (const stage of selected) {
  process.stdout.write(`${BOLD}▸ ${stage.id}${OFF} ${DIM}${stage.title}${OFF}\n`)
  const started = Date.now()
  let outcome
  try {
    outcome = stage.run() ?? {}
  } catch (err) {
    outcome = { error: err instanceof Error ? err.stack ?? err.message : String(err) }
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1)

  if (outcome.skipped) {
    console.log(`  ${YELLOW}omitida${OFF} ${DIM}${outcome.skipped}${OFF}\n`)
    results.push({ id: stage.id, state: 'skip' })
  } else if (outcome.error) {
    console.log(`  ${RED}FALLA${OFF} ${DIM}(${seconds}s)${OFF}`)
    console.log(`${outcome.error.trimEnd()}\n`)
    results.push({ id: stage.id, state: 'fail' })
  } else {
    const detail = outcome.detail ? ` ${DIM}${outcome.detail}${OFF}` : ''
    console.log(`  ${GREEN}correcta${OFF} ${DIM}(${seconds}s)${OFF}${detail}\n`)
    results.push({ id: stage.id, state: 'pass' })
    if (verbose && outcome.output) console.log(outcome.output)
  }
}

const failed = results.filter((r) => r.state === 'fail')
const skipped = results.filter((r) => r.state === 'skip')
const line = results
  .map((r) => {
    const mark = r.state === 'pass' ? `${GREEN}✔${OFF}` : r.state === 'fail' ? `${RED}✘${OFF}` : `${YELLOW}–${OFF}`
    return `${mark} ${r.id}`
  })
  .join('   ')

console.log(`${BOLD}Resumen${OFF}  ${line}`)
if (failed.length) {
  console.log(`\n${RED}${failed.length} etapa(s) con fallos: ${failed.map((f) => f.id).join(', ')}${OFF}\n`)
  process.exit(1)
}
console.log(
  `\n${GREEN}Todo correcto${OFF}${skipped.length ? ` ${DIM}(${skipped.length} omitida(s))${OFF}` : ''}\n`,
)
