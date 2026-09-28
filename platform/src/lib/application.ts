import type { Localized } from './localeStore'

// La redacción libre de la inscripción: los cuatro textos que EPSO pide al
// presentar la candidatura y que lee el tribunal.
//
// No es material de estudio, y por eso no vive en Docs/ con el resto del
// contenido: es texto del candidato, y este repositorio es público. Se guarda
// en el navegador y viaja con el resto del progreso (ver backup.ts), nunca en
// el paquete.
//
// El límite de 2 000 caracteres lo pone el formulario de EPSO, y lo cuenta
// TODO —espacios, saltos de línea y caracteres especiales—, así que aquí se
// cuenta igual: `text.length`, sin recortar ni normalizar nada. Un contador
// optimista sería peor que ninguno; el formulario truncaría al pegar.
export const CHAR_LIMIT = 2000

export type SectionId = 'experience' | 'interest' | 'contribution' | 'strengths'

export interface SectionInfo {
  id: SectionId
  label: Localized
  /** Lo que EPSO pide en ese apartado, para no tener que abrir el formulario
   * a ver de qué iba. */
  prompt: Localized
}

export const SECTIONS: SectionInfo[] = [
  {
    id: 'experience',
    label: { es: 'Experiencia y antecedentes', en: 'Experience and background' },
    prompt: {
      es: 'Qué has hecho y con qué has trabajado: responsabilidades, tecnologías y el tipo de sistemas en los que te has movido.',
      en: 'What you have done and worked with: responsibilities, technologies and the kind of systems you have worked on.',
    },
  },
  {
    id: 'interest',
    label: { es: 'Interés por presentar la candidatura', en: 'Interest in applying' },
    prompt: {
      es: 'Por qué esta oposición y no otra cosa: qué te mueve a dar este paso ahora.',
      en: 'Why this competition and not something else: what moves you to take this step now.',
    },
  },
  {
    id: 'contribution',
    label: { es: 'Contribución a la UE', en: 'Contribution to the EU' },
    prompt: {
      es: 'Qué aportarías a las instituciones: en qué puestos encajas y con qué competencias concretas.',
      en: 'What you would bring to the institutions: which roles you fit and with which concrete skills.',
    },
  },
  {
    id: 'strengths',
    label: { es: 'Puntos fuertes', en: 'Strong points' },
    prompt: {
      es: 'Situaciones reales contadas entero: el problema, lo que hiciste tú y en qué acabó.',
      en: 'Real situations told in full: the problem, what you did, and how it ended.',
    },
  },
]

/** Lo que queda por gastar en un apartado. Negativo cuando se ha pasado, que
 * es el caso que importa: el formulario de EPSO no avisa, corta. */
export function remainingOf(text: string): number {
  return CHAR_LIMIT - text.length
}

/** Cómo va un apartado. Tres estados y no dos: «cerca» existe porque pasar de
 * 2 000 al pegar en el formulario es un recorte silencioso, y conviene verlo
 * venir antes de llegar. */
export type SectionState = 'empty' | 'ok' | 'near' | 'over'

/** A partir de aquí se avisa. El 5 % del límite: cien caracteres, poco más de
 * una frase, que es lo que se tarda en pasarse sin darse cuenta. */
export const NEAR_LIMIT = CHAR_LIMIT - 100

export function stateOf(text: string): SectionState {
  if (text.trim() === '') return 'empty'
  if (text.length > CHAR_LIMIT) return 'over'
  if (text.length >= NEAR_LIMIT) return 'near'
  return 'ok'
}

/** Cuántos apartados están escritos y dentro de límite. Es lo que dice si la
 * candidatura está lista para copiar al formulario. */
export function readyCount(texts: Record<SectionId, string>): number {
  return SECTIONS.filter((s) => stateOf(texts[s.id]) === 'ok' || stateOf(texts[s.id]) === 'near')
    .length
}
