# Preparación EPSO/AD/429/26 — AD7

Plataforma para preparar la prueba de acceso a la oposición EPSO/AD/429/26 —
Administradores AD7, perfiles ICT.

## Stack

- React + TypeScript + Vite
- React Router (navegación)
- Tailwind CSS v4 (estilos)
- Zustand + `persist` (progreso guardado en `localStorage` del navegador)

No hay servidor propio: el sitio es estático y todo el contenido vive en el
propio código como datos estáticos. Lo único que sale fuera es el progreso del
candidato, que se guarda en su navegador y se sincroniza con una fila de
Supabase para que el ordenador y el móvil vayan solos. Se entra con una cuenta,
y las cuentas las aprueba una persona.

## Poner en marcha

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # compila a dist/
npm run lint     # oxlint
npm run test     # vitest
npm run verify   # verificación completa: contenido, tipos, tests, build y dist
npm run coverage # informe de cobertura
npm run mutation # rompe el código a propósito y exige que los tests lo cacen
```

El curso de fundamentos de ciberseguridad (`Docs/8.- *`) se redacta consultando
el manual de referencia con `python scripts/read_book.py --section 1.4`. El
libro es material con derechos, vive en `Docs/` y lo excluye `.gitignore`: lo
que se versiona es texto propio.

`npm run verify` es la comprobación que hay que pasar antes de subir nada:
encadena las seis etapas en unos 12 segundos y termina con código 1 si algo
falla.

Si PowerShell tiene deshabilitada la ejecución de scripts, `npm run verify` no
arranca (`SecurityError` sobre `npm.ps1`). Estas vías lo esquivan, porque no
son scripts de PowerShell:

```powershell
node scripts\verify.mjs      # desde platform/
npm.cmd run verify           # el atajo .cmd
```

o doble clic en **`verificar.cmd`**, en la raíz del repositorio, para no tocar
la terminal.

Aparte, la propia web trae una página de **Verificación** (enlace al pie de la
barra lateral, ruta `#/verificacion`) que comprueba el sitio *ya publicado*:
descarga de verdad los bloques de contenido y las 240 imágenes del banco real.
Es lo único que no se puede comprobar fuera de un navegador.

Qué cubre cada capa, qué NO cubre y cómo se validó que fallan cuando deben está
en [TESTPLAN.md](TESTPLAN.md).

## Estructura

