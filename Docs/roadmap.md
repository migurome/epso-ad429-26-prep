# Roadmap e historial de cambios

Este documento es la **fuente única** de las dos cosas: qué entró en cada
versión y qué está por hacer. La tabla de versiones del README y la página
`/roadmap` salen de aquí, para que no haya dos verdades distintas.

Acordado el 18/09/2026.

## Historial de versiones

| Versión | Qué entró |
| --- | --- |
| `1.9` | El banco de práctica se parece al examen: contador de 100 s por pregunta, filtro por estado, la fecha de cada respuesta y un paso explícito para darla por repasada. El calendario cuenta las preguntas sueltas. |
| `1.8` | Pedir acceso deja de crear una cuenta: se manda el correo y nada más, y la contraseña la elige cada uno cuando el administrador le da el visto bueno. |
| `1.7` | Perfil de administrador: la cola de solicitudes, dar y quitar acceso, borrar el progreso o la cuenta de alguien, y bajar y restaurar el progreso de un usuario concreto. El fichero manual sale de Ajustes y pasa ahí. |
| `1.6` | Un botón de guardar en la cabecera, al lado del perfil, que dice cuánto hace que se guardó por última vez. Estaba enterrado en Ajustes. |
| `1.5` | Cuentas de verdad: se entra con correo y contraseña, cada cuenta tiene su progreso, y registrarse no da acceso — lo aprueba un administrador. Fuera la contraseña compartida que iba compilada en el paquete. |
| `1.4` | El progreso se sincroniza en una base de datos (Supabase) en vez de Google Drive: sin consola de Google Cloud, sin nada que pegar en cada navegador y sin volver a autorizar cada hora. |
| `1.3` | Tablón de convocatorias: un bot revisa los listados de EPSO a diario. Y el progreso se sincroniza con Google Drive, sin ficheros a mano. |
| `1.2` | Figuras generadas por el motor en razonamiento abstracto, con su propia procedencia en el filtro; fuera el banco bonus de IA de esa sección. |
| `1.1` | Exportar e importar el progreso, para llevarlo entre el ordenador y el móvil. |
| `1.0` | Primera versión con el esquema de versionado en marcha. |

## Lo siguiente: cuentas de verdad y perfil de administrador

La versión `1.4` dejó la sincronización funcionando pero con una contradicción a
la vista: para entrar en la web hay una contraseña compartida compilada en el
paquete (`migurome/migurome`), y además cada persona entra en su cuenta de
Supabase desde Ajustes. Dos puertas, una de ellas de mentira. El objetivo de
`1.5` es que haya **una sola puerta, la de verdad**, y que las cuentas las
autorice una persona.

### Fase 0 — La base de datos (SQL, una vez)

Tabla `profiles`, una fila por cuenta, con `role` (candidate/admin) y `status`
(pending/approved/revoked). Un disparador crea el perfil **en pendiente** en
cuanto alguien se registra, así que registrarse no da acceso a nada.

Dos trampas, y las dos muerden:

- Una política sobre `profiles` que consulte `profiles` **recursa
  infinitamente**. Se resuelve con funciones `SECURITY DEFINER`
  (`is_admin()`, `is_approved()`), que leen la tabla saltándose el RLS.
- **El orden importa dentro del fichero**: los perfiles de las cuentas que ya
  existen se crean *antes* de endurecer la política de `study_state`. Al revés,
  el administrador se queda fuera de su propio progreso, que ya está
  sincronizando.
- Lo que **no** importa es cuándo se cree la cuenta del administrador, y eso
  costó un intento. La primera versión pedía crearla antes y pegaba el correo en
  un `update`; un espacio delante al pegarlo no da error, actualiza cero filas y
  deja el sistema sin nadie que pueda aprobar a nadie. Ahora el correo vive en
  una función `admin_email()`, se compara con `lower(trim(...))`, y tanto el
  disparador del registro como el repaso de las cuentas existentes lo consultan:
  sale bien en cualquier orden, y el fichero se puede volver a ejecutar entero.

El SQL está en [`Docs/sql/`](sql/), numerado por orden de aplicación.

### Fase 1 — Una sola puerta — **hecha** (`1.5`)

La puerta es el acceso de Supabase: correo y contraseña de verdad.

