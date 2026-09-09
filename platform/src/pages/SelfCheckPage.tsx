// Verificación desde el propio navegador, sin terminal.
//
// No sustituye a `node scripts/verify.mjs`: aquel comprueba el repositorio
// (tipos, tests, construcción) y éste comprueba la WEB QUE SE ESTÁ VIENDO. Son
// preguntas distintas y las dos importan:
//
//   - verify.mjs responde "¿está bien el código que voy a subir?"
//   - esta página responde "¿funciona de verdad lo que hay publicado, en este
//     dispositivo, con esta conexión y bajo la ruta base real?"
//
// Y hace dos cosas que ninguna prueba en jsdom puede hacer, porque allí no se
// descarga nada: baja de verdad los chunks de contenido y de verdad las 240
// imágenes del banco real de razonamiento abstracto.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RotateCw, XCircle } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { SCANNED_FIGURES } from '../data/scannedFigures.generated'
import { pick, useLocaleStore, type Locale } from '../lib/localeStore'
import { useT } from '../lib/useT'
import {
  CONTENT_TARGETS,
  checkCompetitions,
  checkEufte,
  checkFieldOwnership,
  checkFigureCoverage,
  checkTarget,
  checkTestDay,
  checkUniqueIds,
  type Check,
} from '../lib/selfCheck'

interface Group {
  id: string
  title: string
  checks: Check[]
}

type Phase = 'idle' | 'running' | 'done'

interface Fetched {
  ok: boolean
  /** Bytes que han viajado por la red. 0 significa servido de caché, y por
   * tanto que esta comprobación no ha comprobado nada. */
  bytes: number
}

/** Descarga una imagen de verdad y responde si el navegador ha podido
 * decodificarla. Un 404 bajo la ruta base, un .webp truncado o un archivo de
 * 0 bytes se manifiestan todos aquí, y en ningún otro sitio.
 *
 * Los bytes transferidos se leen de la Resource Timing API y se enseñan en la
 * interfaz: sin ese dato, una pasada que se sirva entera de caché termina en
 * cero segundos y anuncia un éxito que no ha verificado nada. */
function loadImage(src: string): Promise<Fetched> {
  return new Promise((resolve) => {
    const img = new Image()
    const finish = (ok: boolean) => {
      const entry = performance.getEntriesByName(img.src).at(-1) as PerformanceResourceTiming | undefined
      resolve({ ok, bytes: entry?.transferSize ?? 0 })
    }
    img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0)
    img.onerror = () => finish(false)
    img.src = src
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Las figuras se comprueban por tandas: 240 descargas simultáneas saturan la
 * cola del navegador y falsean el resultado con tiempos de espera. */
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
  }
  return results
}