```
src/
  types/content.ts       Modelo de datos: Question, TheoryDoc, EssayPrompt,
                          ReferenceLink, TestAttempt, EssayAttempt
  data/
    competition.ts        Datos estructurales de la convocatoria (fases, campos,
                          fechas) — usados para la navegación
    content.ts            Mantiene REFERENCE_LINKS a mano (preguntas/teoría
                          ya no se re-exportan combinadas desde aquí)
    content.<nombre>.generated.ts   Un chunk por destreza/campo/EUFTE/día
                          del examen (verbal, numerical, abstract,
                          field-data-science, field-ict-infrastructure,
                          field-ict-project-management, field-clouds-networks,
                          eufte, test-day), generado por scripts/build_content.py
                          a partir de ../Docs/*.md — NO editar a mano
    contentLoader.ts       Carga cada chunk bajo demanda con import()
                          dinámico + caché de promesas, consumido con
                          use() de React 19 (ver "Code-splitting" abajo)
  lib/
    progressStore.ts     Store de progreso (zustand + localStorage)
    account.ts            Quién entra: la decisión de acceso, pura y
                          sin red. Un fallo de la base NO es una negativa
    accountStore.ts       Quién ha entrado. No se persiste a propósito
    accountEngine.ts      La sesión: entrar, salir y vigilar los cambios
    practiceStore.ts      Lo respondido en los bancos de práctica y su
                          orden, persistidos: recargar ya no borra el rastro
    localeStore.ts        Store de idioma (es/en, zustand + localStorage) +
                          tipo Localized y helper pick(locale, valor)
    dictionary.ts, useT.ts   Diccionario de textos de interfaz y hook t()
    useCountdown.ts, time.ts, shuffle.ts   Utilidades para tests cronometrados
  components/
    layout/               Sidebar (fases, con la formación colgando del
                          test de ámbito), barra superior y menú de usuario
    PageHeader, PhaseCard, Tabs, EmptyState, FormatBadges
    Markdown.tsx           Render de Markdown (teoría, enunciados, tablas)
    LoginForm.tsx          La puerta, sin cablear: entrar y registrarse
                           entran por props y se prueban sin red
    AccessNotice.tsx       Hay sesión pero no se entra: pendiente,
                           revocado, o no se ha podido comprobar
    QuestionCard.tsx       Una pregunta con opciones y corrección
    PracticeBank.tsx       Banco de práctica sin cronometrar: enunciado
                           entero en la cabecera, veredicto al plegar y
                           reactivación (que rebaraja al vaciarse)
    TimedTest.tsx          Simulacro cronometrado (setup → test → resultados)
    EssayRunner.tsx         Editor cronometrado para prompts EUFTE
    AttemptHistory.tsx, EssayHistory.tsx   Historial de intentos guardados
  pages/
    Dashboard.tsx
    ReasoningOverview.tsx / ReasoningSkillPage.tsx   (Fase 1: verbal/numérico/abstracto)
    FieldMcqOverview.tsx / FieldMcqPage.tsx           (Fase 2: MCQ de campo;
                           la portada redirige al ámbito elegido en Ajustes)
    EuftePage.tsx                                     (Fase 3: redacción EUFTE)
    TestDayPage.tsx                                   (logística del examen remoto)
    ResourcesPage.tsx                                 (convocatoria + referencias)
    ProgressPage.tsx                                  (estadísticas)
    CalendarPage.tsx, SettingsPage.tsx, SelfCheckPage.tsx  (menú de usuario)
    LoginPage.tsx                                     (cablea LoginForm)

scripts/
  build_content.py        Parsea ../Docs/*.md (+ ../Docs/es/*.md para la
                          teoría en español) y regenera los 12 chunks
                          src/data/content.<nombre>.generated.ts. Volver a
                          ejecutar (`python scripts/build_content.py`) tras
                          editar cualquier Docs/*.md o Docs/es/*.md.
```

### Code-splitting del contenido

Cada destreza de razonamiento, campo de MCQ y EUFTE vive en su propio
chunk (`content.<nombre>.generated.ts`) en vez de un único archivo
combinado. Las páginas que necesitan ese contenido (`ReasoningSkillPage`,
`FieldMcqPage`, `EuftePage`) lo cargan con `import()` dinámico a través de
`src/data/contentLoader.ts` y lo leen con `use()` (React 19), suspendiendo
bajo el `<Suspense>` que envuelve el `<Outlet/>` en `Layout.tsx` mientras
el chunk se descarga. Esto mantiene el bundle inicial pequeño (~142 KB
gzip) en vez de cargar las ~1100 preguntas de toda la plataforma de golpe;
cada chunk de contenido solo se descarga la primera vez que el usuario
visita esa página en concreto, y queda cacheado por el propio navegador
después.

## Idioma (ES/EN)

La interfaz, los 25 documentos de teoría, los bancos de preguntas y los 14
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

## Versionado

La versión sale de `package.json` y de ningún otro sitio: Vite la inyecta como
`__APP_VERSION__` (ver `vite.config.ts`) y la barra lateral la enseña abajo a la
izquierda. Dos números que hubiera que subir a mano se desincronizarían a la
primera.

Son dos cifras, `MAYOR.MENOR`, y lo que las mueve es el tipo de cambio, no su
tamaño:

