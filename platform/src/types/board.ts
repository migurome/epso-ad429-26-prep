// El tablón: convocatorias que el bot ha visto en los listados de EPSO.
//
// Los textos vienen en un solo idioma, a propósito y sin envoltorio
// `{es, en}`: son lo que EPSO publica, copiado tal cual. Traducir «Artificial
// intelligence (AI)» por nuestra cuenta sería inventar el nombre de una
// oposición, y el candidato tiene que poder buscar en la web de EPSO
// exactamente lo que lee aquí.

/**
 * En qué punto está la convocatoria, según el listado de EPSO donde aparece:
 * abierta a candidaturas, en curso (plazo cerrado, proceso vivo) o terminada.
 */
export type BoardStage = 'open' | 'in-progress' | 'closed'

export interface BoardNotice {
  /** Estable: sale del número oficial (`epso-ad-430-26-2`). Lo asigna el bot. */
  id: string
  /** El número con el que EPSO la nombra: `EPSO/AD/430/26 - 2`. */
  reference: string | null
  title: string
  /** Año de la convocatoria, deducido del número oficial. */
  year: number | null
  stage: BoardStage
  url: string
  /**
   * La ficha de la convocatoria, que es donde está su calendario. La lista
   * de abiertas enlaza a la página de inscripción, útil para el candidato
   * pero sin calendario, así que el bot guarda las dos direcciones.
   */
  infoUrl?: string
  /** Sólo lo trae el listado de abiertas. */
  grade?: string
  locations?: string[]
  /** Cierre en máquina, `2026-10-13T10:00:00Z`; null si EPSO no lo dio así. */
  deadline?: string | null
  /** El cierre tal como lo escribe EPSO, en su horario: «13/10/2026 - 12:00». */
  deadlineText?: string
  /**
   * Día en que se abrió el plazo, leído del calendario de la ficha de EPSO
   * («Application period: 08/09/2026 - …»). null si esa ficha no lo publica;
   * ausente mientras el bot no haya consultado la ficha.
   */
  openedOn?: string | null
  /** Día (AAAA-MM-DD) en que el bot la vio por primera vez. */
  firstSeen: string
  /** Día en que pasó de una fase a otra (de abierta a en curso, por ejemplo). */
  stageChangedOn?: string
  /** Día en que cambió algo suyo: un plazo prorrogado, una sede más. */
  updatedOn?: string
}

export interface BoardFile {
  format: number
  /** Los listados vigilados, uno por fase. */
  sources: { stage: BoardStage; url: string }[]
  /** Año que se publica entero, además de todo lo que esté abierto. */
  year: number | null
  /**
   * Día en que el bot empezó a vigilar. Es lo que permite no mentir: una
   * convocatoria vista el primer día puede llevar meses publicada, así que
   * sólo es «nueva» la que aparece después de esta fecha.
   */
  since: string | null
  notices: BoardNotice[]
}
