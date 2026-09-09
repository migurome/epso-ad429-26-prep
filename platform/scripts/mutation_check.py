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
        "    return ordered.filter((q) => sourceLabel(q.tags) === sourceFilter)",
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
        "    ...(hasCourse(field) ? [{ to: '/formacion', label: t('nav_course'), icon: GraduationCap }] : []),",
        "    { to: '/formacion', label: t('nav_course'), icon: GraduationCap },",
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