export function SelfCheckPage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const [phase, setPhase] = useState<Phase>('idle')
  const [groups, setGroups] = useState<Group[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [elapsed, setElapsed] = useState(0)
  const [bytes, setBytes] = useState(0)
  const cancelled = useRef(false)
  /** Cambia en cada pasada y se cuela en la URL de las imágenes, para que el
   * navegador las pida de verdad en lugar de servirlas de su caché en memoria.
   * Sin esto, «Repetir» terminaba en 0,0 s sin una sola petición de red y aun
   * así anunciaba que las 240 imágenes estaban bien. */
  const runToken = useRef(0)

  const run = useCallback(async () => {
    cancelled.current = false
    runToken.current += 1
    setPhase('running')
    setGroups([])
    setElapsed(0)
    setBytes(0)
    // Por defecto el buffer guarda 250 entradas y aquí se piden 240 imágenes
    // más los chunks: sin ampliarlo se perderían los bytes de casi todas.
    performance.setResourceTimingBufferSize(3000)
    const started = performance.now()

    const collected: Group[] = []
    const push = (group: Group) => {
      if (cancelled.current) return
      collected.push(group)
      setGroups([...collected])
    }

    // 1. Datos de convocatoria: inmediato, no depende de ninguna descarga.
    push({
      id: 'competitions',
      title: locale === 'es' ? 'Convocatorias' : 'Competitions',
      checks: [...checkCompetitions(), checkFieldOwnership()],
    })

    // 2. Cada bloque de contenido, con su descarga real del chunk.
    const totalSteps = CONTENT_TARGETS.length + 4 + SCANNED_FIGURES.size * 2
    setProgress({ done: 0, total: totalSteps })
    let done = 0

    for (const target of CONTENT_TARGETS) {
      if (cancelled.current) return
      try {
        const checks = await checkTarget(target)
        push({ id: target.id, title: pick(locale, target.label), checks })
      } catch (err) {
        push({
          id: target.id,
          title: pick(locale, target.label),
          checks: [
            {
              id: `${target.id}:load`,
              label: { es: 'Descarga del contenido', en: 'Content download' },
              issues: [
                {
                  where: target.id,
                  problem: {
                    es: `no se ha podido cargar: ${err instanceof Error ? err.message : String(err)}`,
                    en: `failed to load: ${err instanceof Error ? err.message : String(err)}`,
                  },
                },
              ],
            },
          ],
        })
      }
      setProgress({ done: (done += 1), total: totalSteps })
    }

    // 3. Bloques transversales.
    const cross = [await checkUniqueIds(), await checkEufte(), await checkTestDay(), await checkFigureCoverage()]
    done += 4
    setProgress({ done, total: totalSteps })
    push({
      id: 'cross',
      title: locale === 'es' ? 'Comprobaciones transversales' : 'Cross-cutting checks',
      checks: cross,
    })

    // 4. Las imágenes, de verdad. Es lo único que no se puede comprobar
    //    fuera de un navegador.
    if (cancelled.current) return
    const sources = [...SCANNED_FIGURES].flatMap((id) =>
      (['prompt', 'options'] as const).map((kind) => ({
        id: `${id}-${kind}`,
        url: `${import.meta.env.BASE_URL}figures/abstract/${id}-${kind}.webp?v=${runToken.current}`,
      })),
    )
    const broken: string[] = []
    let transferred = 0
    let served = 0
    await inBatches(sources, 12, async (source) => {
      const { ok, bytes: n } = await loadImage(source.url)
      if (!ok) broken.push(source.id)
      transferred += n
      if (n > 0) served += 1
      setBytes(transferred)
      setProgress({ done: (done += 1), total: totalSteps })
    })

    if (cancelled.current) return
    push({
      id: 'figures',
      title: locale === 'es' ? 'Imágenes publicadas' : 'Published images',
      checks: [
        {
          id: 'figures:download',
          label: {
            es: 'Las figuras se descargan y se decodifican',
            en: 'Figures download and decode',
          },
          issues: [
            ...broken.map((id) => ({
              where: id,
              problem: { es: 'no se ha podido cargar', en: 'failed to load' },
            })),
            // Si nada ha viajado por la red, la pasada no ha comprobado nada y
            // hay que decirlo en vez de dar un visto bueno vacío.
            ...(served === 0
              ? [
                  {
                    where: 'red',
                    problem: {
                      es: 'ninguna imagen ha llegado a descargarse: se han servido todas de caché, así que esta pasada no verifica nada',
                      en: 'no image was actually downloaded: all served from cache, so this run verifies nothing',
                    },
                  },
                ]
              : []),
          ],
          detail: {
            es: `${sources.length - broken.length} de ${sources.length} imágenes correctas · ${formatBytes(transferred)} descargados`,
            en: `${sources.length - broken.length} of ${sources.length} images fine · ${formatBytes(transferred)} downloaded`,
          },
        },
      ],
    })

    setElapsed((performance.now() - started) / 1000)
    setPhase('done')
  }, [locale])

  // Se lanza sola al entrar: si has abierto esta página es porque quieres el
  // resultado, no porque quieras pulsar un botón.
  useEffect(() => {
    void run()
    return () => {
      cancelled.current = true
    }
  }, [run])

  const allChecks = groups.flatMap((g) => g.checks)
  const failing = allChecks.filter((c) => c.issues.length)
  const totalIssues = failing.reduce((n, c) => n + c.issues.length, 0)

  return (
    <div>
      <PageHeader
        eyebrow={t('selfcheck_eyebrow')}
        title={t('selfcheck_title')}
        description={t('selfcheck_description')}
      />

      <Summary
        phase={phase}
        locale={locale}
        checks={allChecks.length}
        failing={failing.length}
        issues={totalIssues}
        progress={progress}
        elapsed={elapsed}
        bytes={bytes}
        onRerun={() => void run()}
      />

      <div className="mt-6 space-y-5">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} locale={locale} />
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-slate-400">{t('selfcheck_footnote')}</p>
    </div>
  )
}

