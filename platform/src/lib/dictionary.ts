import type { Localized } from './localeStore'

// Diccionario de textos de interfaz (no de contenido de examen). Claves
// planas, sin namespacing, porque el proyecto es pequeño y una jerarquía
// añadiría más ruido que valor.
export const DICT = {
  // Sidebar / navegación
  app_name: { es: 'Preparación EPSO', en: 'EPSO Preparation' },
  nav_dashboard: { es: 'Panel', en: 'Dashboard' },
  nav_reasoning: { es: 'Razonamiento', en: 'Reasoning' },
  nav_field_mcq: { es: 'Field-Related MCQ', en: 'Field-Related MCQ' },
  nav_eufte: { es: 'EUFTE', en: 'EUFTE' },
  nav_test_day: { es: 'Día del examen', en: 'Test day' },
  nav_resources: { es: 'Recursos', en: 'Resources' },
  nav_progress: { es: 'Progreso', en: 'Progress' },
  sidebar_footer: { es: '{posts} plazas · {fields} ámbitos', en: '{posts} posts · {fields} fields' },
  competition_selector_label: { es: 'Convocatoria', en: 'Competition' },
  open_menu: { es: 'Abrir menú', en: 'Open menu' },
  user_menu_label: { es: 'Tu cuenta', en: 'Your account' },
  user_menu_anonymous: { es: 'Candidato', en: 'Candidate' },
  user_menu_set_name: { es: 'Pon tu nombre en Ajustes', en: 'Add your name in Settings' },
  user_menu_sign_out: { es: 'Cerrar sesión', en: 'Sign out' },
  toggle_subsection: { es: 'Desplegar {section}', en: 'Expand {section}' },
  selfcheck_pending: { es: 'pendiente', en: 'pending' },
  app_version: { es: 'Versión {version}', en: 'Version {version}' },
  close_menu: { es: 'Cerrar menú', en: 'Close menu' },

  // LoginPage
  login_subtitle: { es: 'Acceso a tu preparación', en: 'Access to your preparation' },
  login_user: { es: 'Usuario', en: 'Username' },
  login_password: { es: 'Contraseña', en: 'Password' },
  login_submit: { es: 'Entrar', en: 'Sign in' },
  login_checking: { es: 'Comprobando…', en: 'Checking…' },
  login_wait: { es: 'Espera un momento…', en: 'Hold on a moment…' },
  login_error: { es: 'Usuario o contraseña incorrectos.', en: 'Wrong username or password.' },
  login_note: {
    es: 'Esta puerta no protege nada secreto: son apuntes de oposición y la aplicación es estática. Sirve para que la página no se abra sola.',
    en: 'This door protects nothing secret: these are study notes and the app is static. It just stops the page opening on its own.',
  },
  loading: { es: 'Cargando…', en: 'Loading…' },

  // Dashboard
  dashboard_title: { es: 'Panel de preparación', en: 'Preparation dashboard' },
  dashboard_description: {
    es: 'Las tres fases de la prueba de selección, en el orden en que se evalúan.',
    en: 'The three phases of the selection procedure, in the order they are assessed.',
  },
  dashboard_empty_title: { es: 'Sin actividad todavía', en: 'No activity yet' },
  dashboard_empty_description: {
    es: 'Cuando completes tests de práctica o redacciones EUFTE, tu progreso aparecerá aquí y en la sección Progreso.',
    en: 'When you complete practice tests or EUFTE essays, your progress will show up here and in the Progress section.',
  },

  // Fases (eyebrows genéricos)
  phase_1: { es: 'Fase 1', en: 'Phase 1' },
  phase_2: { es: 'Fase 2', en: 'Phase 2' },
  phase_n: { es: 'Fase {n}', en: 'Phase {n}' },

  // ReasoningOverview / FieldMcqOverview
  questions_and_minutes: { es: '{q} preguntas · {m} min', en: '{q} questions · {m} min' },
  reasoning_skill_card_description: {
    es: 'Teoría, banco de práctica, test cronometrado e historial.',
    en: 'Theory, practice bank, timed test and history.',
  },
  field_card_description: {
    es: 'Banco de preguntas específico de este campo de especialización.',
    en: 'Question bank specific to this specialisation field.',
  },
  field_card_scope_only: {
    es: 'Alcance oficial del ámbito. El banco de preguntas está pendiente.',
    en: 'Official scope of the field. The question bank is still pending.',
  },
  your_field_suffix: { es: 'tu campo', en: 'your field' },
  your_field_chosen_suffix: { es: 'Campo de especialización elegido.', en: 'Chosen specialisation field.' },

  // Tabs comunes (Razonamiento / Field MCQ / EUFTE)
  tab_theory: { es: 'Teoría', en: 'Theory' },
  tab_practice_bank: { es: 'Banco de práctica', en: 'Practice bank' },
  tab_timed_test: { es: 'Test cronometrado', en: 'Timed test' },
  tab_practice_prompts: { es: 'Temas de práctica', en: 'Practice prompts' },
  tab_history: { es: 'Historial', en: 'History' },

  empty_theory_title: { es: 'Todavía no hay material de teoría', en: 'No theory material yet' },
  empty_theory_description: {
    es: 'Aquí se mostrará la guía de estudio para esta prueba.',
    en: 'The study guide for this test will be shown here.',
  },
  empty_bank_title: { es: 'Banco de preguntas vacío', en: 'Empty question bank' },
  empty_bank_description: {
    es: 'Las preguntas de práctica de esta prueba aparecerán aquí, con corrección explicada opción por opción.',
    en: 'This test’s practice questions will appear here, with the correction explained option by option.',
  },
  empty_ad8_bank_title: {
    es: 'Todavía sin banco de preguntas',
    en: 'No question bank yet',
  },
  empty_ad8_bank_description: {
    es: 'La convocatoria AD8 es de septiembre de 2026 y el banco de este ámbito aún no está escrito. Lo que sí hay, en la pestaña Teoría, es su alcance oficial: el anexo II de la convocatoria, que es de donde salen las 30 preguntas del examen.',
    en: 'The AD8 competition dates from September 2026 and this field’s bank is not written yet. What is available, under the Theory tab, is its official scope: Annex II of the notice, which is where the exam’s 30 questions come from.',
  },
  empty_field_bank_description: {
    es: 'Las preguntas específicas de este campo se incorporarán en la fase de recopilación de contenido.',
    en: 'Questions specific to this field will be added during the content-collection phase.',
  },
  empty_essays_title: { es: 'Sin temas de redacción todavía', en: 'No essay prompts yet' },
  empty_essays_description: {
    es: 'Aquí aparecerán los enunciados de práctica para el EUFTE, junto con un editor cronometrado y una rúbrica de autoevaluación.',
    en: 'EUFTE practice prompts will appear here, together with a timed editor and a self-assessment rubric.',
  },

  n_exercise: { es: '{n} ejercicio', en: '{n} exercise' },

  // Nota para las preguntas de muestra oficiales de EPSO: la fuente publica
  // la clave de respuesta pero no el razonamiento, y el proyecto no inventa
  // explicaciones sobre material oficial (ver Docs/1.- Verbal reasoning.md).
  no_official_explanation: {
    es: 'EPSO publica la respuesta correcta de esta pregunta de muestra, pero no su razonamiento; aquí no se inventa ninguno.',
    en: 'EPSO publishes the correct answer to this sample question but not the reasoning behind it; none is invented here.',
  },

  // Figuras escaneadas del libro de referencia (ver ScannedFigure.tsx)
  figure_sequence_alt: {
    es: 'Secuencia de figuras del enunciado, tal como aparece en el libro',
    en: 'The question’s figure sequence, as printed in the book',
  },
  figure_options_alt: {
    es: 'Las cinco opciones A–E, tal como aparecen en el libro',
    en: 'The five options A–E, as printed in the book',
  },
  choose_option: { es: 'Elige una opción', en: 'Choose an option' },

  // PracticeBank
  filter_real_bank: { es: 'Banco real', en: 'Real bank' },
  filter_ai_bank: { es: 'Bonus (generado)', en: 'Bonus (generated)' },
  filter_all: { es: 'Todo', en: 'All' },
  n_questions: { es: '{n} preguntas', en: '{n} questions' },
  // El color solo no sirve: quien no lo distingue necesita leer el veredicto.
  answered_correct: { es: 'Acertada', en: 'Answered correctly' },
  answered_wrong: { es: 'Fallada', en: 'Answered wrongly' },
  practice_answered: { es: '{done} de {total} respondidas', en: '{done} of {total} answered' },
  practice_reactivate_one: { es: 'Reactivar esta pregunta', en: 'Reset this question' },
  practice_reactivate_all: { es: 'Reactivar todas', en: 'Reset all' },
  practice_reshuffled: { es: 'Orden barajado para esta vuelta.', en: 'Order shuffled for this pass.' },

  // TimedTest
  no_questions_available: {
    es: 'No hay preguntas disponibles todavía para este simulacro.',
    en: 'No questions are available yet for this mock test.',
  },
  timed_test_title: { es: 'Simulacro cronometrado', en: 'Timed mock test' },
  timed_test_setup_description: {
    es: '{n} preguntas en {m} minutos, en condiciones de examen: sin corrección hasta el final.',
    en: '{n} questions in {m} minutes, exam conditions: no feedback until the end.',
  },
  start_test: { es: 'Empezar test', en: 'Start test' },
  question_x_of_y: { es: 'Pregunta {x} de {y}', en: 'Question {x} of {y}' },
  question_n: { es: 'Pregunta {n}', en: 'Question {n}' },
  previous: { es: 'Anterior', en: 'Previous' },
  next: { es: 'Siguiente', en: 'Next' },
  finish_test: { es: 'Finalizar test', en: 'Finish test' },
  result: { es: 'Resultado', en: 'Result' },
  points_and_time: {
    es: '{scaled} / {max} puntos · {time} empleados',
    en: '{scaled} / {max} points · {time} spent',
  },
  passed: { es: 'Superado', en: 'Passed' },
  not_passed: { es: 'No superado', en: 'Not passed' },
  pass_mark_paren: { es: '(corte {min}/{max})', en: '(pass mark {min}/{max})' },
  retry_new_questions: { es: 'Repetir con preguntas nuevas', en: 'Retry with new questions' },

  // EssayRunner
  start_minutes: { es: 'Empezar ({n} min)', en: 'Start ({n} min)' },
  n_words: { es: '{n} palabras', en: '{n} words' },
  essay_placeholder: { es: 'Escribe tu respuesta aquí...', en: 'Write your answer here...' },
  finish: { es: 'Finalizar', en: 'Finish' },
  your_draft: { es: 'Tu borrador ({n} palabras · {t})', en: 'Your draft ({n} words · {t})' },
  no_text: { es: '(sin texto)', en: '(no text)' },
  self_review_notes: { es: 'Notas de autoevaluación (opcional)', en: 'Self-assessment notes (optional)' },
  self_review_placeholder: {
    es: '¿Qué mejorarías si lo volvieras a escribir?',
    en: 'What would you improve if you rewrote it?',
  },
  save_attempt: { es: 'Guardar intento', en: 'Save attempt' },
  saved: { es: 'Guardado', en: 'Saved' },

  // AttemptHistory / EssayHistory
  no_attempts_title: { es: 'Sin intentos registrados', en: 'No attempts recorded' },
  no_attempts_description: {
    es: 'Cada test cronometrado que completes quedará guardado aquí con tu puntuación y tiempo empleado.',
    en: 'Every timed test you complete will be saved here with your score and time spent.',
  },
  no_essays_title: { es: 'Sin redacciones guardadas', en: 'No saved essays' },
  no_essays_description: {
    es: 'Cada redacción EUFTE que completes y guardes quedará registrada aquí.',
    en: 'Every EUFTE essay you complete and save will be recorded here.',
  },
  col_date: { es: 'Fecha', en: 'Date' },
  col_score: { es: 'Puntuación', en: 'Score' },
  col_correct: { es: 'Aciertos', en: 'Correct' },
  col_time: { es: 'Tiempo', en: 'Time' },
  essay_history_meta: {
    es: '{n} palabras · {t} empleados',
    en: '{n} words · {t} spent',
  },

  // ProgressPage
  progress_eyebrow: { es: 'Progreso', en: 'Progress' },
  progress_title: { es: 'Estadísticas', en: 'Statistics' },
  progress_description: {
    es: 'Evolución de tus resultados por prueba, guardada localmente en este navegador.',
    en: 'Evolution of your results per test, saved locally in this browser.',
  },
  clear_history: { es: 'Borrar historial', en: 'Clear history' },
  clear_history_confirm: {
    es: '¿Borrar todo tu historial de intentos guardado en este navegador?',
    en: 'Clear your entire attempt history saved in this browser?',
  },
  no_tests_completed_title: { es: 'Aún no has completado ningún test', en: "You haven't completed any test yet" },
  no_tests_completed_description: {
    es: 'Cuando completes tests cronometrados o redacciones EUFTE, verás aquí tu puntuación media, tiempo empleado y evolución por prueba.',
    en: 'When you complete timed tests or EUFTE essays, you’ll see your average score, time spent and evolution per test here.',
  },
  col_test: { es: 'Prueba', en: 'Test' },
  col_attempts: { es: 'Intentos', en: 'Attempts' },
  col_average: { es: 'Media', en: 'Average' },
  col_best: { es: 'Mejor', en: 'Best' },
  col_total_time: { es: 'Tiempo total', en: 'Total time' },
  eufte_progress_summary: {
    es: '{n} redacción{plural} guardada{plural} · tiempo total {t} · presupuesto {m} min por redacción',
    en: '{n} essay{plural} saved · total time {t} · budget {m} min per essay',
  },

  // TestDayPage
  test_day_eyebrow: { es: 'Logística', en: 'Logistics' },
  test_day_title: { es: 'Preparación para el día del examen', en: 'Preparing for test day' },
  test_day_description: {
    es: 'Cómo es el examen remoto en casa: requisitos técnicos, qué puedes tener contigo, la calculadora en pantalla y trucos de otros candidatos.',
    en: 'What the remote at-home exam is like: technical requirements, what you can have with you, the on-screen calculator, and tips from other candidates.',
  },

  // ResourcesPage
  resources_eyebrow: { es: 'Recursos', en: 'Resources' },
  resources_title: { es: 'Convocatoria y referencias', en: 'Notice and references' },
  resources_description: {
    es: 'Datos estructurales de la convocatoria y enlaces de referencia recopilados para la preparación.',
    en: 'Structural data from the competition notice and reference links collected for preparation.',
  },
  total_posts: { es: 'Plazas totales', en: 'Total posts' },
  fields_label: { es: 'Campos', en: 'Fields' },
  application_window: { es: 'Ventana de solicitud', en: 'Application window' },
  language_regime: { es: 'Régimen lingüístico', en: 'Language regime' },
  resources_verified_note: {
    es: 'Verificado contra el texto oficial de {notice}. Ante cualquier duda, el texto oficial prevalece — ver detalle y fuentes en',
    en: 'Verified against the official text of {notice}. In case of doubt, the official text prevails — see detail and sources in',
  },

  // Verificación de la web (/verificacion)
  nav_selfcheck: { es: 'Verificación', en: 'Self-check' },
  selfcheck_eyebrow: { es: 'Diagnóstico', en: 'Diagnostics' },
  selfcheck_title: { es: 'Verificación de la plataforma', en: 'Platform self-check' },
  selfcheck_description: {
    es: 'Comprueba, desde este mismo navegador, que el contenido publicado está completo y que todo se descarga bien. Se ejecuta sola al abrir la página.',
    en: 'Checks, from this very browser, that the published content is complete and that everything downloads correctly. It runs on its own when the page opens.',
  },
  selfcheck_running: { es: 'Comprobando…', en: 'Checking…' },
  selfcheck_all_good: {
    es: 'Todo correcto — {checks} comprobaciones superadas',
    en: 'All good — {checks} checks passed',
  },
  selfcheck_failed: {
    es: '{issues} incidencia(s) en {checks} comprobación(es)',
    en: '{issues} issue(s) across {checks} check(s)',
  },
  selfcheck_elapsed: {
    es: 'Completado en {seconds} s · {bytes} descargados',
    en: 'Completed in {seconds} s · {bytes} downloaded',
  },
  selfcheck_rerun: { es: 'Repetir', en: 'Run again' },
  selfcheck_footnote: {
    es: 'Esta página comprueba la web tal como está publicada, en este dispositivo y bajo la ruta base real. Cada pasada vuelve a descargar las 240 imágenes del banco real —unos 6 MB, saltándose la caché a propósito— porque una comprobación servida de caché no comprueba nada; por eso tarda unos segundos y por eso se muestran los bytes transferidos. No sustituye a la verificación del repositorio (tipos, tests y construcción), que se lanza con «node scripts/verify.mjs» o «verificar.cmd» y está descrita en platform/TESTPLAN.md.',
    en: 'This page checks the site as published, on this device and under the real base path. Every run downloads the 240 real-bank images again — about 6 MB, deliberately bypassing the cache — because a check served from cache checks nothing; that is why it takes a few seconds and why the transferred bytes are shown. It does not replace the repository verification (types, tests and build), run with “node scripts/verify.mjs” or “verificar.cmd” and described in platform/TESTPLAN.md.',
  },

  // Curso de fundamentos (/formacion)
  nav_course: { es: 'Formación', en: 'Course' },
  course_eyebrow: { es: 'Estudio', en: 'Study' },
  course_title: { es: 'Fundamentos de ciberseguridad', en: 'Cybersecurity foundations' },
  course_description: {
    es: '{modules} módulos y {questions} preguntas que construyen la materia desde los cimientos, por debajo del test de ámbito de {field}.',
    en: '{modules} modules and {questions} questions building the subject from the ground up, underneath the {field} field test.',
  },
  course_module_eyebrow: { es: 'Módulo {n} de {total}', en: 'Module {n} of {total}' },
  course_module_meta: { es: '{questions} preguntas', en: '{questions} questions' },
  course_all_modules: { es: 'Todos los módulos', en: 'All modules' },
  course_empty_title: { es: 'El curso todavía no está disponible', en: 'The course is not available yet' },
  course_other_field: {
    es: 'La formación cubre por ahora el ámbito de ciberseguridad. El tuyo, elegido en Ajustes, todavía no tiene curso.',
    en: 'The course covers the cybersecurity field for now. Yours, chosen in Settings, does not have one yet.',
  },
  course_empty_description: {
    es: 'Aquí aparecerán los módulos de estudio con su teoría y sus preguntas.',
    en: 'The study modules, with their theory and questions, will appear here.',
  },

  // Calendario de estudio (/calendario)
  nav_calendar: { es: 'Calendario', en: 'Calendar' },
  calendar_eyebrow: { es: 'Constancia', en: 'Consistency' },
  calendar_title: { es: 'Calendario de estudio', en: 'Study calendar' },
  calendar_description: {
    es: 'Cuánto has dedicado cada día y qué hiciste. Pulsa un día para ver su detalle; cada semana se da por cumplida al alcanzar el objetivo de horas.',
    en: 'How long you put in each day and what you did. Click a day for its detail; a week counts as met once it reaches the hours goal.',
  },
  calendar_previous_month: { es: 'Mes anterior', en: 'Previous month' },
  calendar_next_month: { es: 'Mes siguiente', en: 'Next month' },
  calendar_week_complete: { es: 'Semana cumplida', en: 'Week complete' },
  calendar_week_remaining: {
    es: 'Te faltan {time} para cumplir esta semana',
    en: '{time} left to complete this week',
  },
  calendar_week_progress: {
    es: '{done} de {goal} · {percent} %',
    en: '{done} of {goal} · {percent}%',
  },
  calendar_streak: { es: '{n} semanas seguidas', en: '{n} weeks in a row' },
  calendar_legend: {
    es: 'La intensidad de cada día es su tiempo frente a la parte proporcional del objetivo semanal. El punto marca los días con test o redacción.',
    en: 'A day’s shading is its time against the weekly goal’s daily share. The dot marks days with a test or an essay.',
  },
  calendar_pick_a_day: { es: 'Elige un día del calendario.', en: 'Pick a day from the calendar.' },
  calendar_time_total: { es: 'Tiempo del día', en: 'Time that day' },
  calendar_time_usage: { es: 'Uso de la plataforma', en: 'Platform usage' },
  calendar_time_tests: { es: 'Tests y redacciones', en: 'Tests and essays' },
  calendar_activity_heading: { es: 'Qué se hizo', en: 'What was done' },
  calendar_only_usage: {
    es: 'Estudio sin test ni redacción: teoría o banco de práctica.',
    en: 'Study with no test or essay: theory or practice bank.',
  },
  calendar_nothing_that_day: { es: 'Ese día no hubo actividad.', en: 'No activity that day.' },

  // Configuración (/ajustes)
  nav_settings: { es: 'Ajustes', en: 'Settings' },
  settings_eyebrow: { es: 'Panel de control', en: 'Control panel' },
  settings_title: { es: 'Ajustes del candidato', en: 'Candidate settings' },
  settings_description: {
    es: 'Tus datos, el ámbito por el que te presentas y el ritmo de estudio que quieres sostener.',
    en: 'Your details, the field you are applying for, and the study pace you want to keep.',
  },
  settings_candidate: { es: 'Datos del candidato', en: 'Candidate details' },
  settings_name: { es: 'Nombre', en: 'Name' },
  settings_name_placeholder: { es: 'Cómo quieres que te llame', en: 'What to call you' },
  settings_email: { es: 'Correo electrónico', en: 'Email' },
  settings_exam_date: { es: 'Fecha prevista de examen', en: 'Expected exam date' },
  settings_exam_date_hint: {
    es: 'Solo para tu referencia; no la publica EPSO todavía.',
    en: 'For your reference only; EPSO has not published it yet.',
  },
  settings_local_note: {
    es: 'Estos datos se guardan únicamente en este navegador. No se envían a ningún sitio ni salen de tu equipo.',
    en: 'These details are stored in this browser only. Nothing is sent anywhere or leaves your machine.',
  },
  settings_fields: { es: 'Ámbito por convocatoria', en: 'Field per competition' },
  settings_fields_description: {
    es: 'El ámbito por el que te presentas en cada una. Se destaca en las listas y decide qué banco se abre por defecto.',
    en: 'The field you are applying for in each one. It is highlighted in the lists and decides which bank opens by default.',
  },
  settings_active_competition: { es: 'Convocatoria activa ahora mismo', en: 'Currently active competition' },
  settings_goal: { es: 'Objetivo semanal', en: 'Weekly goal' },
  settings_goal_description: {
    es: 'Horas de estudio que hay que alcanzar para dar una semana por cumplida en el calendario.',
    en: 'Study hours needed for a week to count as met in the calendar.',
  },
  settings_goal_hours: { es: 'Horas por semana', en: 'Hours per week' },
  settings_hours_per_week: { es: 'h / semana', en: 'h / week' },
  settings_goal_daily: {
    es: 'Equivale a unos {daily} al día si repartes la semana en siete.',
    en: 'That is about {daily} a day if you spread the week over seven.',
  },
  settings_tracking: { es: 'Registro de uso', en: 'Usage tracking' },
  settings_tracking_description: {
    es: 'Sin esto solo contaría el tiempo de los tests cronometrados, y leer teoría o responder el banco de práctica no sumaría nada.',
    en: 'Without this only timed-test time would count, and reading theory or working the practice bank would add nothing.',
  },
  settings_track_usage: {
    es: 'Contar el tiempo que paso en la plataforma',
    en: 'Count the time I spend on the platform',
  },
  settings_idle: { es: 'Minutos de inactividad', en: 'Idle minutes' },
  settings_idle_hint: {
    es: 'Pasado ese tiempo sin tocar nada se deja de contar, para que una pestaña olvidada no cuente como estudio.',
    en: 'After that long without touching anything the counter stops, so a forgotten tab does not count as study.',
  },
  settings_data: { es: 'Tus datos', en: 'Your data' },
  settings_data_description: {
    es: 'Todo vive en este navegador. Expórtalo si vas a cambiar de equipo o a limpiar los datos de navegación.',
    en: 'Everything lives in this browser. Export it if you are changing machines or clearing browsing data.',
  },
  settings_export: { es: 'Exportar todo (JSON)', en: 'Export everything (JSON)' },
  settings_reset: { es: 'Restaurar ajustes', en: 'Reset settings' },
  settings_reset_confirm: {
    es: '¿Restaurar los ajustes a sus valores por defecto? Tus intentos y tu registro de uso no se tocan.',
    en: 'Reset settings to their defaults? Your attempts and usage log are left alone.',
  },
  settings_clear_log: { es: 'Borrar registro de uso', en: 'Clear usage log' },
  settings_clear_log_confirm: {
    es: '¿Borrar el registro de tiempo de uso? El calendario perderá las horas de estudio, aunque los tests y redacciones seguirán ahí. No se puede deshacer.',
    en: 'Clear the usage-time log? The calendar will lose the study hours, though tests and essays stay. This cannot be undone.',
  },
  settings_log_size: { es: '{days} días con tiempo registrado.', en: '{days} days with logged time.' },
  settings_save: { es: 'Guardar cambios', en: 'Save changes' },
  settings_discard: { es: 'Descartar', en: 'Discard' },
  settings_unsaved: { es: 'Hay cambios sin guardar.', en: 'You have unsaved changes.' },
  settings_saved: { es: 'Cambios guardados.', en: 'Changes saved.' },
  settings_no_changes: { es: 'No hay cambios pendientes.', en: 'No pending changes.' },

  // Selector de idioma
  language_selector_label: { es: 'Idioma', en: 'Language' },
  test_language_label: {
    es: 'Idioma del enunciado y las opciones',
    en: 'Language of the question and options',
  },
} satisfies Record<string, Localized>

export type DictKey = keyof typeof DICT