| | Cuándo sube |
| --- | --- |
| **Mayor** | Cambia la forma de usar la plataforma: navegación, entrada, una fase que aparece o desaparece, o algo que obliga al candidato a reaprender dónde está lo que ya usaba. |
| **Menor** | Se añade material o una funcionalidad dentro de la forma que ya había: un banco nuevo, un módulo de curso, una pantalla más colgando de lo existente, una corrección. |

`1.0` fue la primera versión con el esquema en marcha. Al tocar el repositorio,
subir el número en `package.json` es parte del cambio, no un trámite posterior.

| Versión | Qué entró |
| --- | --- |
| `1.7` | Perfil de administrador: la cola de solicitudes, dar y quitar acceso, borrar el progreso o la cuenta de alguien, y bajar y restaurar el progreso de un usuario concreto. El fichero manual sale de Ajustes y pasa ahí. |
| `1.6` | Un botón de guardar en la cabecera, al lado del perfil, que dice cuánto hace que se guardó por última vez. Estaba enterrado en Ajustes. |
| `1.5` | Cuentas de verdad: se entra con correo y contraseña, cada cuenta tiene su progreso, y registrarse no da acceso — lo aprueba un administrador. Fuera la contraseña compartida que iba compilada en el paquete. |
| `1.4` | El progreso se sincroniza en una base de datos (Supabase) en vez de Google Drive: sin consola de Google Cloud, sin nada que pegar en cada navegador y sin volver a autorizar cada hora. |
| `1.3` | Tablón de convocatorias: un bot revisa los listados de EPSO a diario. Y el progreso se sincroniza con Google Drive, sin ficheros a mano. |
| `1.2` | Figuras generadas por el motor en razonamiento abstracto, con su propia procedencia en el filtro; fuera el banco bonus de IA de esa sección. |
| `1.1` | Exportar e importar el progreso, para llevarlo entre el ordenador y el móvil. |
| `1.0` | Primera versión con el esquema de versionado en marcha. |

## Llevar el progreso a otro dispositivo

Lo hace solo: hay cuentas de verdad y el progreso vive en una fila de base de
datos, así que el ordenador y el móvil van solos en cuanto se entra en los dos.
Ver «Sincronización entre dispositivos» más abajo.

Hasta la versión `1.6` había además un puente manual en Ajustes —exportar un
fichero y meterlo en el otro dispositivo—. Se retiró en la `1.7`: con la
sincronización funcionando no aportaba nada al candidato, y bajar y restaurar un
progreso pasó a ser cosa del administrador y sobre la cuenta de otra persona
(ver «El perfil de administrador»).

Lo que **no** se retiró es la lógica: `backup.ts` sigue siendo el corazón de la
sincronización, y la regla que la gobierna sigue siendo que **fusionar dos veces
lo mismo tiene que dejar el dispositivo igual que fusionarlo una**. El calendario
se queda, día a día, con el mayor de los dos valores; los intentos se unen por
id; y los ajustes, el perfil y los idiomas no se tocan nunca al fusionar.


## Figuras generadas por el motor

