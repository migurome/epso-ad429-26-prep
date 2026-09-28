// Las reglas de la lista de práctica.
//
// La que más importa: responder no puede hacer que la pregunta desaparezca de
// delante. La explicación aparece en ese instante, y quien más la necesita es
// el que acaba de fallar; si la fila se esfuma al marcar la opción, la lista le
// cierra la puerta justo ahí.
import { describe, it, expect } from 'vitest'
import {
  answeredOn,
  countsFor,
  firstLine,
  formatPace,
  paceOf,
  showsUnder,
  DEFAULT_PACE_SECONDS,
  paceFor,
} from './practiceView'
import type { PracticeAnswer } from './practiceStore'

const answer = (over: Partial<PracticeAnswer> = {}): PracticeAnswer => ({
  optionId: 'a',
  at: '2026-09-25T09:00:00.000Z',
  ...over,
})

describe('qué se enseña bajo cada filtro', () => {
  it('«todas» no esconde nada', () => {
    expect(showsUnder('all', undefined)).toBe(true)
    expect(showsUnder('all', answer())).toBe(true)
  })

  it('«respondidas» son las que tienen respuesta', () => {
    expect(showsUnder('answered', undefined)).toBe(false)
    expect(showsUnder('answered', answer())).toBe(true)
  })

  it('lo que se está mirando no se esconde, lo diga el filtro o no', () => {
    // Contestar deja de cumplir «pendiente» en el mismo instante en que
    // aparece la explicación. Sin esto la fila se desvanece debajo de los ojos
    // de quien acaba de fallar; con esto se va al abrir la siguiente.
    expect(showsUnder('pending', answer(), true)).toBe(true)
    expect(showsUnder('answered', undefined, true)).toBe(true)
  })

  it('pendiente es, sin más, no haberla contestado', () => {
    // Hubo un estado intermedio —contestada pero sin «repasar»— que duró un
    // día: en la mano era un clic por pregunta para decir lo que ya decía
    // haberla contestado.
    expect(showsUnder('pending', undefined)).toBe(true)
    expect(showsUnder('pending', answer())).toBe(false)
  })
})

describe('las cuentas de la cabecera', () => {
  it('lo contestado y lo que falta, sin solaparse', () => {
    const counts = countsFor(['q1', 'q2', 'q3'], { q1: answer(), q2: answer() })
    expect(counts).toEqual({ answered: 2, pending: 1, total: 3 })
  })

  it('un banco recién abierto está entero pendiente', () => {
    expect(countsFor(['q1', 'q2'], {})).toEqual({ answered: 0, pending: 2, total: 2 })
  })

  it('no cuenta respuestas de otros bancos', () => {
    expect(countsFor(['q1'], { otra: answer() })).toEqual({ answered: 0, pending: 1, total: 1 })
  })
})

describe('el ritmo sale de cada prueba', () => {
  // Cien segundos por pregunta valían para el verbal y mentían en todo lo
  // demás. Entrenar el numérico con el reloj del verbal es entrenar contra un
  // examen que no existe.
  it('verbal: 20 preguntas en 35 minutos', () => {
    expect(paceFor({ questions: 20, minutes: 35 })).toBe(105)
  })

  it('numérico: 10 en 20 minutos, el doble de tiempo por pregunta', () => {
    expect(paceFor({ questions: 10, minutes: 20 })).toBe(120)
  })

  it('abstracto: 10 en 10 minutos, la mitad', () => {
    expect(paceFor({ questions: 10, minutes: 10 })).toBe(60)
  })

  it('ámbito: 30 en 40 minutos', () => {
    expect(paceFor({ questions: 30, minutes: 40 })).toBe(80)
  })

  it('una prueba sin preguntas no divide entre cero', () => {
    expect(paceFor({ questions: 0, minutes: 40 })).toBe(DEFAULT_PACE_SECONDS)
  })
})

describe('el contador', () => {
  it('arranca en el ritmo entero de su prueba', () => {
    expect(formatPace(0)).toBe('1:40')
    expect(DEFAULT_PACE_SECONDS).toBe(100)
    expect(formatPace(0, 120)).toBe('2:00')
    expect(formatPace(0, 60)).toBe('1:00')
  })

  it('descuenta mientras queda tiempo', () => {
    expect(paceOf(28)).toEqual({ seconds: 72, over: false })
    expect(formatPace(28)).toBe('1:12')
  })

  it('no se detiene en cero: enseña cuánto se pasó', () => {
    // Es la diferencia con el simulacro. El ritmo es una referencia, y lo que
    // dice más de una pregunta difícil es justo el tiempo que costó de más.
    expect(paceOf(108)).toEqual({ seconds: 8, over: true })
    expect(formatPace(108)).toBe('−0:08')
    expect(formatPace(230)).toBe('−2:10')
  })

  it('un transcurrido absurdo no rompe el reloj', () => {
    expect(formatPace(-5)).toBe('1:40')
  })
})

describe('cuándo se contestó', () => {
  it('devuelve el momento cuando se sabe', () => {
    expect(answeredOn(answer())?.toISOString()).toBe('2026-09-25T09:00:00.000Z')
  })

  it('sin fecha no se inventa ninguna', () => {
    // Lo respondido antes de que esto se guardara llega así.
    expect(answeredOn(answer({ at: '' }))).toBeNull()
    expect(answeredOn(undefined)).toBeNull()
  })

  it('una fecha ilegible tampoco se pinta', () => {
    expect(answeredOn(answer({ at: 'el martes' }))).toBeNull()
  })
})

describe('la primera línea de una pregunta ya contestada', () => {
  it('se queda con la primera línea con texto', () => {
    expect(firstLine('\n\nPrimera línea\n\nSegunda línea')).toBe('Primera línea')
  })

  it('quita los marcadores de Markdown, que en una línea sólo estorban', () => {
    expect(firstLine('## Un título')).toBe('Un título')
    expect(firstLine('- Una viñeta')).toBe('Una viñeta')
    expect(firstLine('> Una cita')).toBe('Una cita')
    expect(firstLine('Con **negrita** y `código`')).toBe('Con negrita y código')
  })

  it('aplana los espacios de sobra', () => {
    expect(firstLine('  Dos    espacios  ')).toBe('Dos espacios')
  })

  it('un párrafo largo sale entero: el recorte lo hace el CSS, que sabe el ancho', () => {
    const largo = 'El texto afirma que la Comisión ' + 'adoptó la propuesta '.repeat(8)
    expect(firstLine(largo)).toBe(largo.trim())
  })

  it('un enunciado vacío no revienta la fila', () => {
    expect(firstLine('')).toBe('')
    expect(firstLine('\n\n---\n')).toBe('')
  })
})
