// Las reglas de la lista de práctica.
//
// La que más importa: responder no puede hacer que la pregunta desaparezca de
// delante. La explicación aparece en ese instante, y quien más la necesita es
// el que acaba de fallar; si la fila se esfuma al marcar la opción, la lista le
// cierra la puerta justo ahí.
import { describe, it, expect } from 'vitest'
import { answeredOn, countsFor, formatPace, paceOf, showsUnder, PACE_SECONDS } from './practiceView'
import type { PracticeAnswer } from './practiceStore'

const answer = (over: Partial<PracticeAnswer> = {}): PracticeAnswer => ({
  optionId: 'a',
  at: '2026-09-25T09:00:00.000Z',
  ...over,
})

describe('qué se enseña bajo cada filtro', () => {
  it('«todas» no esconde nada', () => {
    expect(showsUnder('all', undefined)).toBe(true)
    expect(showsUnder('all', answer({ done: true }))).toBe(true)
  })

  it('«respondidas» son las que tienen respuesta, repasada o no', () => {
    expect(showsUnder('answered', undefined)).toBe(false)
    expect(showsUnder('answered', answer())).toBe(true)
    expect(showsUnder('answered', answer({ done: true }))).toBe(true)
  })

  it('una respondida sigue pendiente hasta darla por repasada', () => {
    expect(showsUnder('pending', undefined)).toBe(true)
    expect(showsUnder('pending', answer())).toBe(true)
    expect(showsUnder('pending', answer({ done: true }))).toBe(false)
  })
})

describe('las cuentas de la cabecera', () => {
  it('separa respondidas de pendientes, y la recién contestada está en las dos', () => {
    const counts = countsFor(['q1', 'q2', 'q3'], {
      q1: answer({ done: true }),
      q2: answer(),
    })
    expect(counts).toEqual({ answered: 2, pending: 2, total: 3 })
  })

  it('un banco recién abierto está entero pendiente', () => {
    expect(countsFor(['q1', 'q2'], {})).toEqual({ answered: 0, pending: 2, total: 2 })
  })

  it('no cuenta respuestas de otros bancos', () => {
    expect(countsFor(['q1'], { otra: answer() })).toEqual({ answered: 0, pending: 1, total: 1 })
  })
})

describe('el contador', () => {
  it('arranca en el ritmo entero', () => {
    expect(formatPace(0)).toBe('1:40')
    expect(PACE_SECONDS).toBe(100)
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
