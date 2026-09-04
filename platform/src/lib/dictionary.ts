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
  sidebar_footer: { es: '{posts} plazas · 4 campos ICT', en: '{posts} posts · 4 ICT fields' },
  open_menu: { es: 'Abrir menú', en: 'Open menu' },
  close_menu: { es: 'Cerrar menú', en: 'Close menu' },
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

  // PracticeBank
  filter_real_bank: { es: 'Banco real', en: 'Real bank' },
  filter_ai_bank: { es: 'Bonus (generado)', en: 'Bonus (generated)' },
  filter_all: { es: 'Todo', en: 'All' },
  n_questions: { es: '{n} preguntas', en: '{n} questions' },

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
    es: 'Verificado contra el texto de la convocatoria oficial (DOUE C/2026/02425). Ante cualquier duda, el texto oficial prevalece — ver detalle y fuentes en',
    en: 'Verified against the official competition notice text (OJ C/2026/02425). In case of doubt, the official text prevails — see detail and sources in',
  },

  // Selector de idioma
  language_selector_label: { es: 'Idioma', en: 'Language' },
  test_language_label: {
    es: 'Idioma del enunciado y las opciones',
    en: 'Language of the question and options',
  },
} satisfies Record<string, Localized>

export type DictKey = keyof typeof DICT
