# Plan de verificación de la plataforma

Hay dos verificaciones, y responden a preguntas distintas:

| | Pregunta que responde | Cómo se lanza |
| --- | --- | --- |
| **Repositorio** | ¿Está bien el código que voy a subir? | `verificar.cmd` o `node scripts/verify.mjs` |
| **Sitio publicado** | ¿Funciona de verdad lo que hay desplegado? | Abrir **Verificación** en la web (`#/verificacion`) |

La primera cubre tipos, tests y construcción. La segunda descarga de verdad los
bloques de contenido y las 240 imágenes, en el navegador y bajo la ruta base
real — lo único que ninguna prueba en jsdom puede comprobar.

---

## Cómo se lanza (Windows)

**Doble clic** en `verificar.cmd`, en la raíz del repositorio. Es la vía sin
terminal.

**Desde PowerShell.** El envoltorio `npm.ps1` puede estar bloqueado por la
política de ejecución (`SecurityError ... la ejecución de scripts está
deshabilitada`). Estas tres formas lo esquivan, porque `node.exe` y los `.cmd`
no son scripts de PowerShell:

```powershell
cd C:\Users\migur\Desktop\EPSO_Test\platform

node scripts\verify.mjs      # la más directa
npm.cmd run verify           # el atajo .cmd
```

Para que `npm run verify` a secas vuelva a funcionar, una sola vez:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**Etapas sueltas**, cuando ya sabes dónde estás tocando:

```powershell
node scripts\verify.mjs --only=unit
node scripts\verify.mjs --skip=build,dist
.\verificar.cmd --only=dist --no-pause
```

Tarda unos 12 segundos, no necesita red y termina con código de salida 1 si
algo falla, así que vale tal cual para un hook de git o para CI.

```
▸ content    El contenido generado corresponde a los Docs/*.md actuales
▸ typecheck  TypeScript compila sin errores
▸ lint       El linter no encuentra problemas
▸ unit       Tests: contenido, rutas, componentes y utilidades
▸ build      La construcción de producción termina
▸ dist       Lo publicado en dist/ está completo y bien enlazado

Resumen  ✔ content  ✔ typecheck  – lint  ✔ unit  ✔ build  ✔ dist
```

---

## Qué se entiende por «los campos de la web»

La superficie que hay que cubrir es el producto cartesiano de cuatro cosas, y
está toda declarada en datos, no escrita a mano en los tests:

| Eje | Valores | De dónde sale |
| --- | --- | --- |
| Rutas | 14 rutas + comodín | `src/App.tsx` |
| Ámbitos | 6 (4 de la AD7 + 2 de la AD8) | `COMPETITIONS` en `src/data/competition.ts` |
| Convocatorias | AD7, AD8 | `COMPETITION_ORDER` |
| Idiomas | es, en | `localeStore` |

Los tests recorren esas listas, no copias suyas. **Añadir un ámbito o una
convocatoria no requiere tocar ningún test**: aparece cubierto solo. Lo único
que hay que hacer al añadir contenido es volver a generar
(`python scripts/build_content.py`), y si se olvida, la etapa `content` lo dice.

---

## Las capas, y qué caza cada una

### 1. `content` — sincronía entre los documentos y el código generado

Las preguntas no se escriben en TypeScript: salen de `Docs/*.md` y
`Docs/es/*.md` a través de `scripts/build_content.py`. La etapa regenera y
comprueba que no cambia ningún `src/data/*.generated.ts` versionado. Se ciñe a
los archivos **generados** a propósito: en `src/data` conviven con ellos piezas
escritas a mano —`contentLoader.ts`, `content.ts`— y compararlas también
convertiría cualquier edición legítima de esas piezas en un falso fallo de
sincronía.

**Caza:** alguien editó un documento y no reconstruyó, así que la web sirve
contenido distinto del que dice el repositorio.

### 2. `typecheck` y `lint` — el código está bien formado

`tsc -b` sobre todo el proyecto y `oxlint`. En equipos con Control de
aplicaciones de Windows el binario nativo de oxlint viene bloqueado por
directiva; la etapa lo detecta y se marca **omitida**, no fallida, porque eso
no es un hallazgo sobre el código.

### 3. `unit` — 402 tests en 20 archivos

