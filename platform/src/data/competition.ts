// Datos estructurales de las DOS convocatorias que cubre la plataforma.
// Verificados contra el texto oficial de cada convocatoria en el DOUE.
// Ver Docs/0.- Selection procedure overview.md para el detalle y las fuentes.
//
// Lo que cambia entre una y otra es el encabezado (grado, ámbitos, plazas,
// plazos) y poco más: el formato de las pruebas es IDÉNTICO en ambas — mismas
// preguntas, mismos minutos, mismas notas de corte —, así que las secciones de
// razonamiento y EUFTE sirven tal cual para las dos y viven fuera de este
// mapa. Ver REASONING_SKILLS, FIELD_MCQ_FORMAT y EUFTE_FORMAT más abajo.

import type { Field } from '../types/content'
import type { Localized } from '../lib/localeStore'

export type CompetitionId = 'ad7' | 'ad8'

export interface FieldInfo {
  id: Field
  label: Localized
  posts: number
  /** El ámbito está convocado pero su banco de preguntas todavía no está
   * escrito: la página muestra el alcance oficial y lo dice claramente, en vez
   * de aparentar un banco vacío. */
  bankPending?: boolean
}

export interface CompetitionInfo {
  key: CompetitionId
  /** Referencia oficial, tal como aparece en el DOUE. */
  id: string
  grade: string
  title: Localized
  postsTotal: number
  applicationWindow: { open: string; close: string }
  supportingDocsDeadline: string
  languageRule: Localized
  noticeUrl: string
  /** Página de EPSO para presentar la candidatura, mientras el plazo esté
   * abierto. La AD7 ya cerró, así que no tiene. */
  applyUrl?: string
  fields: FieldInfo[]
  /** Ámbito por el que se presenta el usuario de esta plataforma. Se usa para
   * priorizar contenido, sin ocultar los demás. */
  userField: Field
}

export const COMPETITIONS: Record<CompetitionId, CompetitionInfo> = {
  ad7: {
    key: 'ad7',
    id: 'EPSO/AD/429/26 (4)',
    grade: 'AD 7',
    title: {
      es: 'Administradores AD7 — Perfiles ICT',
      en: 'Administrators AD7 — ICT Profiles',
    },
    postsTotal: 782,
    applicationWindow: { open: '2026-05-06', close: '2026-06-10' },
    supportingDocsDeadline: '2026-10-01',
    languageRule: {
      es: 'C1 en Lengua 1 + B2 en Lengua 2 (2 de las 24 lenguas oficiales). Razonamiento se hace en Lengua 1; test de ámbito y EUFTE en Lengua 2.',
      en: 'C1 in Language 1 + B2 in Language 2 (2 of the 24 official languages). Reasoning is done in Language 1; the field test and EUFTE in Language 2.',
    },
    noticeUrl: 'https://eur-lex.europa.eu/eli/C/2026/2425/oj',
    fields: [
      { id: 'ict-infrastructure', label: { es: 'Infraestructura TIC', en: 'ICT Infrastructure' }, posts: 204 },
      {
        id: 'ict-project-management',
        label: { es: 'Gestión de proyectos TIC', en: 'ICT Project Management' },
        posts: 228,
      },
      { id: 'clouds-networks', label: { es: 'Nubes y redes', en: 'Clouds & Networks' }, posts: 166 },
      { id: 'data-science', label: { es: 'Ciencia de datos', en: 'Data Science' }, posts: 184 },
    ],
    userField: 'data-science',
  },
  ad8: {
    key: 'ad8',
    id: 'EPSO/AD/430/26',
    grade: 'AD 8',
    title: {
      es: 'Administradores AD8 — IA y ciberseguridad',
      en: 'Administrators AD8 — AI and cybersecurity',
    },
    postsTotal: 494,
    applicationWindow: { open: '2026-09-08', close: '2026-10-13' },
    supportingDocsDeadline: '2027-01-14',
    languageRule: {
      // A diferencia de la AD7, esta convocatoria NO restringe la Lengua 2 a
      // inglés/francés/alemán: ambas lenguas se eligen libremente entre las 24
      // oficiales.
      es: 'C1 en Lengua 1 + B2 en Lengua 2, ambas libremente elegidas entre las 24 lenguas oficiales. Razonamiento se hace en Lengua 1; test de ámbito y EUFTE en Lengua 2.',
      en: 'C1 in Language 1 + B2 in Language 2, both freely chosen from the 24 official languages. Reasoning is done in Language 1; the field test and EUFTE in Language 2.',
    },
    noticeUrl: 'https://eur-lex.europa.eu/eli/C/2026/4668/oj',
    applyUrl: 'https://eu-careers.europa.eu/es/apply-ict-competition-ad8',
    fields: [
      {
        id: 'artificial-intelligence',
        label: { es: 'Inteligencia artificial (IA)', en: 'Artificial intelligence (AI)' },
        posts: 240,
        bankPending: true,
      },
      { id: 'cybersecurity', label: { es: 'Ciberseguridad', en: 'Cybersecurity' }, posts: 254 },
    ],
    userField: 'cybersecurity',
  },
}

