// Cuánto hace desde la última sincronización.
//
// Es un cálculo pequeño con dos esquinas que muerden de verdad: los umbrales
// (59 segundos no son un minuto) y las fechas en el futuro, que llegan solas en
// cuanto dos dispositivos con relojes distintos escriben la misma fila.
import { describe, it, expect } from 'vitest'
import { freshnessOf } from './time'

const AHORA = new Date('2026-09-18T12:00:00.000Z')
const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString()

const SEGUNDO = 1000
const MINUTO = 60 * SEGUNDO
const HORA = 60 * MINUTO
const DIA = 24 * HORA

describe('sin nada que contar', () => {
  it('sin haber sincronizado nunca', () => {
    expect(freshnessOf(null, AHORA)).toEqual({ unit: 'never' })
  })

  it('una marca ilegible se trata como no haber guardado nunca', () => {
    // No promete nada que no se pueda cumplir, que es lo que haría cualquier
    // otra respuesta.
    expect(freshnessOf('no soy una fecha', AHORA)).toEqual({ unit: 'never' })
  })
})

describe('los umbrales', () => {
  it('recién guardado', () => {
    expect(freshnessOf(hace(0), AHORA)).toEqual({ unit: 'now' })
    expect(freshnessOf(hace(59 * SEGUNDO), AHORA)).toEqual({ unit: 'now' })
  })

  it('el minuto empieza en el minuto, no antes', () => {
    expect(freshnessOf(hace(MINUTO), AHORA)).toEqual({ unit: 'minutes', value: 1 })
    expect(freshnessOf(hace(59 * MINUTO), AHORA)).toEqual({ unit: 'minutes', value: 59 })
  })

  it('la hora empieza en la hora', () => {
    expect(freshnessOf(hace(HORA), AHORA)).toEqual({ unit: 'hours', value: 1 })
    expect(freshnessOf(hace(23 * HORA), AHORA)).toEqual({ unit: 'hours', value: 23 })
  })

  it('el día empieza en el día', () => {
    expect(freshnessOf(hace(DIA), AHORA)).toEqual({ unit: 'days', value: 1 })
    expect(freshnessOf(hace(9 * DIA), AHORA)).toEqual({ unit: 'days', value: 9 })
  })

  it('redondea hacia abajo: hora y media es una hora, no dos', () => {
    // Decir «hace 2 h» cuando hace 90 minutos exagera lo viejo que está el
    // guardado, y eso empuja a sincronizar a mano sin necesidad.
    expect(freshnessOf(hace(90 * MINUTO), AHORA)).toEqual({ unit: 'hours', value: 1 })
  })
})

describe('relojes que no coinciden', () => {
  it('una marca en el futuro se lee como recién guardado', () => {
    // La marca la pone el servidor; si este navegador va atrasado, restar da
    // negativo. Sin esto saldría «hace -3 min», que parece una avería de la
    // web cuando lo único que pasa es que el reloj local va mal.
    const futuro = new Date(AHORA.getTime() + 3 * MINUTO).toISOString()
    expect(freshnessOf(futuro, AHORA)).toEqual({ unit: 'now' })
  })

  it('un futuro lejano tampoco se convierte en días negativos', () => {
    const muyFuturo = new Date(AHORA.getTime() + 5 * DIA).toISOString()
    expect(freshnessOf(muyFuturo, AHORA)).toEqual({ unit: 'now' })
  })
})