- Registrarse lleva a una pantalla de **pendiente de aprobación**, no a la web.
- Revocado, a la misma pantalla con otro texto. Y una tercera, que no estaba
  prevista y resultó ser la importante: **no se ha podido comprobar**. Sin ella,
  la tabla sin crear o un corte de red se habrían leído como «no estás
  aprobado», dejando al administrador fuera de su propia web y mintiendo sobre
  la causa.
- Fuera las credenciales compiladas y su penalización de tres segundos: frenar
  el tanteo ya no es asunto de la web, sino del servidor, que además lo hace de
  verdad.
- La tarjeta de sincronización de Ajustes perdió su formulario: entrar en la
  web ya es entrar en la cuenta.
- Dos cambios de estructura que no estaban en el plan y los pidió el código: la
  vigilancia de la sesión se arranca en `main.tsx` —así `App` es una función
  pura del almacén y las cinco pantallas se prueban sin red—, y el formulario
  se partió en `LoginForm` (visible, con las acciones por props) y `LoginPage`
  (cableado), el mismo patrón de `BoardView`/`BoardPage`.

### Fase 2 — Botón de sincronización en la cabecera — **hecha** (`1.6`)

Al lado del perfil de usuario, un botón que guarda ahora y dice cuándo fue la
última vez que se habló con el servidor. Estaba enterrado en Ajustes, que es el
sitio donde nadie mira cuando quiere asegurarse de que su trabajo está a salvo.

Tres cosas que el trabajo pidió y el plan no:

- **El texto se recalcula solo cada medio minuto.** Nada vuelve a pintar la
  cabecera mientras se estudia, así que sin reloj propio diría «Guardado ahora»
  una hora después, con la misma cara.
- **Una marca de tiempo en el futuro se lee como «ahora».** La pone el
  servidor y el reloj del navegador puede ir atrasado; sin eso saldría «hace -3
  min», que parece una avería de la web cuando no lo es.
- **Se destapó un test intermitente** en la página de verificación. Daba por
  hecho que las imágenes «no llegan a descargarse nunca» y por tanto su sección
  seguía pendiente; no era cierto —arranca igual y pasa a «0 / 240»— y fallaba
  una de cada tres veces según lo que hubiera avanzado. Ahora mira el primer
  pintado, que es el instante que de verdad quería comprobar.

### Fase 3 — El perfil de administrador — **hecha** (`1.7`)

Ruta `/admin`, que sólo existe si el perfil es `admin`:

1. **La cola de solicitudes.** Quien se registre aparece aquí en pendiente.
   Aprobar o denegar es de una persona, nunca automático.
2. **Los perfiles.** Lista con su estado, y revocar el acceso.
3. **Borrar los datos de alguien.** Separado de revocar a propósito: quitar el
   acceso y borrar el progreso son dos cosas distintas, y un solo botón que
   hiciera las dos acabaría haciendo la que no se quería.
4. **Bajar y restaurar el progreso de un usuario concreto.** El fichero manual
   deja de estar en Ajustes y pasa aquí, operando sobre la fila de otra persona.
5. **La verificación.** `/verificacion` —las comprobaciones de integridad que
   corren en el navegador sobre la web publicada— deja de ser pública y pasa a
   ser sólo del administrador.

Tres cosas que el trabajo pidió y el plan no:

- **La pregunta de «¿seguro?» vive en el componente, no en el cableado.** No es
  donde más bonito queda: es donde un test puede verla. Una confirmación que
  ningún test mira es una confirmación que alguien quitará algún día sin que
  nada falle, y el síntoma será un progreso borrado de verdad.
- **Quitar la tarjeta manual de Ajustes dejó dos cosas sin red**: liberar la URL
  temporal de la descarga y confirmar antes de destruir. Las dos estaban
  probadas y las dos se reconstruyeron sin tests al moverlas. La descarga se
  sacó a `download.ts` con los suyos; las confirmaciones, al componente.
- **Se destapó que había dos correos**: el de la cuenta y el que el candidato
  escribe en Ajustes. El menú de usuario intentaba servir a los dos. Ahora
  enseña el de la cuenta, que es la identidad de verdad.

### Fase 3 bis — Pedir acceso antes de tener cuenta — **hecha** (`1.8`)

Fuera de orden, y por una razón: en cuanto la Fase 3 estuvo en pie se vio que el
alta empezaba por el sitio equivocado. Para entrar en la cola había que **crear
la cuenta entera** —correo y contraseña— y esperar. Eso pide una contraseña para
algo que quizá nunca exista, que es justo la que la gente reutiliza y olvida, y
deja en `auth.users` una cuenta muerta por cada persona a la que se diga que no.

