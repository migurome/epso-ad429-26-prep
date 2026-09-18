# Roadmap e historial de cambios

Este documento es la **fuente única** de las dos cosas: qué entró en cada
versión y qué está por hacer. La tabla de versiones del README y la página
`/roadmap` salen de aquí, para que no haya dos verdades distintas.

Acordado el 18/09/2026.

## Historial de versiones

| Versión | Qué entró |
| --- | --- |
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

### Fase 2 — Botón de sincronización en la cabecera — **siguiente**

Al lado del perfil de usuario, un botón que guarda ahora y dice cuándo fue la
última vez que se habló con el servidor. Hoy eso está enterrado en Ajustes, que
es el sitio donde nadie mira cuando quiere asegurarse de que su trabajo está a
salvo.

### Fase 3 — El perfil de administrador

Ruta `/admin`, visible sólo si el perfil es `admin`:

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
   ser sólo del administrador, con su log de fallos.

### Fase 4 — Roadmap e historial dentro de la web

La página `/roadmap` que enseña este documento, generada por
`build_content.py` como el resto del contenido.

## Límites que no se van a saltar

Conviene tenerlos escritos, porque son consecuencia de que la web sea estática y
volverán a aparecer cada vez que se pida algo parecido.

- **Dar de alta una cuenta desde la web no se puede.** Crear un usuario en
  `auth.users` exige la clave `service_role`, que se salta el RLS entero y por
  tanto no puede vivir en un navegador. El flujo real es: la persona se
  registra, y el administrador aprueba. Eso es el «alta manual».
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

## Lo que sigue pendiente de antes

- Las respuestas de la práctica a pantalla completa no se guardan.
- La sección «cerradas» del tablón se llenará cuando EPSO cierre una
  convocatoria de 2026.
- El motor de figuras podría generar más ejercicios con un `--budget` mayor
  (282 de 320 posibles en las familias setgrid/countgrid).
- En `Docs/3.- Abstract reasoning.md`, varios ítems del banco real tienen la
  respuesta confirmada contra el libro pero el mecanismo exacto sólo
  verificado en parte; queda anotado caso por caso en el propio documento.
