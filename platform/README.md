# Preparación EPSO/AD/429/26 (4) — AD7

Plataforma local (sin backend, sin login) para preparar la prueba de acceso a la
oposición EPSO/AD/429/26 (4) — Administradores AD7, perfiles ICT.

## Stack

- React + TypeScript + Vite
- React Router (navegación)
- Tailwind CSS v4 (estilos)
- Zustand + `persist` (progreso guardado en `localStorage` del navegador)

No hay servidor ni base de datos: todo el contenido vive en el propio código
como datos estáticos, y el progreso del usuario se guarda en el navegador.

## Poner en marcha

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # compila a dist/
npm run lint     # oxlint
```

## Estructura

```
src/
  types/content.ts       Modelo de datos: Question, TheoryDoc, EssayPrompt,
                          ReferenceLink, TestAttempt, EssayAttempt
  data/
    competition.ts        Datos estructurales de la convocatoria (fases, campos,
                          fechas) — usados para la navegación
    content.ts            Punto de entrada de contenido: re-exporta QUESTIONS/
                          THEORY_DOCS/ESSAY_PROMPTS desde content.generated.ts
                          y mantiene REFERENCE_LINKS a mano
    content.generated.ts  Generado por scripts/build_content.py a partir de
                          ../Docs/*.md — NO editar a mano
  lib/
    progressStore.ts     Store de progreso (zustand + localStorage)
    localeStore.ts        Store de idioma (es/en, zustand + localStorage) +
                          tipo Localized y helper pick(locale, valor)
    dictionary.ts, useT.ts   Diccionario de textos de interfaz y hook t()
    useCountdown.ts, time.ts, shuffle.ts   Utilidades para tests cronometrados
  components/
    layout/               Sidebar + shell de la app
    PageHeader, PhaseCard, Tabs, EmptyState, FormatBadges
    Markdown.tsx           Render de Markdown (teoría, enunciados, tablas)
    QuestionCard.tsx       Una pregunta con opciones y corrección
    PracticeBank.tsx       Banco de práctica sin cronometrar (acordeón)
    TimedTest.tsx          Simulacro cronometrado (setup → test → resultados)
    EssayRunner.tsx         Editor cronometrado para prompts EUFTE
    AttemptHistory.tsx, EssayHistory.tsx   Historial de intentos guardados
  pages/
    Dashboard.tsx
    ReasoningOverview.tsx / ReasoningSkillPage.tsx   (Fase 1: verbal/numérico/abstracto)
    FieldMcqOverview.tsx / FieldMcqPage.tsx           (Fase 2: MCQ de campo)
    EuftePage.tsx                                     (Fase 3: redacción EUFTE)
    ResourcesPage.tsx                                 (convocatoria + referencias)
    ProgressPage.tsx                                  (estadísticas)

scripts/
  build_content.py        Parsea ../Docs/*.md (+ ../Docs/es/*.md para la
                          teoría en español) y regenera
                          src/data/content.generated.ts. Volver a ejecutar
                          (`python scripts/build_content.py`) tras editar
                          cualquier Docs/*.md o Docs/es/*.md.
```

## Idioma (ES/EN)

La interfaz, los 8 documentos de teoría, los bancos de preguntas y los 14
prompts EUFTE están disponibles en español e inglés. Hay dos selectores
independientes: el idioma de la interfaz (barra lateral) y el idioma del
contenido del examen (`TestLocaleSelector`, dentro de cada pestaña de
banco/prompt) — se pueden combinar libremente (interfaz en ES + preguntas
en EN, por ejemplo, para practicar en Lengua 2).

- `Docs/es/*.md` contiene la traducción al español de cada capítulo de
  teoría Y de cada banco de preguntas/prompts EUFTE, generada por agentes de
  traducción y usada por `build_content.py` para poblar los campos
  `LocalizedText { es, en }` de `Question`, `TheoryDoc` y `EssayPrompt`.
  El script falla en voz alta (`ValueError`) si falta la traducción de una
  pregunta, opción o prompt — nunca genera contenido silenciosamente
  en un solo idioma.
- `src/lib/dictionary.ts` es el diccionario de textos de interfaz
  (botones, pestañas, mensajes de estado) — no contenido de examen.
- Para añadir una clave nueva: añadirla a `DICT` en `dictionary.ts` con
  ambos idiomas y consumirla vía `t('clave')` (hook `useT`).

## Modelo de la prueba (referencia)

Según la convocatoria (a verificar contra `../Referencias.txt`, que se está
completando con las fuentes oficiales):

1. **Razonamiento** (fase eliminatoria): verbal, numérico y abstracto.
2. **Field-Related MCQ** (clasificatoria): preguntas del campo elegido
   (ICT Infrastructure / ICT Project Management / Clouds & Networks / Data
   Science), en la segunda lengua del candidato.
3. **EUFTE**: redacción/ensayo de razonamiento sobre asuntos de la UE a partir
   de documentación proporcionada.

## Estado actual

Plataforma funcional con contenido real: 848 preguntas (200 verbal + 170
numérico + 156 abstracto + 322 field-MCQ — 82 Ciencia de Datos + 80 cada
una de Infraestructura TIC / Gestión de Proyectos TIC / Nubes y Redes),
8 documentos de teoría y 14 prompts de práctica EUFTE, generados desde
`Docs/*.md` y cargados en `src/data/content.generated.ts`. Los 4 campos
de especialización tienen ya banco de preguntas propio, con profundidad
comparable entre ellos.

Cada prueba de razonamiento y el field-MCQ tienen: pestaña de teoría
(Markdown), banco de práctica sin cronometrar con corrección explicada
opción por opción (y filtro banco real / bonus generado por IA cuando
aplica), simulacro cronometrado con preguntas aleatorias del banco real,
resultados y revisión, e historial de intentos. El EUFTE tiene editor
cronometrado por prompt, con revelado del esquema de respuesta modelo y
checklist de autoevaluación al terminar, más historial de redacciones
guardadas. Todo el progreso se guarda en `localStorage` vía
`progressStore`.

`Docs/` es la fuente de la verdad del contenido: `1.- Verbal reasoning.md`,
`2.- Numerical reasoning.md` y `3.- Abstract reasoning.md` combinan teoría +
banco real transcrito de libros publicados (ORSEU, YSE) + banco bonus
generado por IA; `4.- Field-Related MCQ - Data Science.md` y
`5.- EUFTE - Written test.md` son generados por IA a partir de las
referencias en `Referencias.txt`, sin fuente real publicada disponible para
esos dos.

## Próximos pasos

1. Revisar manualmente una muestra del contenido generado por IA (los 4
   bancos field-MCQ, EUFTE, bancos bonus de numérico/abstracto) — no ha
   sido verificado palabra por palabra como sí lo fue el contenido
   transcrito de libros reales. Ver también las notas inline en `Docs/3.-
   Abstract reasoning.md` / su traducción: varios ítems del banco real
   tienen la respuesta confirmada contra el libro original, pero el
   mecanismo/patrón exacto de transformación solo se verificó parcialmente.
2. ~~Ampliar los bancos de Infraestructura TIC / Gestión de Proyectos TIC /
   Nubes y Redes~~ — hecho: los tres están ahora en 80 preguntas (10 por
   tema), cerca de la profundidad de las 82 de Ciencia de Datos.
3. ~~Trabajar la cola de sitios de referencia en `Referencias-pendientes.md`~~
   — hecho: las Categorías B y C (20 sitios de terceros) están revisadas y
   cerradas, todas 🔴 prohibido o 🔵 bajo valor; ninguna aportó contenido
   integrable. Solo queda pendiente un ítem 🟡 en Categoría A que requiere
   inscripción manual de una persona en un LMS externo, y dos sitios con
   fallos técnicos (HTTP 522/429) a reintentar si se retoma la lista.
4. Considerar code-splitting (`vite build` avisa de un bundle de ~1 MB
   gzip, esperable con ~850 preguntas en un único chunk) si el tiempo de
   carga inicial llega a notarse.
5. Revisar una muestra de las traducciones en `Docs/es/` — generadas por
   agentes de traducción, no verificadas línea a línea por un hablante
   nativo.
6. `npm run lint` (oxlint) falla actualmente en este entorno Windows por
   una directiva de Control de aplicaciones que bloquea su binario nativo
   (`@oxlint/binding-win32-x64-msvc`) — no relacionado con el contenido;
   `tsc -b` sigue validando tipos mientras tanto.