function Summary({
  phase,
  locale,
  checks,
  failing,
  issues,
  progress,
  elapsed,
  bytes,
  onRerun,
}: {
  phase: Phase
  locale: Locale
  checks: number
  failing: number
  issues: number
  progress: { done: number; total: number }
  elapsed: number
  bytes: number
  onRerun: () => void
}) {
  const t = useT()
  const running = phase === 'running'
  const ok = phase === 'done' && failing === 0
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  const tone = running
    ? 'border-slate-200 bg-white'
    : ok
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-red-200 bg-red-50'

  return (
    <div className={`rounded-xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <Loader2 size={22} className="animate-spin text-slate-400" />
        ) : ok ? (
          <CheckCircle2 size={22} className="text-emerald-600" />
        ) : (
          <XCircle size={22} className="text-red-600" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">
            {running
              ? t('selfcheck_running')
              : ok
                ? t('selfcheck_all_good', { checks })
                : t('selfcheck_failed', { issues, checks: failing })}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {running
              ? `${progress.done} / ${progress.total} (${percent} %) · ${formatBytes(bytes)}`
              : t('selfcheck_elapsed', {
                  seconds: elapsed.toFixed(1),
                  bytes: formatBytes(bytes),
                })}
          </p>
        </div>

        <button
          type="button"
          onClick={onRerun}
          disabled={running}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCw size={14} />
          {t('selfcheck_rerun')}
        </button>
      </div>

      {running && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {!running && !ok && (
        <p className="mt-3 text-xs text-red-700">
          {locale === 'es'
            ? 'Cada incidencia dice el sitio exacto donde está. Corrige, vuelve a generar el contenido y recarga.'
            : 'Each issue names exactly where it is. Fix it, rebuild the content and reload.'}
        </p>
      )}
    </div>
  )
}

function GroupCard({ group, locale }: { group: Group; locale: Locale }) {
  const failing = group.checks.filter((c) => c.issues.length).length

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        {failing ? (
          <AlertTriangle size={16} className="shrink-0 text-red-500" />
        ) : (
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
        )}
        <h3 className="text-sm font-semibold text-slate-800">{group.title}</h3>
        <span className="ml-auto text-xs text-slate-400">
          {group.checks.length - failing}/{group.checks.length}
        </span>
      </header>

      <ul className="divide-y divide-slate-100">
        {group.checks.map((check) => (
          <li key={check.id} className="px-5 py-3">
            <div className="flex items-start gap-2">
              {check.issues.length ? (
                <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
              ) : (
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">{pick(locale, check.label)}</p>
                {check.detail && !check.issues.length && (
                  <p className="mt-0.5 text-xs text-slate-400">{pick(locale, check.detail)}</p>
                )}
                {check.issues.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {check.issues.slice(0, 25).map((issue, i) => (
                      <li key={`${issue.where}-${i}`} className="text-xs text-red-700">
                        <code className="rounded bg-red-50 px-1 py-0.5 font-mono">{issue.where}</code>{' '}
                        {pick(locale, issue.problem)}
                      </li>
                    ))}
                    {check.issues.length > 25 && (
                      <li className="text-xs text-slate-400">
                        + {check.issues.length - 25}…
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