| Archivo | Tests | Qué asegura |
| --- | ---: | --- |
| `src/App.routes.test.tsx` | 67 | Cada ruta, en dos idiomas y dos convocatorias, y el ceñido al ámbito elegido |
| `src/lib/abstractFigure.test.ts` | 48 | El intérprete de figuras de razonamiento abstracto |
| `src/lib/studyCalendar.test.ts` | 34 | Fechas, semanas y objetivo del calendario |
| `src/components/PracticeBank.test.tsx` | 30 | Filtro, enunciado entero, marca de evaluada, persistencia y reactivación |
| `src/lib/selfCheck.test.ts` | 30 | Que **las comprobaciones de contenido detecten** lo que prometen |
| `src/lib/stores.test.ts` | 23 | Los almacenes del progreso y los ajustes, y su rehidratación |
| `src/components/TimedTest.test.tsx` | 21 | Puntuación y el intento que queda grabado |
| `src/lib/shuffle.test.ts` | 21 | Que el simulacro baraje de verdad, el barajado con semilla y el reloj |
| `src/lib/course.test.ts` | 17 | El emparejado de módulos del curso con sus preguntas |
| `src/data/contentIntegrity.test.ts` | 17 | Invariantes de **todo** el contenido |
| `src/pages/ProgressPage.test.tsx` | 13 | Las estadísticas que el candidato usa para juzgarse |
| `src/components/EssayRunner.test.tsx` | 13 | Cronómetro, recuento de palabras y guardado del EUFTE |
| `src/smoke.test.tsx` | 11 | Cada página monta aislada de su marco |
| `src/components/History.test.tsx` | 11 | Los dos historiales: orden y puntuación |
| `src/components/layout/UserMenu.test.tsx` | 11 | La sección de usuario: única puerta a cinco páginas |
| `src/pages/SettingsPage.test.tsx` | 8 | Que los ajustes **no se guarden sin confirmar**, y que se pueda descartar |
| `src/lib/useStudyTracker.test.tsx` | 8 | Las reglas de visibilidad e inactividad del contador |
| `src/lib/abstractFigure.coverage.test.ts` | 8 | Paridad ES/EN de las figuras dibujadas |
| `src/components/QuestionCard.test.tsx` | 6 | Selección, corrección y explicación |
| `src/lib/useCountdown.test.tsx` | 5 | El cronómetro de las pruebas cronometradas |

**`studyCalendar`** cubre la aritmética de fechas, que es donde se esconden los
errores que nadie ve hasta que el dato ya está mal: que las semanas empiecen en
lunes y que un domingo pertenezca a la que acaba, no a la que empieza; que la
actividad de las 23:30 se registre en el día que se ha vivido y no en el
siguiente por usar UTC; que subir el objetivo pueda descumplir una semana que
estaba cumplida; que la racha no se rompa por una semana en curso todavía a
medias; y sobre todo que el tiempo de un test **no se sume** al tiempo de uso,
porque el test ocurre dentro de ese tiempo y sumarlos lo contaría dos veces.

**Las invariantes del contenido viven en `src/lib/selfCheck.ts`**, no dentro del
archivo de test, porque la página de verificación ejecuta exactamente las
mismas en el navegador. Una comprobación que sólo existiera en el test no diría
nada del sitio desplegado, y una que sólo existiera en la página no frenaría un
commit malo. Cada bloque de contenido pasa cuatro:

- **Forma y traducción.** Toda pregunta tiene enunciado y todas sus opciones en
  los dos idiomas, sin cadenas vacías; entre 2 y 5 opciones con ids `A`–`E`
  únicos; **exactamente una** correcta; y la fase, la destreza y el ámbito
  coinciden con el bloque en el que vive.
- **Volumen.** Hay banco suficiente para un simulacro completo (≥ 30 preguntas
  por ámbito), o el ámbito está marcado `bankPending` y entonces trae 0
  preguntas y su alcance oficial como teoría.
- **Reparto de la respuesta correcta.** Ninguna letra supera el 45 % del banco, y
  toda letra que se ofrece es la correcta alguna vez. Éste es el guardarraíl del
  fallo de `4414216`, donde un banco llegó a tener la B correcta 77 veces de 80.
