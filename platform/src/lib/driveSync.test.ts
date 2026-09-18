// La sincronización con Drive, probada entera sin red y sin cuenta de Google:
// el acceso a Drive entra por una interfaz y aquí se le pasa uno de mentira.
//
// Lo que más se vigila es lo que haría perder trabajo al candidato:
//
//  · que bajar de Drive FUSIONE en vez de sustituir, y que hacerlo dos veces
//    deje el progreso igual (el reloj de cinco minutos lo va a hacer muchas);
//  · que no se suba nada cuando el estado no ha cambiado, o el historial de
//    Drive se llenaría de copias idénticas cada cinco minutos;
//  · que un fallo al subir no deshaga lo que ya se fusionó.
import { describe, it, expect, beforeEach } from 'vitest'
import { SNAPSHOT_FORMAT, createSnapshot, snapshotText, type Snapshot } from './backup'
import { fingerprint, syncOnce, type DriveBackend, type SyncState } from './driveSync'
import { useCompetitionStore } from './competitionStore'
import { useLocaleStore } from './localeStore'
import { usePracticeStore } from './practiceStore'
import { useProgressStore } from './progressStore'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, useStudyStore } from './studyStore'
import { useTestLocaleStore } from './testLocaleStore'
import type { TestAttempt } from '../types/content'

function attempt(id: string, startedAt: string): TestAttempt {
  return { id, phase: 'reasoning', startedAt, results: [], totalQuestions: 0, timeSpentSeconds: 60 }
}

/** Un dispositivo vacío, para que cada caso parta de lo mismo. */
function blank() {
  useStudyStore.setState({
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
    dayLog: {},
  })
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
  usePracticeStore.setState({ answers: {}, orderSeed: {} })
  useCompetitionStore.setState({ competition: 'ad8' })
  useLocaleStore.setState({ locale: 'es' })
  useTestLocaleStore.setState({ locale: 'es' })
}

/** Lo que subió el otro dispositivo. A mano, no con `createSnapshot`, que
 * leería los almacenes de ESTE y borraría el montaje del caso. */
function fileFrom(extra: Partial<Snapshot> = {}): Snapshot {
  return {
    app: 'epso-prep',
    format: SNAPSHOT_FORMAT,
    exportedAt: '2026-01-01T09:00:00.000Z',
    appVersion: '1.2',
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
    dayLog: {},
    testAttempts: [],
    essayAttempts: [],
    practiceAnswers: {},
    practiceOrder: {},
    competition: 'ad8',
    uiLocale: 'es',
    testLocale: 'es',
    ...extra,
  }
}

/** Un Drive de mentira: recuerda un fichero y cuenta las escrituras. */
function fakeDrive(initial?: Snapshot) {
  const log = { writes: 0, reads: 0, clock: 1 }
  let file = initial
    ? { fileId: 'file-1', modifiedTime: 'T1', text: snapshotText(initial) }
    : null
  const backend: DriveBackend = {
    read: async () => {
      log.reads++
      return file
    },
    write: async (text, fileId) => {
      log.writes++
      log.clock++
      file = { fileId: fileId ?? 'file-1', modifiedTime: `T${log.clock}`, text }
      return { fileId: file.fileId, modifiedTime: file.modifiedTime }
    },
  }
  return { backend, log, current: () => file }
}

beforeEach(blank)

describe('la primera vez', () => {
  it('sube el estado local, porque en Drive no hay nada', async () => {
    useProgressStore.setState({ testAttempts: [attempt('local-1', '2026-02-01T10:00:00Z')] })
    const drive = fakeDrive()

    const result = await syncOnce(drive.backend, {})

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect([result.pushed, result.pulled]).toEqual([true, null])
    expect(drive.log.writes).toBe(1)
    expect(result.state).toMatchObject({ fileId: 'file-1', modifiedTime: 'T2' })
    expect(JSON.parse(drive.current()!.text).testAttempts).toHaveLength(1)
  })
})

describe('cuando no ha cambiado nada', () => {
  it('no sube un fichero idéntico cada cinco minutos', async () => {
    const drive = fakeDrive()
    const first = await syncOnce(drive.backend, {})
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = await syncOnce(drive.backend, first.state)

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.pushed).toBe(false)
    expect(drive.log.writes).toBe(1)
  })

  it('tampoco vuelve a fusionar la versión de Drive que ya fusionó', async () => {
    // La huella cambia si se fusiona algo; que no cambie demuestra que no se
    // ha vuelto a aplicar lo mismo.
    const drive = fakeDrive(fileFrom({ dayLog: { '2026-02-02': 600 } }))
    const first = await syncOnce(drive.backend, {})
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const antes = useStudyStore.getState().dayLog

    const second = await syncOnce(drive.backend, first.state)

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.pulled).toBeNull()
    expect(useStudyStore.getState().dayLog).toEqual(antes)
  })
})

