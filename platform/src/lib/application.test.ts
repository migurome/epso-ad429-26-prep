// El contador de caracteres de la redacción libre.
//
// El formulario de EPSO no avisa al pasarse del límite: corta. Así que el
// aviso tiene que estar de este lado, y tiene que contar EXACTAMENTE lo que
// cuenta el formulario —espacios y saltos de línea incluidos—, porque un
// contador optimista es peor que ninguno: da permiso para escribir de más.
import { describe, it, expect } from 'vitest'
import {
  CHAR_LIMIT,
  NEAR_LIMIT,
  SECTIONS,
  readyCount,
  remainingOf,
  stateOf,
} from './application'
import { EMPTY_TEXTS } from './applicationStore'

const de = (n: number) => 'x'.repeat(n)

describe('cuenta de caracteres', () => {
  it('cuenta los espacios y los saltos de línea, como el formulario', () => {
    expect(remainingOf('hola mundo')).toBe(CHAR_LIMIT - 10)
    expect(remainingOf('a\nb')).toBe(CHAR_LIMIT - 3)
  })

  it('pasarse da un resto negativo, no cero', () => {
    // Saber POR CUÁNTO te pasas es lo que dice cuánto hay que recortar.
    expect(remainingOf(de(CHAR_LIMIT + 67))).toBe(-67)
  })
})

describe('estado de un apartado', () => {
  it('en blanco es en blanco, aunque tenga espacios', () => {
    expect(stateOf('')).toBe('empty')
    expect(stateOf('   \n  ')).toBe('empty')
  })

  it('justo en el límite todavía vale', () => {
    // 2 000 caracteres CABEN. Avisar aquí sería mentir y obligar a recortar
    // texto que el formulario acepta.
    expect(stateOf(de(CHAR_LIMIT))).toBe('near')
    expect(stateOf(de(CHAR_LIMIT + 1))).toBe('over')
  })

  it('avisa antes de llegar, no al chocar', () => {
    expect(stateOf(de(NEAR_LIMIT - 1))).toBe('ok')
    expect(stateOf(de(NEAR_LIMIT))).toBe('near')
  })
})

describe('cuántos apartados están listos', () => {
  it('ninguno cuando no hay nada escrito', () => {
    expect(readyCount(EMPTY_TEXTS)).toBe(0)
  })

  it('un apartado pasado de largo NO cuenta como listo', () => {
    // Es el caso que importa: parece escrito, y el formulario lo va a cortar.
    expect(readyCount({ ...EMPTY_TEXTS, experience: de(CHAR_LIMIT + 1) })).toBe(0)
  })

  it('los cuatro escritos y dentro de límite son los cuatro', () => {
    const full = Object.fromEntries(SECTIONS.map((s) => [s.id, 'algo escrito']))
    expect(readyCount(full as typeof EMPTY_TEXTS)).toBe(SECTIONS.length)
  })
})