- **Explicaciones.** 100 % en los bancos de ámbito, ≥ 85 % en los de
  razonamiento, que arrastran preguntas oficiales de EPSO publicadas sin
  solución.

Y transversalmente: ningún id de pregunta se repite entre bloques, los
enunciados de EUFTE y la guía del día del examen están completos, cada pregunta
del banco real declara su figura, y los metadatos de convocatoria cuadran (las
plazas por ámbito suman el total anunciado, el plazo cierra después de abrirse,
los justificantes vencen después del cierre, el ámbito del usuario está
convocado).

**`App.routes`** monta la aplicación entera (`<App />`, con su `Layout`,
`Suspense`, barra lateral y selector de convocatoria) y navega por el hash como
lo haría el navegador. Por cada ruta y cada idioma comprueba que aparece
contenido real —ni el indicador de carga, ni un `main` vacío— y además:

- Abrir `/campo/<ámbito>` **arrastra la convocatoria a la que pertenece**, para
  que no se lean las plazas y los plazos de la otra.
- El atributo `data-competition` de `<html>`, del que cuelga el color de toda la
  interfaz, sigue a la convocatoria activa.
- Cambiar de idioma cambia el texto **entero**: no queda ni un resto del otro.

### 4. `build` y `dist` — lo que se publica

`vite build` y después una auditoría de los archivos reales, que es lo que
jsdom no puede hacer: en un DOM simulado nada se descarga, así que los tests de
rutas pasarían igual con la carpeta de figuras vacía.

- `dist/index.html` existe, referencia la ruta base de GitHub Pages
  (`/epso-ad429-26-prep/`) y carga un módulo JavaScript.
- Todo lo que `index.html` enlaza existe en disco.
- Hay un chunk de contenido por bloque generado (12), es decir que Rollup los
  sigue separando y la carga inicial no arrastra las 1088 preguntas de golpe.
- Las **240 imágenes** de las 120 preguntas ilustradas están publicadas, en
  enunciado y opciones.
- No hay ningún archivo de 0 bytes.

### 5. La página `/verificacion` — el sitio ya desplegado

Enlace **Verificación** al pie de la barra lateral. Se ejecuta sola al abrirla y
no necesita terminal ni servidor: es parte de la propia web, así que sirve
igual en local y sobre GitHub Pages, desde el móvil o desde otro equipo.

Ejecuta las mismas invariantes de contenido de `selfCheck.ts` y añade dos cosas
que sólo un navegador de verdad puede comprobar:

- **Los bloques de contenido se descargan.** Un `import()` dinámico que falla
  por una ruta base equivocada se ve aquí y en ningún otro sitio.
- **Las 240 imágenes se descargan y se decodifican.** Un 404, un `.webp`
  truncado o un archivo de 0 bytes se manifiestan todos como
  `naturalWidth === 0`.

---

## Cobertura, y por qué no basta

```bash
npm run coverage      # informe por archivo + HTML en platform/coverage/
```

Estado actual: **84 % de sentencias, 72 % de ramas**. El contenido generado
queda fuera del cálculo —son cientos de miles de líneas de datos que ninguna
prueba «recorre», e incluirlas hundiría el porcentaje sin decir nada del
código—; de su corrección se ocupa `contentIntegrity`.

Pero la cobertura mide qué líneas se **ejecutan**, no qué comportamiento se
**comprueba**. Un test que recorre una función sin afirmar nada sobre su
resultado da cobertura y cero garantías. Por eso hay una segunda herramienta:

```bash
npm run mutation      # ~2 min
```

`scripts/mutation_check.py` rompe el código a propósito, una cosa cada vez, y
exige que algún test falle. Cada mutación es exactamente el daño que un test
dice detectar. Si la suite sigue en verde, ese test es decorativo.

**Esto no es teórico.** La primera vez que se pasó, **4 de 16 mutaciones
sobrevivieron**:

| Mutación que no se detectaba | Por qué el test no servía |
| --- | --- |
| `shuffle` sesgado (sortear sobre todo el array) | El test comprobaba que salía una permutación, y una barajada sesgada también lo es |
| Una pregunta sin responder cuenta como acertada | El test miraba la pantalla, y la puntuación se calcula **dos veces**: para la pantalla y para el intento guardado |
| El simulacro no recorta el banco al tamaño del examen | El test usaba un banco más pequeño que el examen, donde recortar no cambia nada |
| Guardar el intento dos veces | No es alcanzable desde la interfaz; el test prometía algo que no comprobaba |