describe('cuando el otro dispositivo ha subido algo', () => {
  it('lo fusiona sin tirar lo de aquí, y sube la unión', async () => {
    useProgressStore.setState({ testAttempts: [attempt('del-pc', '2026-02-01T10:00:00Z')] })
    const drive = fakeDrive(fileFrom({ testAttempts: [attempt('del-movil', '2026-02-03T10:00:00Z')] }))

    const result = await syncOnce(drive.backend, {})

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pulled).toMatchObject({ tests: 1 })
    expect(useProgressStore.getState().testAttempts.map((a) => a.id)).toEqual([
      'del-pc',
      'del-movil',
    ])
    // Y lo que queda en Drive ya tiene los dos, para que el móvil vea el del PC.
    expect(JSON.parse(drive.current()!.text).testAttempts).toHaveLength(2)
  })

  it('el calendario se queda con el máximo de cada día, no con la suma', async () => {
    useStudyStore.setState({ dayLog: { '2026-02-02': 900, '2026-02-03': 300 } })
    const drive = fakeDrive(fileFrom({ dayLog: { '2026-02-02': 600, '2026-02-04': 1200 } }))

    await syncOnce(drive.backend, {})

    expect(useStudyStore.getState().dayLog).toEqual({
      '2026-02-02': 900,
      '2026-02-03': 300,
      '2026-02-04': 1200,
    })
  })

  it('sincronizar dos veces seguidas no duplica nada', async () => {
    const drive = fakeDrive(fileFrom({ testAttempts: [attempt('del-movil', '2026-02-03T10:00:00Z')] }))

    const first = await syncOnce(drive.backend, {})
    expect(first.ok).toBe(true)
    if (!first.ok) return
    await syncOnce(drive.backend, first.state)

    expect(useProgressStore.getState().testAttempts).toHaveLength(1)
  })

  it('no toca los ajustes ni el idioma de este dispositivo', async () => {
    // Bajar el progreso no es pedir que cambie la convocatoria que se está
    // preparando ni el idioma de la interfaz.
    useCompetitionStore.setState({ competition: 'ad7' })
    useLocaleStore.setState({ locale: 'en' })
    const drive = fakeDrive(fileFrom({ competition: 'ad8', uiLocale: 'es' }))

    await syncOnce(drive.backend, {})

    expect(useCompetitionStore.getState().competition).toBe('ad7')
    expect(useLocaleStore.getState().locale).toBe('en')
  })
})

describe('cuando algo va mal', () => {
  it('un fichero que no es nuestro no se aplica, y se dice por qué', async () => {
    useProgressStore.setState({ testAttempts: [attempt('local-1', '2026-02-01T10:00:00Z')] })
    const drive = fakeDrive()
    // Un JSON cualquiera en el sitio del estado.
    await drive.backend.write('{"algo":"otra cosa"}')

    const result = await syncOnce(drive.backend, {})

    expect(result).toMatchObject({ ok: false, reason: 'foreign' })
    expect(useProgressStore.getState().testAttempts).toHaveLength(1)
  })

  it('un fichero ilegible tampoco', async () => {
    const drive = fakeDrive()
    await drive.backend.write('esto no es JSON')
    expect(await syncOnce(drive.backend, {})).toMatchObject({ ok: false, reason: 'unreadable' })
  })

  it('si Drive no contesta al leer, no se sube nada a ciegas', async () => {
    // Subir sin haber podido leer sobrescribiría lo que hubiera allí.
    const backend: DriveBackend = {
      read: async () => {
        throw new Error('sin conexión')
      },
      write: async () => {
        throw new Error('no debería llegar aquí')
      },
    }

    const result = await syncOnce(backend, { fileId: 'file-1' })

    expect(result).toMatchObject({ ok: false, reason: 'read', detail: 'sin conexión' })
  })

  it('si falla al subir, lo fusionado NO se deshace y el próximo intento reintenta', async () => {
    useProgressStore.setState({ testAttempts: [attempt('del-pc', '2026-02-01T10:00:00Z')] })
    const backend: DriveBackend = {
      read: async () => ({
        fileId: 'file-1',
        modifiedTime: 'T1',
        text: snapshotText(fileFrom({ testAttempts: [attempt('del-movil', '2026-02-03T10:00:00Z')] })),
      }),
      write: async () => {
        throw new Error('403')
      },
    }

    const result = await syncOnce(backend, {})

    expect(result).toMatchObject({ ok: false, reason: 'write' })
    // El progreso del móvil ya está aquí…
    expect(useProgressStore.getState().testAttempts).toHaveLength(2)
    // …y la huella se queda sin poner, para que el siguiente ciclo vuelva a
    // intentar subir.
    expect(result.state.fingerprint).toBeUndefined()
    expect(result.state.modifiedTime).toBe('T1')
  })
})

describe('la huella del estado', () => {
  it('no cambia porque cambie la hora de exportación', async () => {
    // Con la hora dentro, cada ciclo de cinco minutos subiría un fichero nuevo.
    const a = createSnapshot()
    await new Promise((done) => setTimeout(done, 2))
    const b = createSnapshot()
    expect(b.exportedAt).not.toBe(a.exportedAt)
    expect(fingerprint(b)).toBe(fingerprint(a))
  })

  it('cambia en cuanto hay progreso nuevo', () => {
    const antes = fingerprint(createSnapshot())
    useProgressStore.setState({ testAttempts: [attempt('nuevo', '2026-02-05T10:00:00Z')] })
    expect(fingerprint(createSnapshot())).not.toBe(antes)
  })

  it('no depende del orden en que se guardaron los días', () => {
    // Dos dispositivos pueden tener el mismo calendario insertado al revés.
    useStudyStore.setState({ dayLog: { '2026-02-02': 600, '2026-02-01': 300 } })
    const uno = fingerprint(createSnapshot())
    useStudyStore.setState({ dayLog: { '2026-02-01': 300, '2026-02-02': 600 } })
    expect(fingerprint(createSnapshot())).toBe(uno)
  })
})

describe('el estado que se recuerda entre pasadas', () => {
  it('guarda el id del fichero, para no volver a buscarlo', async () => {
    const drive = fakeDrive(fileFrom())
    const result = await syncOnce(drive.backend, {})
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.fileId).toBe('file-1')
  })

  it('reutiliza el id que se le pasa al escribir', async () => {
    const drive = fakeDrive()
    const state: SyncState = { fileId: 'ya-existia' }
    const result = await syncOnce(drive.backend, state)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.fileId).toBe('ya-existia')
  })
})