Ahora el orden es el natural: **se pide acceso dejando el correo y nada más**, y
la contraseña se elige después, cuando ya hay un sí.

- Tabla `access_requests`, con la única política de toda la base que deja
  escribir **sin haberse identificado**. Por eso es estrecha: sólo admite filas
  en espera, así que nadie se cuela aprobándose a sí mismo en el propio insert,
  y la forma del correo la impone un `CHECK` de la tabla, no la web.
- **El correo repetido se contesta como un envío correcto.** Hay un índice
  único, así que pedirlo dos veces responde `23505`; enseñar ese fallo
  convertiría la puerta en un detector de quién ha pedido acceso antes —se
  prueba un correo y la respuesta dice si está en la lista—.
- El disparador del registro consulta la cola: quien tiene el visto bueno entra
  ya aprobado, y queda apuntado quién se lo dio. Lo que **no** cambia es lo de
  siempre: registrarse sin haberlo pedido sigue sin dar acceso a nada. Eso es lo
  que permite dejar el registro abierto sin abrir la puerta.
- En `/admin`, dos colas y un solo número arriba: al administrador le da igual
  de cuál viene lo que le espera.

Tres cosas que el trabajo pidió y el plan no:

- **Crear la cuenta puede salir bien y aun así no dejarte dentro.** Supabase
  contesta que sí y no devuelve sesión en dos casos: si el proyecto exige
  confirmar el correo, y —callándoselo, para no delatar quién está registrado—
  si esa cuenta ya existía. La puerta se lo callaba también: se pulsaba y no
  ocurría nada, que es la manera más rápida de creer que la web está rota. Justo
  en el camino más importante del nuevo flujo, el de quien vuelve con un sí.
- **Sobre quien ya tiene cuenta, la cola no manda.** El visto bueno lo lee el
  disparador una sola vez, en el instante del registro. Aprobar después una
  solicitud ya usada no daría acceso a nadie, y el administrador se quedaría
  creyendo que sí. Ahora esas filas no ofrecen botón y dicen dónde se decide.
- **La validación nativa del navegador estorbaba.** Con `type="email"` el
  navegador rechaza el formulario antes de que la web mire nada, con un globo en
  el idioma del navegador y una regla más floja que la nuestra —acepta `a@b`,
  sin punto—. El aviso lo da ahora la web, traducido, y así además se prueba.

### El banco de práctica y el calendario — **hecho** (`1.9`)

Otra vez fuera del plan, y otra vez por lo mismo: se pidió después de usar lo
anterior. La lista de práctica funcionaba como una lista de lectura, y el
calendario no veía nada de lo que allí se hacía.

- **Contador al ritmo de examen**, 100 s por pregunta, que corre al abrirla y
  para al responder. No se detiene en cero: sigue en rojo y en negativo.
- **Sólo la flecha pliega.** La fila entera era un botón, y subrayar una palabra
  del enunciado cerraba la pregunta debajo del ratón.
- **Fecha de cada respuesta**, que es lo que permite todo lo demás.
- **Filtro por estado**: todas, pendientes, respondidas.
- **Responder ya no cierra la pregunta.** Sigue contando como pendiente hasta
  que el candidato pulsa «Hecha». «Respondida» y «repasada» pasan a ser dos
  estados distintos, porque entre marcar la opción y entender el porqué hay un
  paso, y es donde está el aprendizaje.
- **El calendario cuenta el trabajo suelto**, un apunte por día.

Tres cosas que el trabajo pidió y el plan no:

- **Cambió el formato del fichero de copia, de 1 a 2.** Guardar cuándo se
  contestó cada pregunta obligaba a ello, y ese número existe justo para esto:
  una versión anterior leería el campo esperando cadenas y descartaría en
  silencio **todas** las respuestas de práctica. Con el número subido se niega a
  abrirlo en vez de vaciarlo.
- **Lo ya respondido se conserva sin fecha.** La conversión corre una sola vez
  sobre lo que había guardado. Ponerle la de hoy habría contado como de esta
  tarde el estudio de semanas enteras, así que entra en blanco y no sale en la
  rejilla. Es lo honrado, y se nota: el calendario arranca vacío de sueltas.
