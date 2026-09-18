#!/usr/bin/env python
"""Prueba de mutación: rompe una cosa a la vez y exige que un test falle.

    python scripts/mutation_check.py

Un test que no se ha visto fallar no prueba nada. La cobertura mide qué líneas
se EJECUTAN, no qué comportamiento se COMPRUEBA: un test que recorre una función
sin afirmar nada sobre su resultado da cobertura y cero garantías.

Cada entrada de MUTATIONS introduce exactamente el daño que un test dice
detectar. Si tras la mutación la suite sigue en verde, ese test es decorativo.
La primera vez que se pasó esto, cuatro de dieciséis mutaciones sobrevivieron
—entre ellas un `shuffle` sesgado y un simulacro que no recortaba el banco al
tamaño del examen— y hubo que reescribir los tests correspondientes.

El código fuente se restaura siempre, incluso si una ejecución falla. Aun así
conviene lanzarlo con el árbol limpio: si algo fuera mal, `git checkout`
devuelve los archivos a su sitio.
"""
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Los archivos se leen y se escriben con newline="" para conservar sus finales
# de línea originales: sin eso, en Windows Python convierte LF en CRLF y deja
# todos los archivos tocados como "modificados" ante git sin haber cambiado
# una sola letra de código.

MUTATIONS = [
    (
        "el contador de uso ignora si la pestaña está visible",
        "src/lib/useStudyTracker.ts",
        "      if (document.visibilityState !== 'visible') return",
        "      // MUTADO",
        "src/lib/useStudyTracker.test.tsx",
    ),
    (
        "el contador de uso ignora la inactividad",
        "src/lib/useStudyTracker.ts",
        "      if (Date.now() - lastActivity.current > idleMs) return",
        "      // MUTADO",
        "src/lib/useStudyTracker.test.tsx",
    ),
    (
        "el contador cuenta aunque esté desactivado",
        "src/lib/useStudyTracker.ts",
        "    if (!trackUsage) return",
        "    // MUTADO",
        "src/lib/useStudyTracker.test.tsx",
    ),
    (
        "shuffle deja de ser Fisher-Yates y sesga la distribución",
        "src/lib/shuffle.ts",
        "    const j = Math.floor(Math.random() * (i + 1))",
        "    const j = Math.floor(Math.random() * result.length)",
        "src/lib/shuffle.test.ts",
    ),
    (
        "formatClock deja pasar tiempos negativos",
        "src/lib/time.ts",
        "  const s = Math.max(0, Math.round(totalSeconds))",
        "  const s = Math.round(totalSeconds)",
        "src/lib/shuffle.test.ts",
    ),
    (
        "una pregunta sin responder cuenta como acertada",
        "src/components/TimedTest.tsx",
        "        correct: selected != null && selected === correctOption?.id,",
        "        correct: selected === correctOption?.id || selected == null,",
        "src/components/TimedTest.test.tsx",
    ),
    (
        "el simulacro no respeta el máximo de preguntas del formato",
        "src/components/TimedTest.tsx",
        "    const picked = shuffle(preferredPool).slice(0, Math.min(format.questions, preferredPool.length))",
        "    const picked = shuffle(preferredPool)",
        "src/components/TimedTest.test.tsx",
    ),
    (
        "el recuento de palabras cuenta una en un texto vacío",
        "src/components/EssayRunner.tsx",
        "  return trimmed === '' ? 0 : trimmed.split(/\\s+/).length",
        "  return trimmed.split(/\\s+/).length",
        "src/components/EssayRunner.test.tsx",
    ),
    (
        "las notas vacías se guardan como cadena en vez de omitirse",
        "src/components/EssayRunner.tsx",
        "      selfReviewNotes: notes || undefined,",
        "      selfReviewNotes: notes,",
        "src/components/EssayRunner.test.tsx",
    ),
    (
        "el banco de práctica ignora el filtro de procedencia",
        "src/components/PracticeBank.tsx",
        "    return ordered.filter((q) => sourceOf(q.tags) === sourceFilter)",
        "    return ordered",
        "src/components/PracticeBank.test.tsx",
    ),
    (
        "el merge de ajustes no completa los campos que faltan",
        "src/lib/studyStore.ts",
        "          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },",
        "          settings: (saved.settings ?? DEFAULT_SETTINGS) as StudySettings,",
        "src/lib/stores.test.ts",
    ),
    (
        "el registro diario acepta incrementos negativos",
        "src/lib/studyStore.ts",
        "          if (!(seconds > 0)) return state",
        "          // MUTADO",
        "src/lib/stores.test.ts",
    ),
    (
        "el guardarraíl de sesgo de letra se relaja hasta ser inútil",
        "src/lib/selfCheck.ts",
        "export const LETTER_SHARE_LIMIT = 0.45",
        "export const LETTER_SHARE_LIMIT = 1.01",
        "src/lib/selfCheck.test.ts",
    ),
    (
        "la comprobación de traducción deja pasar cadenas vacías",
        "src/lib/selfCheck.ts",
        "  return LOCALES.filter((l) => !value[l] || !value[l].trim()).map((l) => ({",
        "  return LOCALES.filter((l) => value[l] === undefined).map((l) => ({",
        "src/lib/selfCheck.test.ts",
    ),
    (
        "el número de módulo se lee sólo del primer dígito",
        "src/lib/course.ts",
        "  const match = /-m(\\d+)$/.exec(id)",
        "  const match = /-m(\\d)/.exec(id)",
        "src/lib/course.test.ts",
    ),
    (
        "la media de progreso se calcula sobre las preguntas y no sobre la escala",
        "src/pages/ProgressPage.tsx",
        "    return a.totalQuestions > 0 ? (correct / a.totalQuestions) * maxScore : 0",
        "    return correct",
        "src/pages/ProgressPage.test.tsx",
    ),
    (
        "la mejor marca pasa a ser la ultima en vez de la maxima",
        "src/pages/ProgressPage.tsx",
        "  const best = scores.length > 0 ? Math.max(...scores) : 0",
        "  const best = scores.length > 0 ? scores[scores.length - 1] : 0",
        "src/pages/ProgressPage.test.tsx",
    ),
    (
        "la tabla de progreso muestra filas sin ningun intento",
        "src/pages/ProgressPage.tsx",
        "  const rows = allRows.filter((r) => r.attempts.length > 0)",
        "  const rows = allRows",
        "src/pages/ProgressPage.test.tsx",
    ),
    (
        "el historial de simulacros ordena del mas antiguo al mas reciente",
        "src/components/AttemptHistory.tsx",
        "    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),",
        "    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),",
        "src/components/History.test.tsx",
    ),
    (
        "el historial reordena en su sitio el array del store",
        "src/components/AttemptHistory.tsx",
        "  const sorted = [...attempts].sort(",
        "  const sorted = attempts.sort(",
        "src/components/History.test.tsx",
    ),
    (
        "la cabecera del banco vuelve a cortar el enunciado",
        "src/components/PracticeBank.tsx",
        "  if (question.skill !== 'abstract') return prompt",
        "  if (question.skill !== 'abstract') return prompt.slice(0, 110)",
        "src/components/PracticeBank.test.tsx",
    ),
    (
        "el enunciado se repite dentro de la tarjeta al desplegar",
        "src/components/PracticeBank.tsx",
        "                    hidePrompt={!isAbstract}",
        "                    hidePrompt={false}",
        "src/components/PracticeBank.test.tsx",
    ),
    (
        "una pregunta fallada se marca como acertada",
        "src/components/PracticeBank.tsx",
        "  return question.options.find((o) => o.id === answer)?.isCorrect === true",
        "  return true",
        "src/components/PracticeBank.test.tsx",
    ),
    (
        "la fase de ámbito ignora el ámbito elegido y vuelve al de la convocatoria",
        "src/lib/studyStore.ts",
        "  if (chosen && competition.fields.some((f) => f.id === chosen)) return chosen",
        "  if (false) return chosen",
        "src/App.routes.test.tsx",
    ),
    (
        "la formación enseña su temario sea cual sea el ámbito elegido",
        "src/pages/CoursePage.tsx",
        "  if (!hasCourse(field)) {",
        "  if (false) {",
        "src/App.routes.test.tsx",
    ),
    (
        "la navegación enlaza la formación aunque el ámbito no tenga curso",
        "src/components/layout/Sidebar.tsx",
        "  const fieldChildren = hasCourse(field)",
        "  const fieldChildren = true",
        "src/App.routes.test.tsx",
    ),
    (
        "el menú de usuario no se cierra al pulsar fuera",
        "src/components/layout/UserMenu.tsx",
        "      if (!container.current?.contains(e.target as Node)) setOpen(false)",
        "      // MUTADO",
        "src/components/layout/UserMenu.test.tsx",
    ),
    (
        "el avatar usa el nombre entero en vez de las iniciales",
        "src/components/layout/UserMenu.tsx",
        "    .map((w) => w[0].toUpperCase())",
        "    .map((w) => w.toUpperCase())",
        "src/components/layout/UserMenu.test.tsx",
    ),
    (
        "el banco de práctica vuelve a olvidar lo respondido al recargar",
        "src/components/PracticeBank.tsx",
        "                    onSelect={(optionId) => recordAnswer(q.id, optionId)}",
        "                    onSelect={() => {}}",
        "src/components/PracticeBank.test.tsx",
    ),
    (
        "reactivar una pregunta baraja aunque queden otras respondidas",
        "src/lib/practiceStore.ts",
        "          const anyLeft = bank.questionIds.some((id) => answers[id] != null)",
        "          const anyLeft = false",
        "src/components/PracticeBank.test.tsx",
    ),
    (
        "reactivar todas borra las respuestas de los demás bancos",
        "src/lib/practiceStore.ts",
        "          for (const id of bank.questionIds) delete answers[id]",
        "          for (const id of Object.keys(answers)) delete answers[id]",
        "src/components/PracticeBank.test.tsx",
    ),
    (
        "el barajado con semilla deja de ser determinista",
        "src/lib/shuffle.ts",
        "  const random = mulberry32(seed)",
        "  const random = Math.random",
        "src/lib/shuffle.test.ts",
    ),
    (
        "los ajustes vuelven a guardarse sin confirmar",
        "src/pages/SettingsPage.tsx",
        "                onChange={(e) => editProfile({ displayName: e.target.value })}",
        "                onChange={(e) => updateProfile({ displayName: e.target.value })}",
        "src/pages/SettingsPage.test.tsx",
    ),
    (
        "confirmar no llega a guardar el perfil",
        "src/pages/SettingsPage.tsx",
        "    updateProfile(draftProfile)",
        "    // MUTADO",
        "src/pages/SettingsPage.test.tsx",
    ),
    (
        "descartar no devuelve el formulario a lo guardado",
        "src/pages/SettingsPage.tsx",
        "    setDraftProfile(profile)\n    setDraftSettings(settings)",
        "    // MUTADO",
        "src/pages/SettingsPage.test.tsx",
    ),
    (
        "el selector de convocatoria vuelve a quedarse muerto en el test de ámbito",
        "src/pages/FieldMcqPage.tsx",
        "    const switchedByHand = lastCompetition.current !== competition.key",
        "    const switchedByHand = false",
        "src/App.routes.test.tsx",
    ),
    (
        "el guion de la verificación se deja fuera los bloques de contenido",
        "src/pages/SelfCheckPage.tsx",
        "    ...CONTENT_TARGETS.map(",
        "    ...[].map(",
        "src/App.routes.test.tsx",
    ),
    (
        "la barra lateral enseña una versión inventada",
        "src/components/layout/Sidebar.tsx",
        "            {t('app_version', { version: __APP_VERSION__ })}",
        "            {t('app_version', { version: '0.0' })}",
        "src/App.routes.test.tsx",
    ),
    (
        "el calendario suma los dos dispositivos en vez de quedarse con el mayor",
        "src/lib/backup.ts",
        "    merged[day] = Math.max(merged[day] ?? 0, seconds)",
        "    merged[day] = (merged[day] ?? 0) + seconds",
        "src/lib/backup.test.ts",
    ),
    (
        "importar reescribe las respuestas que ya había en este dispositivo",
        "src/lib/backup.ts",
        "  return { ...incoming, ...local }",
        "  return { ...local, ...incoming }",
        "src/lib/backup.test.ts",
    ),
    (
        "combinar duplica los intentos que ya estaban",
        "src/lib/backup.ts",
        "  const byId = new Map<string, T>()",
        "  if (true) return [...local, ...incoming]\n  const byId = new Map<string, T>()",
        "src/lib/backup.test.ts",
    ),
    (
        "combinar arrastra también los ajustes del otro dispositivo",
        "src/lib/backup.ts",
        "  useStudyStore.setState({ dayLog })",
        "  useStudyStore.setState({ dayLog, settings: snapshot.settings })",
        "src/lib/backup.test.ts",
    ),
    (
        "combinar reordena un banco que ya se estaba trabajando",
        "src/lib/backup.ts",
        "  const orderSeed = { ...snapshot.practiceOrder, ...practice.orderSeed }",
        "  const orderSeed = { ...practice.orderSeed, ...snapshot.practiceOrder }",
        "src/lib/backup.test.ts",
    ),
    (
        "un fichero de otra aplicación pasa por bueno",
        "src/lib/backup.ts",
        "  if (!isRecord(raw) || raw.app !== SNAPSHOT_APP) return { ok: false, reason: 'foreign' }",
        "  if (!isRecord(raw)) return { ok: false, reason: 'foreign' }",
        "src/lib/backup.test.ts",
    ),
    # `e.target.value = ''` no tiene mutación aquí a propósito: jsdom no modela
    # el value de un input de fichero (Testing Library define `files` por encima
    # de su accessor), así que quitar esa línea no cambia nada observable desde
    # vitest. Una mutación que ningún test puede matar sólo enseña a ignorar el
    # informe. Queda anotado en TESTPLAN.md, en «Qué NO cubre».
    (
        "el fichero se guarda en una sola línea ilegible",
        "src/lib/backup.ts",
        "  return JSON.stringify(snapshot, null, 2)",
        "  return JSON.stringify(snapshot)",
        "src/lib/backup.test.ts",
    ),
    (
        "el calendario acepta valores que no son números",
        "src/lib/backup.ts",
        "    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw",
        "    out[key] = raw as number",
        "src/lib/backup.test.ts",
    ),
    (
        "las respuestas aceptan cualquier cosa que traiga el fichero",
        "src/lib/backup.ts",
        "    if (typeof raw === 'string') out[key] = raw",
        "    out[key] = raw as string",
        "src/lib/backup.test.ts",
    ),
    (
        "un idioma inventado entra tal cual",
        "src/lib/backup.ts",
        "  return value === 'en' ? 'en' : 'es'",
        "  return value as Locale",
        "src/lib/backup.test.ts",
    ),
    (
        "una lista que viene como objeto entra sin comprobar",
        "src/lib/backup.ts",
        "  return Array.isArray(value) ? (value as T[]) : []",
        "  return (value ?? []) as T[]",
        "src/lib/backup.test.ts",
    ),
    (
        "reemplazar se comporta como combinar y no borra nada",
        "src/lib/backup.ts",
        "  if (mode === 'replace') {",
        "  if (false) {",
        "src/lib/backup.test.ts",
    ),
    # ── Figuras del razonamiento abstracto ─────────────────────────────────
    (
        "una forma declarada deja de dibujarse y sale un SVG vacío",
        "src/components/ShapeIcon.tsx",
        "    case 'moon':",
        "    case 'moon-que-nadie-usa':",
        "src/components/ShapeIcon.test.tsx",
    ),
    (
        "las figuras se dibujan en otra escala y desbordan el marco",
        "src/components/ShapeIcon.tsx",
        'viewBox="0 0 100 100"',
        'viewBox="0 0 50 50"',
        "src/components/ShapeIcon.test.tsx",
    ),
    (
        "las figuras huecas y rayadas pierden el contorno",
        "src/components/ShapeIcon.tsx",
        "  const strokeWidth = isEmpty ? 6 : isHatched ? 4 : 0",
        "  const strokeWidth = 0",
        "src/components/ShapeIcon.test.tsx",
    ),
    (
        "todos los tamaños de figura pasan a medir lo mismo",
        "src/components/ShapeIcon.tsx",
        "  large: 50,",
        "  large: 38,",
        "src/components/ShapeIcon.test.tsx",
    ),
    (
        "el tamaño forzado de la rejilla se ignora",
        "src/components/ShapeIcon.tsx",
        "  const px = pxOverride ?? SIZE_PX[spec.size]",
        "  const px = SIZE_PX[spec.size]",
        "src/components/ShapeIcon.test.tsx",
    ),
    (
        "los iconos no se encogen al compartir celda y desbordan",
        "src/components/FigurePanelView.tsx",
        "  if (count <= 1) return 24",
        "  return 24\n  if (count <= 1) return 24",
        "src/components/FigurePanelView.test.tsx",
    ),
    (
        "todas las posiciones caen en la celda central",
        "src/components/FigurePanelView.tsx",
        "      const cell = POSITION_CELL[s.position ?? 'centre']",
        "      const cell = POSITION_CELL['centre']",
        "src/components/FigurePanelView.test.tsx",
    ),
    (
        "la columna central se dibuja como rejilla en vez de como bandas",
        "src/components/FigurePanelView.tsx",
        "    panel.shapes.some((s) => s.position) && panel.shapes.every((s) => !s.position || s.position in MIDDLE_COLUMN)",
        "    false,",
        "src/components/FigurePanelView.test.tsx",
    ),
    (
        "el marco pedido por el grupo se ignora",
        "src/components/FigurePanelView.tsx",
        "  if (framed && !positioned) {",
        "  if (false) {",
        "src/components/FigurePanelView.test.tsx",
    ),
    (
        "el panel en blanco deja de marcarse y queda un hueco",
        "src/components/FigurePanelView.tsx",
        "  if (panel.isBlank) {",
        "  if (false) {",
        "src/components/FigurePanelView.test.tsx",
    ),
    # ── Práctica a pantalla completa ───────────────────────────────────────
    (
        "cambiar de filtro deja el índice donde estaba",
        "src/components/FullscreenPractice.tsx",
        "    setSourceFilter(next)\n    setIndex(0)",
        "    setSourceFilter(next)",
        "src/components/FullscreenPractice.test.tsx",
    ),
    (
        "el índice puede apuntar fuera de la lista de preguntas",
        "src/components/FullscreenPractice.tsx",
        "  const safeIndex = Math.min(index, Math.max(0, filtered.length - 1))",
        "  const safeIndex = index",
        "src/components/FullscreenPractice.test.tsx",
    ),
    (
        "el filtro de procedencia sale aunque no haya mezcla",
        "src/components/FullscreenPractice.tsx",
        "      {sources.length >= 2 && (",
        "      {sources.length >= 1 && (",
        "src/components/FullscreenPractice.test.tsx",
    ),
    # ── Formación ──────────────────────────────────────────────────────────
    (
        "el curso se enseña también a quien se presenta por otro ámbito",
        "src/pages/CoursePage.tsx",
        "  if (!hasCourse(field)) {",
        "  if (false) {",
        "src/pages/CoursePage.test.tsx",
    ),
    (
        "un módulo inexistente deja de redirigir a la portada",
        "src/pages/CourseModulePage.tsx",
        "  if (index === -1) return <Navigate to=\"/formacion\" replace />",
        "  if (index === -1) return null",
        "src/pages/CoursePage.test.tsx",
    ),
    (
        "el simulacro del módulo promete los minutos del examen entero",
        "src/pages/CourseModulePage.tsx",
        "    minutes: Math.max(",
        "    minutes: FIELD_MCQ_FORMAT.minutes || Math.max(",
        "src/pages/CoursePage.test.tsx",
    ),
    (
        "el simulacro del módulo pregunta por todo el examen, no por el módulo",
        "src/pages/CourseModulePage.tsx",
        "    questions: module.questions.length,",
        "    questions: 1,",
        "src/pages/CoursePage.test.tsx",
    ),
    # ── EUFTE ──────────────────────────────────────────────────────────────
    (
        "cerrar un tema desmonta el redactor y tira el borrador",
        "src/pages/EuftePage.tsx",
        "                          {hasBeenOpened && (",
        "                          {isOpen && (",
        "src/pages/EuftePage.test.tsx",
    ),
    (
        "un tema abierto ya no se puede cerrar",
        "src/pages/EuftePage.tsx",
        "      const next = current === id ? null : id",
        "      const next = id",
        "src/pages/EuftePage.test.tsx",
    ),
    # ── Figuras del motor en EPSO ──────────────────────────────────────────
    (
        "un SVG con <script> pasa por figura del motor",
        "src/lib/engineFigure.ts",
        "  { pattern: /<script\\b/i, es: 'contiene <script>', en: 'contains <script>' },",
        "  // MUTADO",
        "src/lib/engineFigure.test.ts",
    ),
    (
        "las referencias internas del rayado se toman por enlaces externos",
        "src/lib/engineFigure.ts",
        '''    pattern: /(?:xlink:)?href\\s*=\\s*["'](?!#)/i,''',
        '''    pattern: /(?:xlink:)?href\\s*=\\s*["']/i,''',
        "src/lib/engineFigure.test.ts",
    ),
    (
        "un SVG cortado por la mitad pasa por figura",
        "src/lib/engineFigure.ts",
        "  if (!text.endsWith('</svg>')) return { es: 'no termina en </svg>', en: 'does not end with </svg>' }",
        "  // MUTADO",
        "src/lib/engineFigure.test.ts",
    ),
    (
        "la URL de datos no escapa el SVG y la almohadilla la corta",
        "src/lib/engineFigure.ts",
        "  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`",
        "  return `data:image/svg+xml;charset=utf-8,${svg}`",
        "src/lib/engineFigure.test.ts",
    ),
    (
        "el filtro arranca en la primera procedencia aunque no sea la real",
        "src/lib/questionSource.ts",
        "  return sources.includes('real') ? 'real' : 'all'",
        "  return sources[0]",
        "src/lib/questionSource.test.ts",
    ),
    (
        "con una sola procedencia el filtro arranca filtrado",
        "src/lib/questionSource.ts",
        "  if (sources.length < 2) return 'all'",
        "  // MUTADO",
        "src/lib/questionSource.test.ts",
    ),
    (
        "las procedencias salen en el orden en que aparecen, no en el de oferta",
        "src/lib/questionSource.ts",
        "  return SOURCE_ORDER.filter((source) => present.has(source))",
        "  return [...present].filter((source): source is QuestionSource => source !== null)",
        "src/lib/questionSource.test.ts",
    ),
    (
        "un ejercicio del motor se lee como notación de texto",
        "src/components/QuestionCard.tsx",
        "    question.options.length > 0 && question.options.every((o) => typeof o.figure === 'string')",
        "    false",
        "src/components/QuestionCard.test.tsx",
    ),
    (
        "ocultar el enunciado del motor deja el texto a la vista",
        "src/components/QuestionCard.tsx",
        "          {!hidePrompt && <Markdown className={clsx(large && '[&_p]:text-lg')}>{prompt}</Markdown>}",
        "          {<Markdown className={clsx(large && '[&_p]:text-lg')}>{prompt}</Markdown>}",
        "src/components/QuestionCard.test.tsx",
    ),
    (
        "la casilla que falta se pinta como si fuera una figura",
        "src/components/EngineFigure.tsx",
        "            svg === null ? (",
        "            false ? (",
        "src/components/EngineFigure.test.tsx",
    ),
    (
        "una serie de seis se pinta con casillas que no caben en un móvil",
        "src/components/EngineFigure.tsx",
        "  if (perRow >= 6) return large ? 'w-11 sm:w-20' : 'w-11 sm:w-16'",
        "  if (perRow >= 99) return large ? 'w-11 sm:w-20' : 'w-11 sm:w-16'",
        "src/components/EngineFigure.test.tsx",
    ),
    (
        "un tablero vacío deja un contenedor huérfano",
        "src/components/EngineFigure.tsx",
        "  if (board.rows.length === 0) return null",
        "  // MUTADO",
        "src/components/EngineFigure.test.tsx",
    ),
    (
        "las comprobaciones de figura del motor dejan de ejecutarse",
        "src/lib/selfCheck.ts",
        "  issues.push(...engineFigureIssues(q, at))",
        "  // MUTADO",
        "src/lib/selfCheck.test.ts",
    ),
    (
        "figureOnly puede contradecir a las figuras sin que nadie lo vea",
        "src/lib/selfCheck.ts",
        "  if ((q.figureOnly === true) !== allFigures) {",
        "  if (false) {",
        "src/lib/selfCheck.test.ts",
    ),
    (
        "un tablero sin casilla por adivinar pasa la comprobación",
        "src/lib/selfCheck.ts",
        "    if (cells.length > 0 && unknown !== 1) {",
        "    if (false) {",
        "src/lib/selfCheck.test.ts",
    ),
    (
        "un ejercicio sin procedencia pasa la comprobación",
        "src/lib/selfCheck.ts",
        "  if (!q.provenance?.contentHash || !q.provenance.seed) {",
        "  if (false) {",
        "src/lib/selfCheck.test.ts",
    ),
    (
        "un SVG inseguro en una opción pasa la comprobación",
        "src/lib/selfCheck.ts",
        "    const problem = svgProblem(o.figure!)",
        "    const problem = null as { es: string; en: string } | null",
        "src/lib/selfCheck.test.ts",
    ),
    (
        "un SVG que no es XML bien formado pasa por figura del motor",
        "src/lib/engineFigure.ts",
        "  if (error) {",
        "  if (false) {",
        "src/lib/engineFigure.test.ts",
    ),
    (
        "las filas de figuras vuelven a llevar margen vertical y la última tarjeta se descuadra",
        "src/components/QuestionCard.tsx",
        "          !(drawFigures || scanned || engine) && (large ? 'space-y-3' : 'space-y-2'),",
        "          large ? 'space-y-3' : 'space-y-2',",
        "src/components/QuestionCard.test.tsx",
    ),
    # ── Tablón de convocatorias ───────────────────────────────────────────
    (
        "un cambio de plantilla en EPSO pasa por «no hay convocatorias»",
        "scripts/lib/epsoBoard.mjs",
        '    if (/class="[^"]*view-empty[^"]*"/i.test(html)) return []',
        "    if (true) return []",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "una fila a la que le falta una columna se lee a medias",
        "scripts/lib/epsoBoard.mjs",
        "    const missing = expect.filter((field) => !(field in cells))",
        "    const missing = []",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "el año de la convocatoria deja de leerse de su número",
        "scripts/lib/epsoBoard.mjs",
        "  return found ? 2000 + Number(found[1]) : null",
        "  return null",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "el tablón se llena de convocatorias de otros años",
        "scripts/lib/epsoBoard.mjs",
        "    if (!old && notice.stage !== 'open' && notice.year !== year) continue",
        "    if (false) continue",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "una convocatoria guardada se vuelve a fechar como vista hoy",
        "scripts/lib/epsoBoard.mjs",
        "    const merged = { ...old, ...notice, firstSeen: old.firstSeen ?? today }",
        "    const merged = { ...old, ...notice, firstSeen: today }",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "con el título repetido se adivina el número de convocatoria",
        "scripts/lib/epsoBoard.mjs",
        "  return hits.size === 1 ? [...hits][0] : null",
        "  return hits.size >= 1 ? [...hits][0] : null",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "se pide la fecha de apertura a la página de inscripción, que no la tiene",
        "scripts/lib/epsoBoard.mjs",
        "      if (stage !== 'open') notice.infoUrl = row.url",
        "      if (false) notice.infoUrl = row.url",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "el calendario de la ficha se deja de leer",
        "scripts/lib/epsoBoard.mjs",
        "    if (!/application period/i.test(cells.stepName)) continue",
        "    if (true) continue",
        "scripts/epsoBoard.test.mjs",
    ),
    (
        "lo que ya estaba el primer día se marca como nuevo",
        "src/lib/board.ts",
        "  if (since && notice.firstSeen > since) return notice.firstSeen",
        "  if (since && notice.firstSeen >= since) return notice.firstSeen",
        "src/lib/board.test.ts",
    ),
    (
        "el verde deja de caducar y lo viejo sigue pareciendo nuevo",
        "src/lib/board.ts",
        "  return (now.getTime() - ms) / DAY < days",
        "  return (now.getTime() - ms) / DAY < days * 100",
        "src/lib/board.test.ts",
    ),
    (
        "las recién publicadas dejan de destacarse en verde",
        "src/components/BoardView.tsx",
        "        fresh ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white',",
        "        'border-slate-200 bg-white',",
        "src/components/BoardView.test.tsx",
    ),
    # ── Sincronización entre dispositivos ──────────────────────────────────────────
    (
        "la huella cuenta la hora de exportación y se sube cada cinco minutos",
        "src/lib/remoteSync.ts",
        "  const { exportedAt: _exportedAt, appVersion: _appVersion, ...rest } = snapshot",
        "  const { appVersion: _appVersion, ...rest } = snapshot",
        "src/lib/remoteSync.test.ts",
    ),
    (
        "se sube el estado aunque no haya cambiado nada",
        "src/lib/remoteSync.ts",
        "  const mustPush = !remote || mark !== next.fingerprint",
        "  const mustPush = true",
        "src/lib/remoteSync.test.ts",
    ),
    (
        "lo del servidor sustituye al progreso local en vez de fusionarse",
        "src/lib/remoteSync.ts",
        "      pulled = applySnapshot(read.snapshot, 'merge')",
        "      pulled = applySnapshot(read.snapshot, 'replace')",
        "src/lib/remoteSync.test.ts",
    ),
    (
        "un fallo al subir deshace lo que ya se había fusionado",
        "src/lib/remoteSync.ts",
        "    return { ok: false, reason: 'write', detail: message(error), state: next }",
        "    return { ok: false, reason: 'write', detail: message(error), state }",
        "src/lib/remoteSync.test.ts",
    ),
    (
        "el estado se guarda como una cadena JSON dentro del jsonb",
        "src/lib/supabaseState.ts",
        "      const { updatedAt } = await rows.write(userId, JSON.parse(text))",
        "      const { updatedAt } = await rows.write(userId, text)",
        "src/lib/supabaseState.test.ts",
    ),
    (
        "la cuenta sin fila parece tener un progreso vacío en vez de ninguno",
        "src/lib/supabaseState.ts",
        "      if (!row) return null",
        "      if (!row) return { ref: userId, version: '', text: '{}' }",
        "src/lib/supabaseState.test.ts",
    ),
    (
        "la fila baja convertida a texto con String() y llega ilegible",
        "src/lib/supabaseState.ts",
        "      return { ref: userId, version: row.updatedAt, text: JSON.stringify(row.snapshot) }",
        "      return { ref: userId, version: row.updatedAt, text: String(row.snapshot) }",
        "src/lib/supabaseState.test.ts",
    ),
    # ── La puerta: quién entra ────────────────────────────────────────────
    (
        "un fallo de la base de datos se toma por una negativa",
        "src/lib/account.ts",
        "  if (failure) return 'unavailable'",
        "  // MUTADO",
        "src/lib/account.test.ts",
    ),
    (
        "la puerta parpadea antes de saber si hay sesión",
        "src/lib/account.ts",
        "  if (!started) return 'starting'",
        "  // MUTADO",
        "src/lib/account.test.ts",
    ),
    (
        "una cuenta sin fila entra como si estuviera aprobada",
        "src/lib/account.ts",
        "  if (!account) return 'pending'",
        "  if (!account) return 'ready'",
        "src/lib/account.test.ts",
    ),
    (
        "revocar a un administrador no le quita el mando",
        "src/lib/account.ts",
        "  return account?.role === 'admin' && account.status === 'approved'",
        "  return account?.role === 'admin'",
        "src/lib/account.test.ts",
    ),
    (
        "un papel desconocido en la base de datos concede mando",
        "src/lib/account.ts",
        "    role: ROLES.includes(row.role as AccountRole) ? (row.role as AccountRole) : 'candidate',",
        "    role: row.role as AccountRole,",
        "src/lib/account.test.ts",
    ),
    (
        "cambiar de sesión deja puesta la cuenta de la anterior",
        "src/lib/accountStore.ts",
        "      account: null,\n      failure: null,\n    }),",
        "      failure: null,\n    }),",
        "src/lib/account.test.ts",
    ),
    (
        "un fallo al leer la cuenta conserva la de antes y deja entrar",
        "src/lib/accountStore.ts",
        "  failed: (failure) => set({ failure, account: null, started: true }),",
        "  failed: (failure) => set({ failure, started: true }),",
        "src/lib/account.test.ts",
    ),
    (
        "renovar la sesión olvida la fila y vuelve a subirlo todo",
        "src/lib/syncStore.ts",
        "        if (Object.keys(get().sync).length === 0 && get().lastSyncAt === null) return",
        "        // MUTADO",
        "src/components/SyncCard.test.tsx",
    ),
    (
        "un acceso fallido deja escrita la contraseña equivocada",
        "src/components/LoginForm.tsx",
        # Con la sangría exacta y la línea siguiente pegada. Sin eso el patrón
        # encajaba también dentro de la rama de crear cuenta —seis espacios son
        # subcadena de ocho—, mutaba la otra y dejaba a este test sin nada que
        # detectar. Sobrevivió una vez por esto, y el hueco que destapó era real.
        "      setError(result.message)\n      setPassword('')\n    }\n  }",
        "      setError(result.message)\n    }\n  }",
        "src/components/LoginForm.test.tsx",
    ),
    (
        "crear la cuenta con una contraseña rechazada la deja escrita",
        "src/components/LoginForm.tsx",
        "        setError(result.message)\n        setPassword('')\n        return",
        "        setError(result.message)\n        return",
        "src/components/LoginForm.test.tsx",
    ),
    (
        "la pantalla de espera enseña errores técnicos que no vienen a cuento",
        "src/components/AccessNotice.tsx",
        "        {kind === 'unavailable' && failure && (",
        "        {failure && (",
        "src/components/AccessNotice.test.tsx",
    ),
    # ── El botón de guardar de la cabecera ────────────────────────────────
    (
        "un reloj adelantado hace decir «hace -3 min»",
        "src/lib/time.ts",
        "  if (elapsed < MINUTE) return { unit: 'now' }",
        "  if (elapsed >= 0 && elapsed < MINUTE) return { unit: 'now' }",
        "src/lib/time.test.ts",
    ),
    (
        "una marca de tiempo ilegible se pinta igual",
        "src/lib/time.ts",
        "  if (Number.isNaN(then)) return { unit: 'never' }",
        "  // MUTADO",
        "src/lib/time.test.ts",
    ),
    (
        "el tiempo transcurrido se redondea hacia arriba y exagera",
        "src/lib/time.ts",
        "  if (elapsed < DAY) return { unit: 'hours', value: Math.floor(elapsed / HOUR) }",
        "  if (elapsed < DAY) return { unit: 'hours', value: Math.ceil(elapsed / HOUR) }",
        "src/lib/time.test.ts",
    ),
    (
        "el botón se queda diciendo «Guardado ahora» para siempre",
        "src/components/layout/SyncButton.tsx",
        "    const timer = setInterval(() => setNow(new Date()), TICK_MS)",
        "    const timer = setInterval(() => {}, TICK_MS)",
        "src/components/layout/SyncButton.test.tsx",
    ),
    (
        "sin sincronización configurada el botón promete guardar igual",
        "src/components/layout/SyncButton.tsx",
        "  if (status === 'off') return null",
        "  // MUTADO",
        "src/components/layout/SyncButton.test.tsx",
    ),
    # ── El perfil de administrador ────────────────────────────────────────
    (
        "un administrador puede revocarse a sí mismo y dejar esto sin nadie",
        "src/lib/admin.ts",
        "  if (me.userId === target.userId) return { ok: false, reason: 'self' }",
        "  // MUTADO",
        "src/components/AdminPanel.test.tsx",
    ),
    (
        "se compara por correo en vez de por identidad",
        "src/lib/admin.ts",
        "  if (me.userId === target.userId) return { ok: false, reason: 'self' }",
        "  if (me.email === target.email) return { ok: false, reason: 'self' }",
        "src/lib/admin.test.ts",
    ),
    (
        "las solicitudes pendientes dejan de salir primero",
        "src/lib/admin.ts",
        "      RANK[a.status] - RANK[b.status] ||",
        "",
        "src/lib/admin.test.ts",
    ),
    (
        "la lista se reordena en su sitio y baila bajo el ratón",
        "src/lib/admin.ts",
        "  return [...accounts].sort(",
        "  return accounts.sort(",
        "src/lib/admin.test.ts",
    ),
    (
        "al decidir no queda escrito quién decidió",
        "src/lib/admin.ts",
        "  return { status, decided_at: now.toISOString(), decided_by: by.userId }",
        "  return { status, decided_at: now.toISOString(), decided_by: '' }",
        "src/lib/admin.test.ts",
    ),
    (
        "el fichero de progreso sale sin saber de quién es",
        "src/lib/admin.ts",
        "  return `epso-progreso-${who || 'sin-correo'}-${day}.json`",
        "  return `epso-progreso-${day}.json`",
        "src/lib/admin.test.ts",
    ),
    (
        "se ofrece aprobar a quien ya tiene acceso",
        "src/lib/admin.ts",
        "      return target.status === 'approved' ? { ok: false, reason: 'noop' } : { ok: true }",
        "      return { ok: true }",
        "src/lib/admin.test.ts",
    ),
    (
        "un candidato ve la administración en su menú",
        "src/components/layout/UserMenu.tsx",
        "    ...(admin",
        "    ...(true",
        "src/components/layout/UserMenu.test.tsx",
    ),
    (
        "cualquiera alcanza el panel de administración escribiendo la ruta",
        "src/App.tsx",
        "          {admin && <Route path=\"/admin\" element={<AdminPage />} />}",
        "          <Route path=\"/admin\" element={<AdminPage />} />",
        "src/App.routes.test.tsx",
    ),
    (
        "borrar el progreso de alguien no pregunta antes",
        "src/components/AdminPanel.tsx",
        "              onClick={() => confirmed('admin_confirm_wipe') && onWipe(account)}",
        "              onClick={() => onWipe(account)}",
        "src/components/AdminPanel.test.tsx",
    ),
    (
        "borrar una cuenta no pregunta antes",
        "src/components/AdminPanel.tsx",
        "              onClick={() => confirmed('admin_confirm_delete') && onDelete(account)}",
        "              onClick={() => onDelete(account)}",
        "src/components/AdminPanel.test.tsx",
    ),
    (
        "la descarga deja la URL temporal sin liberar",
        "src/lib/download.ts",
        "  URL.revokeObjectURL(url)",
        "  // MUTADO",
        "src/lib/download.test.ts",
    ),
    # ── Pedir acceso antes de tener cuenta ────────────────────────────────
    (
        "el correo repetido delata a quien ya había pedido acceso",
        "src/lib/access.ts",
        "  if (error.code === '23505') return { ok: true }",
        "  // MUTADO",
        "src/lib/access.test.ts",
    ),
    (
        "el correo viaja tal como se escribió, y el mismo entra dos veces",
        "src/lib/access.ts",
        "  return raw.trim().toLowerCase()",
        "  return raw",
        "src/lib/access.test.ts",
    ),
    (
        "se decide sobre la solicitud de quien ya tiene cuenta, y no hace nada",
        "src/lib/access.ts",
        "  if (hasAccount) return { ok: false, reason: 'account' }",
        "  // MUTADO",
        "src/components/AdminPanel.test.tsx",
    ),
    (
        "cualquier cosa pasa por correo",
        "src/lib/access.ts",
        "  if (!SHAPE.test(email)) return { ok: false, reason: 'shape' }",
        "  // MUTADO",
        "src/lib/access.test.ts",
    ),
    (
        "la cola deja de poner primero lo que espera decisión",
        "src/lib/access.ts",
        "      RANK[a.status] - RANK[b.status] ||",
        "",
        "src/lib/access.test.ts",
    ),
    (
        "un estado desconocido de la cola se da por aprobado",
        "src/lib/access.ts",
        "    status: status === 'approved' || status === 'rejected' ? status : 'pending',",
        "    status: 'approved',",
        "src/lib/access.test.ts",
    ),
    (
        "el número de arriba olvida las solicitudes",
        "src/components/AdminPanel.tsx",
        "  const waiting = pendingCount(accounts) + waitingRequests(requests)",
        "  const waiting = pendingCount(accounts)",
        "src/components/AdminPanel.test.tsx",
    ),
    (
        "quitar una solicitud no pregunta antes",
        "src/components/AdminPanel.tsx",
        "            onClick={() =>\n"
        "              window.confirm(t('admin_req_confirm_remove', { email: request.email })) &&\n"
        "              onRemove(request)\n"
        "            }\n",
        "            onClick={() => onRemove(request)}\n",
        "src/components/AdminPanel.test.tsx",
    ),
    (
        "se dice que la solicitud está enviada aunque el servidor la rechace",
        "src/components/LoginForm.tsx",
        "      if (result.ok) setPanel('asked')",
        "      setPanel('asked')",
        "src/components/LoginForm.test.tsx",
    ),
    (
        "crear la cuenta sin quedar dentro no avisa de nada",
        "src/components/LoginForm.tsx",
        "      if (!result.inside) setPanel('created')",
        "      // MUTADO",
        "src/components/LoginForm.test.tsx",
    ),
    (
        "pedir acceso vuelve a pedir una contraseña que todavía no protege nada",
        "src/components/LoginForm.tsx",
        "        {!asking && (",
        "        {true && (",
        "src/components/LoginForm.test.tsx",
    ),
    (
        "el navegador vuelve a tragarse el aviso del correo mal escrito",
        "src/components/LoginForm.tsx",
        "        noValidate\n",
        "",
        "src/components/LoginForm.test.tsx",
    ),
    (
        "un correo con mala forma llega hasta la base",
        "src/components/LoginForm.tsx",
        "      const read = checkEmail(email)\n"
        "      if (!read.ok) {\n"
        "        setError(t('login_ask_bad_email'))\n"
        "        return\n"
        "      }\n",
        "      const read = { ok: true, email } as const\n",
        "src/components/LoginForm.test.tsx",
    ),
]


def run(spec: str) -> bool:
    result = subprocess.run(
        ["npx", "vitest", "run", spec, "--reporter=dot"],
        cwd=ROOT, capture_output=True, text=True, shell=True,
        encoding='utf-8', errors='replace',
    )
    return result.returncode == 0


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    survivors = []

    for name, rel, old, new, spec in MUTATIONS:
        path = ROOT / rel
        original = path.read_text(encoding="utf-8", newline="")
        if old not in original:
            print(f"  ?  {name}\n     (no se encontró el código a mutar en {rel})")
            survivors.append(name)
            continue
        path.write_text(original.replace(old, new, 1), encoding="utf-8", newline="")
        try:
            passed = run(spec)
        finally:
            path.write_text(original, encoding="utf-8", newline="")

        if passed:
            print(f"  ✗  {name}\n     SOBREVIVE: {spec} sigue en verde")
            survivors.append(name)
        else:
            print(f"  ✓  {name}")

    print()
    if survivors:
        print(f"{len(survivors)} de {len(MUTATIONS)} mutaciones sobreviven:")
        for s in survivors:
            print(f"  - {s}")
        return 1
    print(f"Las {len(MUTATIONS)} mutaciones se detectan.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
