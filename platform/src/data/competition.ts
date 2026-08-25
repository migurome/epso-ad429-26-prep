// Datos estructurales de la convocatoria EPSO/AD/429/26 (4) - Administradores AD7.
// Verificados contra el texto oficial de la convocatoria (DOUE C/2026/02425).
// Ver Docs/0.- Selection procedure overview.md para el detalle y las fuentes.

import type { Field } from '../types/content'
import type { Localized } from '../lib/localeStore'

export const COMPETITION = {
  id: 'EPSO/AD/429/26 (4)',
  grade: 'AD7',
  title: {
    es: 'Administradores AD7 — Perfiles ICT',
    en: 'Administrators AD7 — ICT Profiles',
  } satisfies Localized,
  postsTotal: 782,
  applicationWindow: { open: '2026-05-06', close: '2026-06-10' },
  supportingDocsDeadline: '2026-10-01',
  languageRule: {
    es: 'C1 en Lengua 1 + B2 en Lengua 2 (2 de las 24 lenguas oficiales). Razonamiento se hace en Lengua 1; test de ámbito y EUFTE en Lengua 2.',
    en: 'C1 in Language 1 + B2 in Language 2 (2 of the 24 official languages). Reasoning is done in Language 1; the field test and EUFTE in Language 2.',
  } satisfies Localized,
}

// Campo por el que se presenta el usuario de esta plataforma (ver Referencias.txt:
// enlaces a documentación de Python/pandas/numpy/scikit-learn/scipy y al recurso
// de Data Science field-related MCQ). Se usa para priorizar contenido, sin
// ocultar los demás campos.
export const USER_FIELD: Field = 'data-science'

export interface FieldInfo {
  id: Field
  label: Localized
  posts: number
}

export const FIELDS: FieldInfo[] = [
  { id: 'ict-infrastructure', label: { es: 'Infraestructura TIC', en: 'ICT Infrastructure' }, posts: 204 },
  {
    id: 'ict-project-management',
    label: { es: 'Gestión de proyectos TIC', en: 'ICT Project Management' },
    posts: 228,
  },
  { id: 'clouds-networks', label: { es: 'Nubes y redes', en: 'Clouds & Networks' }, posts: 166 },
  { id: 'data-science', label: { es: 'Ciencia de datos', en: 'Data Science' }, posts: 184 },
]

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