- **Cinco mutaciones antiguas se quedaron apuntando a código reescrito.** El
  guion no encontró qué romper, avisó con `?` y las contó como supervivientes
  —que es lo correcto: no pudo comprobarlas—. Se reapuntaron una a una al código
  equivalente en vez de borrarlas, que habría sido perder la cobertura sin que
  nada se quejara.

### Fase 4 — Roadmap e historial dentro de la web — **siguiente**

La página `/roadmap` que enseña este documento, generada por
`build_content.py` como el resto del contenido.

## Límites que no se van a saltar

Conviene tenerlos escritos, porque son consecuencia de que la web sea estática y
volverán a aparecer cada vez que se pida algo parecido.

- **Crear la cuenta de otra persona desde la web no se puede.** Escribir en
  `auth.users` exige la clave `service_role`, que se salta el RLS entero y por
  tanto no puede vivir en un navegador. De ahí el reparto: el administrador da
  el visto bueno a un correo, y la cuenta la crea esa persona poniendo su
  contraseña. Eso es el «alta manual», y es también la razón de que la web no
  pueda avisar por correo de que ya puede entrar: mandar correo desde una web
  estática pide un servidor. Se avisa por donde se hable con esa persona.
- **El correo de una solicitud no está demostrado.** Cualquiera puede escribir
  el de otro. Mientras la cuenta no se crea eso no da acceso a nada, pero quien
  llegue primero a poner la contraseña se queda con el visto bueno dado a ese
  correo. Quien quiera cerrar esa rendija tiene el interruptor **Confirm email**
  en Supabase, que exige abrir el buzón antes de poder entrar.
- **Borrar la cuenta del todo, tampoco.** Por lo mismo. El administrador revoca
  el acceso y borra el progreso —eso sí son filas y las gobierna el RLS—, y la
  cuenta inerte se elimina con dos clics en el panel de Supabase. Se valoró una
  Edge Function que guardara la clave en el servidor; se descartó por ahora
  porque añade una CLI, un despliegue aparte y código que la verificación
  actual no cubre.
- **Ejecutar `npm run verify` desde el navegador, tampoco.** TypeScript, el
  linter, los tests y el build son procesos de Node. Lo que el administrador
  puede ver es el **resultado** de la última verificación publicada por el
  workflow —commit, fecha, las seis etapas y el log si alguna falló— y las
  comprobaciones de integridad que sí corren en el navegador.
- **El administrador puede leer el progreso de todos.** Es inherente a poder
  bajar y restaurar el de un usuario concreto. No es un descuido: es el precio
  de esa función, y la política de la base de datos lo dice explícitamente.

## Deuda que este trabajo deja anotada

- **El correo de Ajustes ya no sirve para nada.** La identidad la da la cuenta;
  ese campo sigue en el perfil local y en el fichero de estado porque quitarlo
  cambia el formato del `snapshot`, y eso pide una migración. Mientras tanto,
  pide un dato que no se usa en ninguna parte.
- **Las respuestas de práctica anteriores a la `1.9` no tienen fecha.** Se
  conservan y se ven marcadas, pero el calendario no puede colocarlas en ningún
  día, así que el trabajo suelto de antes no aparece en la rejilla. No hay forma
  de arreglarlo: ese dato no se guardó nunca.
- **La cola se puede llenar desde fuera.** Cualquiera puede insertar
  solicitudes: una por correo y con forma válida, pero sin límite de ritmo, y
  ponerlo pide un servidor. No dan acceso a nada y se quitan con un clic; si
  algún día molesta, se cierra la política y las altas vuelven al panel.
- **Borrar una cuenta desde `/admin` borra su perfil, no su acceso.** La cuenta
  de `auth.users` sigue existiendo y hay que eliminarla desde el panel de
  Supabase. Está dicho en el propio aviso de confirmación, pero es media
  operación en dos sitios.

## Lo que sigue pendiente de antes

- Las respuestas de la práctica a pantalla completa no se guardan.
- La sección «cerradas» del tablón se llenará cuando EPSO cierre una
  convocatoria de 2026.
- El motor de figuras podría generar más ejercicios con un `--budget` mayor
  (282 de 320 posibles en las familias setgrid/countgrid).
- En `Docs/3.- Abstract reasoning.md`, varios ítems del banco real tienen la
  respuesta confirmada contra el libro pero el mecanismo exacto sólo
  verificado en parte; queda anotado caso por caso en el propio documento.