El razonamiento abstracto tiene dos procedencias: el **banco real** (el libro,
servido con sus recortes escaneados) y las **generadas**. Las construye el motor de figuras
abstractas, un proyecto aparte y público,
[`migurome/abstract-reasoning-engine`](https://github.com/migurome/abstract-reasoning-engine)
(en local, `Abstract figures Gen`): cada ejercicio nace de un programa de
reglas, se pinta en SVG y lleva la prueba de que tiene una sola respuesta.

La plataforma no genera nada ni vuelve a pintar las figuras: consume un banco ya
exportado. Volver a pintarlas enseñaría al candidato algo distinto de aquello
sobre lo que se demostró que la respuesta es única.

Hasta la 1.2 hubo un tercer banco, el **bonus** redactado por IA, que describía
las figuras con palabras. Ya no se importa: la prueba real se ve dibujada, y
leer la descripción de una figura entrena otra cosa. El capítulo sigue en
`Docs/3.- Abstract reasoning.md` por si hiciera falta recuperarlo.

El banco vive en `Docs/engine/abstract-bank.json` y entra así. Desde el
repositorio del motor:

```bash
npm run -s are -- export --out "<EPSO>/Docs/engine/abstract-bank.json"   # se niega con cambios sin commitear
npm run -s are -- validate "<EPSO>/Docs/engine/abstract-bank.json" --deep
```

Con rutas absolutas: npm resuelve las relativas desde donde se lance, no desde
el repositorio del motor. Y nunca `--allow-dirty` para un banco que se vaya a
commitear: sin commit limpio, nadie podría regenerarlo después. El
`engine.commit` que registra el banco pertenece a ese repositorio público:
cualquiera puede clonarlo en ese commit y volver a sacar el mismo fichero.

El banco de ahora son 282 ejercicios, pedidos de 40 en 40 por familia
(`--per-family 40 --budget 1500`). Seis familias llegaron a 40; setgrid se quedó
en 30 y countgrid en 12, y el informe lo dice como `shortfall` en vez de bajar
el rigor para rellenar el cupo.

Y desde `platform/`:

```bash
python scripts/build_content.py
node scripts/verify.mjs
```

Y después, en un navegador de verdad: Razonamiento abstracto → Banco de práctica
→ «Generadas», recorriendo las preguntas. jsdom no decodifica imágenes, así que
ninguna prueba automática dice si un SVG se pinta de verdad. El primer banco del
motor pasó todas y tenía 30 figuras en blanco (ver TESTPLAN, «Qué NO cubre»).

`validate --deep` vuelve a generar cada pregunta desde su procedencia y exige el
mismo `contentHash`: demuestra que el fichero no se tocó a mano y que cada ítem
sigue pasando las comprobaciones del motor actual. Para eso el JSON conserva
`provenance.config` y `provenance.program`, que `build_content.py` deja fuera
del bloque que descarga el navegador: no se usan allí y suponen casi la cuarta
parte del peso. El orden de las opciones, el
reparto de la letra correcta y cada explicación vienen del motor y **no se
retocan al importar**: reordenar una opción la separaría de su explicación.

En EPSO lo vigilan tres capas:

| Dónde | Qué hace |
| --- | --- |
| `build_content.py` | Rechaza un formato distinto de 1, un banco exportado sin commit limpio del motor (`engine.dirty`), ids sin `abs-gen-`, preguntas que no son de abstracto o sin la etiqueta `engine` |
| `selfCheck.ts` (en el build y en el sitio publicado) | Rechaza opciones sin figura, un `figureOnly` que contradice a las figuras, la falta de procedencia, SVG que no es XML bien formado —un atributo repetido basta para que el navegador no pinte la figura— o que lleva `<script>`, `<foreignObject>`, atributos `on…` o enlaces externos, y tableros sin exactamente una casilla por adivinar |
| `QuestionCard` | Pinta cada figura dentro de una `<img>`: el SVG no ejecuta nada, sus estilos no se escapan y sus ids no chocan con los de otra figura |

Sin fichero, `build_content.py` no añade ninguna pregunta, y no es un error.

## Tablón de convocatorias

La pestaña **Tablón** publica las oposiciones de personal permanente que EPSO ha
publicado este año —abiertas o no— y cualquiera que esté abierta ahora mismo.
En verde, las publicadas en el último mes.

EPSO no tiene feed ni API: sus listados son tablas de una vista de Drupal, y el
bot se agarra a los nombres de campo (`field-epso-deadline`), no a la
maquetación. Lee tres, porque cada uno sabe algo que los otros no:

| Listado | Lo que aporta |
| --- | --- |
| `open-competition-permanent-staff` | grado, sedes y plazo de presentación |
| `job-opportunities/in-progress` | el número oficial (`EPSO/AD/429/26 - 1`) |
| `job-opportunities/closed` | el número de lo ya terminado, paginado |

Y entra **una sola vez** en la ficha de cada convocatoria para leer su
calendario («Application period: 08/09/2026 - …»): los listados no publican
fecha de publicación, y sin ella «nueva» sólo podría significar «la vimos hoy»,
que el primer día es verdad para todas.

```bash
node scripts/board_fetch.mjs                 # lee EPSO y guarda Docs/board/notices.json
node scripts/board_fetch.mjs --dry-run       # lee y cuenta, sin escribir
node scripts/board_fetch.mjs --from carpeta  # lee páginas guardadas, sin red
python scripts/build_content.py              # el JSON pasa a src/data/board.generated.ts
```

**La regla que manda sobre todas:** si un listado deja de tener la forma que el
lector espera, el bot **falla y no escribe nada**. Un raspador que ante un
cambio de plantilla devuelve cero en silencio haría que el tablón dijera «no hay
convocatorias» justo el día que salga la que importa. Una lista vacía de verdad
sí es legítima, y se distingue porque la cabecera de la tabla sigue estando.

`.github/workflows/board.yml` lo ejecuta a diario (06:20 UTC), regenera el
contenido, commitea **sólo si algo cambió** y pide el despliegue a mano: un push
hecho con el `GITHUB_TOKEN` no dispara otros workflows. El fichero no guarda
ninguna marca de «revisado hoy», que crearía un commit vacío cada día; que la
revisión se hizo lo cuenta el historial de ejecuciones. Y GitHub desactiva los
workflows programados tras 60 días sin actividad en el repositorio.

## Quién entra

Se entra con una cuenta de verdad: correo y contraseña, una fila en la base de
datos y un progreso propio. Registrarse **no da acceso** — deja la cuenta en
`pending`, y hace falta que un administrador la apruebe.

Hasta la versión `1.4` la puerta era otra cosa: un usuario y una contraseña
compilados en el paquete, iguales para todos, y el propio archivo lo decía sin
rodeos —era un cerrojo de puerta mosquitera, no una cerradura—. Con cuentas de
verdad esa puerta sobraba, y su comentario ya anticipaba el día: *«si algún día
hubiera datos que sí importara proteger, esto habría que sustituirlo por
autenticación de verdad»*.

| Pieza | Papel |
| --- | --- |
| `account.ts` | La decisión: dada una situación, qué pantalla toca. Pura, sin red, probada entera |
| `accountStore.ts` | Quién ha entrado. **No se persiste**, a propósito |
| `accountEngine.ts` | La sesión: entrar, salir, y vigilar los cambios |
| `components/LoginForm.tsx` | La puerta, con entrar y registrarse por props |
| `components/AccessNotice.tsx` | Hay sesión pero no se entra, en sus tres variantes |

Cuatro decisiones, y ninguna es cosmética:

- **Un fallo de la base de datos no es una negativa.** Si no se puede leer la
  cuenta —la tabla no existe, no hay red, la política está mal puesta— la web
  dice que *no se sabe* y ofrece reintentar. Tratarlo como «no estás aprobado»
  dejaría al administrador fuera de su propia aplicación por un problema de red,
  y encima mintiéndole sobre la causa.
- **Mientras no se sabe si hay sesión no se enseña la puerta.** Recuperarla del
  disco tarda un instante, y enseñar el acceso en ese instante la haría
  parpadear en cada recarga a quien ya está dentro.
- **La cuenta no se guarda en el navegador.** Un «aprobado» en disco
  sobreviviría a una revocación: el administrador quitaría el acceso y el
  interesado seguiría entrando hasta vaciar su almacenamiento. Se pregunta al
  arrancar y en cada cambio de sesión, siempre.
- **Un papel o un estado que no se reconozcan se degradan**, a candidato y a
  pendiente. La alternativa —dejarlos pasar— haría que una errata en la base de
  datos concediera accesos.

Y una consecuencia de todo lo anterior que conviene tener presente: la vigilancia
de la sesión se arranca en `main.tsx` y no dentro de `App`, de modo que `App` es
una función pura de lo que hay en el almacén. Eso es lo que permite probar las
cinco pantallas de la puerta fijando el almacén, sin que ningún efecto salga a
preguntarle a Supabase por detrás.

El SQL que crea las cuentas y sus políticas está en [`../Docs/sql/`](../Docs/sql/).

## El perfil de administrador

La ruta `/admin` **no existe** para quien no manda: escribirla a mano lleva al
panel, no a una página vacía. Y esconder el enlace no es la protección: la pone
la base de datos, cuyas políticas sólo dejan leer y escribir la tabla de cuentas
a quien es administrador. La interfaz aporta no ofrecer lo que va a fallar.

| Pieza | Papel |
| --- | --- |
| `admin.ts` | Qué se puede hacer sobre quién, el orden de la lista y el nombre del fichero. Puro, probado entero |
| `adminApi.ts` | Seis llamadas a la base y ninguna decisión |
| `components/AdminPanel.tsx` | Lo visible, con las acciones por props |
| `pages/AdminPage.tsx` | El cableado y la validación de lo que se restaura |

Qué se puede hacer: aprobar y revocar el acceso, borrar el progreso de alguien,
borrar su perfil, y bajarse o restaurar el progreso de una persona concreta.

Cuatro decisiones que no son cosméticas:

- **Nadie se desarma a sí mismo.** Sobre la fila propia no se ofrece ninguna
  acción, y se dice por qué. La base de datos no lo impide —su política pregunta
  si eres administrador, no a quién tocas—, así que lo impide `admin.ts`. Un
  administrador que se revoca deja el sistema sin nadie capaz de aprobar a nadie
  y sin forma de arreglarlo salvo desde el SQL.
- **Quitar el acceso y borrar los datos están separados**, hasta en el color. De
  lo primero se vuelve aprobando otra vez; de lo segundo no se vuelve. Un solo
  botón que hiciera las dos acabaría haciendo la que no se quería.
- **La pregunta de «¿seguro?» vive en el componente, no en el cableado.** No es
  donde queda más limpio: es donde un test puede verla. Una confirmación que
  ningún test mira es una confirmación que alguien quitará algún día sin que
  nada falle, y el síntoma será un progreso borrado de verdad. Lleva dentro el
  correo, porque un «¿estás seguro?» sin nombre se confirma sin leer.
- **Restaurar el progreso de alguien no toca el de quien mira.** Se valida el
  fichero y se escribe en la fila de esa persona; los almacenes de este
  navegador se quedan como están. Un fichero que no sea una copia de esta
  aplicación se rechaza antes de llegar a la base.

Lo que **no** se puede hacer desde aquí, y consta en el aviso: borrar la cuenta
de acceso. Eso exige la clave `service_role`, que no puede vivir en un
navegador. `/admin` borra el perfil y con él el acceso; la cuenta inerte se
elimina desde el panel de Supabase.

## Sincronización entre dispositivos

El progreso se guarda cada cinco minutos, al cambiar de pestaña y al abrir la
sesión, para que el ordenador y el móvil vayan solos. Vive en una fila de
Supabase, una por cuenta, y se configura en **Ajustes → Sincronizar entre
dispositivos**: hace falta entrar una vez en cada navegador.

| Pieza | Papel |
| --- | --- |
| `remoteSync.ts` | Todas las decisiones: cuándo bajar, cuándo fusionar, cuándo subir. Sin red, probado entero |
| `supabaseState.ts` | La fila vista como almacén: cuatro llamadas a PostgREST y la traducción a estado |
| `supabaseClient.ts` | El cliente, uno solo y creado tarde |
| `syncEngine.ts` | El reloj y la sesión. Lo arranca el armazón, una vez por pestaña |

Tres decisiones protegen el trabajo del candidato:

- **Al arrancar se fusiona, no se sustituye**, con la misma fusión del fichero
  manual (`backup.ts`): el calendario se queda con el máximo de cada día y los
  intentos se unen por id. Es idempotente, y eso importa porque el reloj va a
  bajar lo mismo muchas veces.
- **Sólo se sube si el estado cambió de verdad.** La huella ignora la hora de
  exportación; con ella dentro, cada ciclo subiría una copia idéntica.
- **Un fallo al subir no deshace lo fusionado**, y el ciclo siguiente reintenta.
  Y si la lectura falla, no se sube nada a ciegas: sobrescribiría lo que hubiera
  allí.

Y una cuarta que es la misma idea aplicada a la identidad: **al cambiar de
cuenta se olvida lo recordado** —qué versión se fusionó, qué huella se subió—,
porque habla de otra fila, y conservarlo dejaría el progreso sin subir.

### Por qué la clave puede ir en el paquete

`supabaseConfig.ts` lleva la URL del proyecto y la clave publicable, y las dos
van compiladas a la vista. Esa clave está diseñada para vivir en el navegador: no
da acceso a nada por sí misma. Lo que decide qué se puede leer y escribir son las
políticas por fila (RLS) de la propia base de datos, que sólo dejan tocar la fila
cuyo `user_id` coincide con el de la sesión. Quien copie la clave del paquete no
puede leer el progreso de nadie: necesitaría además la contraseña de la cuenta, y
eso no está aquí.

Y está comprobado, no supuesto. Con esa clave y sin sesión, un intento de
escribir en la tabla responde:

```
42501 — new row violates row-level security policy for table "study_state"
```

Ésa es la comprobación que hay que repetir si algún día se toca el SQL: si esa
escritura anónima llegara a funcionar, la clave del paquete dejaría de ser
inofensiva. La que **no** puede salir de Supabase es la `service_role` (o
`sb_secret_…`), que se salta el RLS entero; no está en este repositorio y no
debe estar nunca.

Esto es lo que hace que **no haya nada que configurar en cada dispositivo**. La
versión anterior sincronizaba con Google Drive y obligaba a crear un
identificador OAuth en Google Cloud y a pegarlo en cada navegador; se cambió por
esto para no depender de esa consola. El núcleo de decisiones —`remoteSync.ts` y
sus tests— sobrevivió intacto al cambio, que era justamente la razón de tenerlo
aislado detrás de una interfaz de dos métodos.

La tabla se crea una vez, con RLS encendida y un disparador que pone
`updated_at` en cada escritura (la marca con la que un dispositivo sabe si lo
guardado es más nuevo que lo que él ya fusionó; dejarla en manos del cliente
sería fiarse del reloj de cada teléfono). El SQL está en la cabecera de
`supabaseState.ts`.

El botón de la cabecera, al lado del perfil, guarda ahora mismo y dice cuánto
hace que se guardó por última vez. Está ahí y no sólo en Ajustes porque
responde, sin que haya que ir a buscarla, a la única pregunta que se hace quien
lleva una hora estudiando: ¿esto se ha guardado? Se recalcula solo cada medio
minuto —nada vuelve a pintar la cabecera mientras se estudia— y una marca de
tiempo en el futuro, que llega sola en cuanto dos relojes no coinciden, se lee
como «ahora» en vez de como «hace -3 min».

Queda **un** límite que la interfaz no esconde, porque si no el candidato creerá
que la web se ha roto: el guardado automático **sólo corre con la pestaña
abierta**. La sesión, en cambio, se renueva sola y no vuelve a pedir la
contraseña. El fichero manual de Ajustes sigue existiendo para copias de
seguridad, y funciona sin cuenta y sin internet.

## Estado actual

Plataforma funcional con contenido real: 1334 preguntas (200 verbal + 170
numérico + 402 abstracto + 442 field-MCQ — 120 Ciberseguridad, 82 Ciencia de
Datos y 80 cada una de Infraestructura TIC / Gestión de Proyectos TIC / Nubes y
Redes — más 120 del curso de fundamentos de ciberseguridad), 25 documentos de
teoría y 14 prompts de práctica EUFTE, generados desde `Docs/*.md` en 12 chunks
`src/data/content.<nombre>.generated.ts` cargados bajo demanda (ver
"Code-splitting del contenido" más abajo). Los ámbitos de la AD7 y la
ciberseguridad de la AD8 tienen banco propio; el de inteligencia artificial
publica de momento su alcance oficial (anexo II) sin banco.

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

1. ~~Revisar manualmente el contenido generado por IA~~ — hecho: los 4
   bancos field-MCQ completos (incluida la ampliación 41-80 de
   Infraestructura TIC/Gestión de Proyectos TIC/Nubes y Redes), EUFTE y
   los bancos bonus de numérico/abstracto pasaron por verificación
   independiente (re-derivar la respuesta correcta desde cero, sin mirar
   la marcada, y comparar). Se encontraron y corrigieron ~9 problemas en
   total (terminología GDPR imprecisa, una inconsistencia de traducción
   ES, una explicación de contratación pública de la UE que sobrestimaba
   la norma, ítems de razonamiento abstracto con patrones ambiguos, etc.).
   Sigue habiendo un matiz sin cerrar del todo: en `Docs/3.- Abstract
   reasoning.md` / su traducción, varios ítems del banco real tienen la
   respuesta confirmada contra el libro original, pero el mecanismo/patrón
   exacto de transformación solo se verificó parcialmente (queda anotado
   inline en el propio documento, caso por caso).
2. ~~Ampliar los bancos de Infraestructura TIC / Gestión de Proyectos TIC /
   Nubes y Redes~~ — hecho: los tres están ahora en 80 preguntas (10 por
   tema), cerca de la profundidad de las 82 de Ciencia de Datos.
3. ~~Trabajar la cola de sitios de referencia en `Referencias-pendientes.md`~~
   — hecho: las Categorías B y C (20 sitios de terceros) están revisadas y
   cerradas, todas 🔴 prohibido o 🔵 bajo valor; ninguna aportó contenido
   integrable. Solo queda pendiente un ítem 🟡 en Categoría A que requiere
   inscripción manual de una persona en un LMS externo, y dos sitios con
   fallos técnicos (HTTP 522/429) a reintentar si se retoma la lista.
4. ~~Code-splitting del contenido~~ — hecho: `build_content.py` genera un
   chunk por destreza/campo/EUFTE (`src/data/content.<nombre>.generated.ts`)
   en vez de un único `content.generated.ts` combinado; cada página lo
   carga bajo demanda con `import()` dinámico (`src/data/contentLoader.ts`
   + `use()` de React 19, con `<Suspense>` en `Layout.tsx`). El chunk
   inicial baja de ~3,5 MB (995 KB gzip) a 463 KB (142 KB gzip); el resto
   solo se descarga al visitar esa página en concreto.
5. ~~Revisar las traducciones en `Docs/es/`~~ — hecho: pasada de
   corrección en español natural (no de corrección factual, ya hecha
   antes) sobre los 8 bloques de contenido. Se corrigieron ~35
   problemas concretos: registro tú/usted unificado en razonamiento
   abstracto, el verbo inventado "ciclar" sustituido en ~88 sitios,
   formato numérico anglosajón localizado en ~2.300 cifras del banco
   de numérico, "contrato marco" → "acuerdo marco" (término correcto
   de contratación pública UE), y varios calcos/anglicismos e
   incoherencias de terminología puntuales por área.
6. ~~`npm run lint` (oxlint) bloqueado por una directiva de Control de
   aplicaciones de Windows~~ — resuelto por sí solo: el binario nativo
   (`@oxlint/binding-win32-x64-msvc`) ya se ejecuta sin problemas en
   este entorno (verificado con un fichero de prueba con errores
   deliberados, que oxlint detectó correctamente). `npm run lint`
   sobre todo `src/` (55 ficheros) no reporta ningún problema.