export const COMPETITION_ORDER: CompetitionId[] = ['ad7', 'ad8']

/** Hora límite de todos los plazos de EPSO. Es la misma en las dos
 * convocatorias y no aparece en las fechas ISO, así que se muestra aparte. */
export const DEADLINE_TIME: Localized = {
  es: '12:00 del mediodía (hora de Bruselas)',
  en: '12:00 noon (Brussels time)',
}

export interface PhaseInfo {
  id: 'reasoning' | 'field-mcq' | 'eufte'
  order: number
  label: Localized
  shortLabel: Localized
  description: Localized
}

export const PHASES: PhaseInfo[] = [
  {
    id: 'reasoning',
    order: 1,
    label: {
      es: 'Pruebas de razonamiento (filtro de acceso)',
      en: 'Reasoning tests (entry filter)',
    },
    shortLabel: { es: 'Razonamiento', en: 'Reasoning' },
    description: {
      es: 'Razonamiento verbal, numérico y abstracto, en Lengua 1. Es la fase eliminatoria: hay que superarla antes de que se evalúe el conocimiento de campo.',
      en: 'Verbal, numerical and abstract reasoning, in Language 1. This is the eliminatory phase: you must pass it before your field knowledge is assessed.',
    },
  },
  {
    id: 'field-mcq',
    order: 2,
    label: {
      es: 'Test de opción múltiple de campo (clasificatoria)',
      en: 'Field-related multiple choice test (classifying)',
    },
    shortLabel: { es: 'Field-Related MCQ', en: 'Field-Related MCQ' },
    description: {
      es: 'Preguntas de opción múltiple sobre el campo de especialización elegido, en Lengua 2. Determina el orden en la lista de reserva.',
      en: 'Multiple-choice questions on your chosen specialisation field, in Language 2. Determines your position on the reserve list.',
    },
  },
  {
    id: 'eufte',
    order: 3,
    label: {
      es: 'EUFTE — Redacción sobre asuntos de la UE',
      en: 'EUFTE — Free-text essay on EU matters',
    },
    shortLabel: { es: 'EUFTE', en: 'EUFTE' },
    description: {
      es: 'Prueba escrita de comunicación a partir de documentación de la UE proporcionada, en Lengua 2. La fase que más se suele infravalorar en la preparación.',
      en: 'A written communication test based on provided EU documentation, in Language 2. The phase most often underrated in preparation.',
    },
  },
]

export interface TestFormat {
  questions: number
  minutes: number
  maxScore: number
  passMark: number | null
  passMarkNote?: Localized
}

// Formatos de prueba. Son los mismos en la AD7 y en la AD8 — comprobado
// tabla a tabla contra las dos convocatorias —, así que no se duplican por
// convocatoria: todo el material de razonamiento y de EUFTE vale para ambas.
export const REASONING_SKILLS: Array<{
  id: 'verbal' | 'numerical' | 'abstract'
  label: Localized
  format: TestFormat
}> = [
  {
    id: 'verbal',
    label: { es: 'Razonamiento verbal', en: 'Verbal reasoning' },
    format: { questions: 20, minutes: 35, maxScore: 20, passMark: 10 },
  },
  {
    id: 'numerical',
    label: { es: 'Razonamiento numérico', en: 'Numerical reasoning' },
    format: {
      questions: 10,
      minutes: 20,
      maxScore: 10,
      passMark: null,
      passMarkNote: {
        es: 'Se corrige junto con abstracto: 10/20 combinado',
        en: 'Marked together with abstract: 10/20 combined',
      },
    },
  },
  {
    id: 'abstract',
    label: { es: 'Razonamiento abstracto', en: 'Abstract reasoning' },
    format: {
      questions: 10,
      minutes: 10,
      maxScore: 10,
      passMark: null,
      passMarkNote: {
        es: 'Se corrige junto con numérico: 10/20 combinado',
        en: 'Marked together with numerical: 10/20 combined',
      },
    },
  },
]

export const FIELD_MCQ_FORMAT: TestFormat = {
  questions: 30,
  minutes: 40,
  maxScore: 30,
  passMark: 15,
  passMarkNote: {
    es: 'Además hay que estar entre los mejor clasificados del ámbito',
    en: 'You must also rank among the best-classified candidates in the field',
  },
}

export const EUFTE_FORMAT: TestFormat = {
  questions: 1,
  minutes: 40,
  maxScore: 10,
  passMark: 5,
}