Los cuatro tests se reescribieron. Hoy **las 35 mutaciones se detectan**, y el
script restaura siempre el código, incluso si una ejecución falla.

Conviene lanzar `npm run mutation` al tocar tests o la lógica que vigilan, no en
cada commit: tarda un par de minutos porque ejecuta la suite una vez por
mutación.

### Lo que sigue con poca cobertura, a propósito

- `ShapeIcon.tsx` (18 %) dibuja las figuras de razonamiento abstracto en SVG.
  El banco real se sirve hoy como recortes del libro, y el intérprete que lo
  alimenta (`abstractFigure.ts`) está al 97 %: cubrir el dibujo serían
  aserciones sobre píxeles con poco valor.
- `SelfCheckPage` y `SettingsPage` (76 % y 62 %) son sobre todo interfaz sobre
  lógica que ya está cubierta en `selfCheck.ts` y `studyStore.ts`.

---

## Comprobado que falla cuando debe

Un test que no puede fallar no vale nada. Las capas del script se validaron
introduciendo el daño que pretenden detectar; lo equivalente para la suite de
tests está automatizado en `npm run mutation`, descrito arriba.

| Daño introducido | Capa que lo cazó | Mensaje |
| --- | --- | --- |
| Vaciar una traducción al español | `unit` | `field-cyber-1 · opción A: vacío en 'es'` |
| Poner la correcta en la B en las 120 preguntas | `unit` | `la letra B es la correcta en 120 de 120` |
| Hacer que `EuftePage` lance al renderizar | `unit` | falla `/eufte` en los dos idiomas |
| Editar un `Docs/*.md` sin reconstruir | `content` | `los Docs/*.md y src/data/*.generated.ts estaban desincronizados` |
| Borrar una figura de `dist/` | `dist` | `falta una figura en dist/: figures/abstract/abs-real-42-options.webp` |
| Borrar una figura y truncar otra a 0 bytes | `/verificacion` | `abs-real-7-prompt no se ha podido cargar` |

---

## Qué NO cubre

Conviene tenerlo claro para no confiar de más:

- **Nada visual.** Ni jsdom ni la página de verificación miran la maquetación:
  un desastre de diseño, un contraste ilegible o un menú que tapa el contenido
  pasan todas las pruebas. Eso se ve mirando.
- **Interacción real.** Que el foco recorra el formulario con el teclado, que el
  cronómetro sobreviva a un cambio de pestaña, que el diseño responda al ancho.
- **La corrección del contenido.** Se comprueba que hay exactamente una
  respuesta correcta, no que sea la correcta. Eso lo garantiza el origen: el
  anexo II de la convocatoria y las fuentes de `Referencias.txt`.
- **Rendimiento y accesibilidad**, más allá de que exista un `<nav>`.

Lo que faltaría para cerrar los dos primeros es una capa con Playwright que
recorriera la interfaz pulsando. Se dejó fuera a propósito: añade una
dependencia pesada y selectores frágiles a componentes que hoy no tienen
`data-testid`, y el hueco que de verdad importaba —que los chunks y las 240
imágenes se descarguen bajo la ruta base real— ya lo cierra la página
`/verificacion`, que además comprueba el sitio publicado y no una copia local.

---

## Al añadir cosas

| Si añades… | Tienes que… |
| --- | --- |
| Preguntas o teoría en `Docs/` | `python scripts/build_content.py` y commitear lo generado |
| Un ámbito nuevo | Darlo de alta en `COMPETITIONS` y en `contentLoader.ts`; los tests lo cubren solos |
| Una ruta nueva | Añadirla a `ROUTES` en `src/App.routes.test.tsx` |
| Un banco nuevo | Nada: hereda las invariantes de reparto de letras y de traducción |
| Una invariante nueva | Escribirla en `src/lib/selfCheck.ts`; test y página la ejecutan las dos |
| Un test nuevo | Añadir su mutación a `scripts/mutation_check.py` y confirmar que la caza |
