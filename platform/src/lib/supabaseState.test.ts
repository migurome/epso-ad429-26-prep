// La fila de Supabase vista como almacén remoto.
//
// Aquí no hay red ni cuenta: la tabla entra por una interfaz de dos métodos y
// se le pasa una de mentira. Lo que se prueba es la traducción, que es donde
// algo puede torcerse sin que se note: el estado viaja entre dispositivos como
// texto y se guarda como `jsonb`, así que hay una conversión en cada sentido.
// Si la de subida se olvidara, el estado se guardaría como una cadena JSON
// dentro de otra cadena JSON y al bajarlo no habría manera de leerlo.
import { describe, it, expect } from 'vitest'
import { remoteBackend, type StateRows } from './supabaseState'

const ME = '11111111-2222-3333-4444-555555555555'

/** Una tabla de mentira: guarda una fila y cuenta lo que se le pide. */
function fakeRows(initial?: { snapshot: unknown; updatedAt: string }) {
  let row = initial ?? null
  const log = { reads: [] as string[], writes: [] as { userId: string; snapshot: unknown }[] }
  let clock = 0

  const rows: StateRows = {
    async read(userId) {
      log.reads.push(userId)
      return row
    },
    async write(userId, snapshot) {
      log.writes.push({ userId, snapshot })
      clock += 1
      // Como la base de datos: `updated_at` lo pone ella, y cambia siempre.
      row = { snapshot, updatedAt: `2026-09-18T07:0${clock}:00.000Z` }
      return { updatedAt: row.updatedAt }
    },
  }

  return { rows, log, current: () => row }
}

describe('leer', () => {
  it('sin fila todavía, devuelve null: es el primer día, no un error', async () => {
    const { rows } = fakeRows()
    expect(await remoteBackend(ME, rows).read()).toBeNull()
  })

  it('la fila se traduce a texto, con la cuenta y la versión de la base', async () => {
    const { rows } = fakeRows({
      snapshot: { dayLog: { '2026-02-02': 600 } },
      updatedAt: '2026-09-18T07:00:00.000Z',
    })

    const remote = await remoteBackend(ME, rows).read()

    expect(remote).toEqual({
      ref: ME,
      version: '2026-09-18T07:00:00.000Z',
      text: '{"dayLog":{"2026-02-02":600}}',
    })
  })

  it('pregunta por la fila de esta cuenta, no por otra', async () => {
    const { rows, log } = fakeRows()
    await remoteBackend(ME, rows).read()
    expect(log.reads).toEqual([ME])
  })
})

describe('escribir', () => {
  it('guarda un objeto, no el texto: si no, el jsonb llevaría una cadena', async () => {
    const { rows, log } = fakeRows()

    await remoteBackend(ME, rows).write('{"dayLog":{"2026-02-02":600}}')

    expect(log.writes).toHaveLength(1)
    expect(log.writes[0].snapshot).toEqual({ dayLog: { '2026-02-02': 600 } })
    expect(typeof log.writes[0].snapshot).toBe('object')
  })

  it('devuelve la versión que puso la base de datos, no una de aquí', async () => {
    // Si el cliente inventara la marca, dos dispositivos con relojes distintos
    // se pisarían el progreso.
    const { rows } = fakeRows()
    const written = await remoteBackend(ME, rows).write('{"a":1}')

    expect(written).toEqual({ ref: ME, version: '2026-09-18T07:01:00.000Z' })
  })

  it('lo escrito se vuelve a leer igual', async () => {
    // La ida y la vuelta juntas, que es lo que de verdad importa: subir desde
    // el PC y bajar en el móvil.
    const { rows } = fakeRows()
    const backend = remoteBackend(ME, rows)
    const text = '{"testAttempts":[{"id":"a","score":3}],"dayLog":{"2026-02-02":600}}'

    await backend.write(text)
    const remote = await backend.read()

    expect(remote!.text).toBe(text)
    expect(JSON.parse(remote!.text)).toEqual(JSON.parse(text))
  })

  it('un texto que no es JSON falla, y no escribe una fila rota', async () => {
    const { rows, log } = fakeRows()
    await expect(remoteBackend(ME, rows).write('no soy json')).rejects.toThrow()
    expect(log.writes).toHaveLength(0)
  })
})
