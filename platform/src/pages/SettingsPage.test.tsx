// El panel de ajustes guardaba cada pulsación al instante y sin decir nada:
// no había forma de saber si un cambio había entrado ni de deshacerlo antes de
// que contara. Ahora los campos editan un borrador y hay que confirmar, así que
// lo que hay que asegurar es justo eso: que sin confirmar NO se guarda, que
// descartar recupera lo guardado, y que la pantalla dice en qué estado está.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, useStudyStore } from '../lib/studyStore'
import { useProgressStore } from '../lib/progressStore'
import { usePracticeStore } from '../lib/practiceStore'
import { useLocaleStore } from '../lib/localeStore'
import { DICT } from '../lib/dictionary'
import { SNAPSHOT_FORMAT, snapshotText, createSnapshot } from '../lib/backup'

const es = (key: keyof typeof DICT) => DICT[key].es
const clickButton = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))

const nameField = () => screen.getByLabelText(es('settings_name')) as HTMLInputElement

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useStudyStore.setState({
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
    dayLog: {},
  })
  useProgressStore.setState({ testAttempts: [], essayAttempts: [] })
  usePracticeStore.setState({ answers: {}, orderSeed: {} })
})

afterEach(cleanup)

describe('confirmación de cambios', () => {
  it('sin tocar nada no hay nada que guardar', () => {
    render(<SettingsPage />)
    expect(screen.getByText(es('settings_no_changes'))).toBeTruthy()
    expect((screen.getByRole('button', { name: new RegExp(es('settings_save')) }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('escribir NO guarda: avisa de que hay cambios pendientes', () => {
    render(<SettingsPage />)
    fireEvent.change(nameField(), { target: { value: 'Miguel' } })
    expect(screen.getByText(es('settings_unsaved'))).toBeTruthy()
    // Lo que importa: el almacén sigue intacto.
    expect(useStudyStore.getState().profile.displayName).toBe('')
  })

  it('confirmar guarda y lo dice', () => {
    render(<SettingsPage />)
    fireEvent.change(nameField(), { target: { value: 'Miguel' } })
    clickButton(new RegExp(es('settings_save')))
    expect(useStudyStore.getState().profile.displayName).toBe('Miguel')
    expect(screen.getByText(es('settings_saved'))).toBeTruthy()
  })

  it('descartar devuelve el formulario a lo guardado', () => {
    render(<SettingsPage />)
    fireEvent.change(nameField(), { target: { value: 'Escrito por error' } })
    clickButton(new RegExp(es('settings_discard')))
    expect(nameField().value).toBe('')
    expect(screen.getByText(es('settings_no_changes'))).toBeTruthy()
    expect(useStudyStore.getState().profile.displayName).toBe('')
  })

  it('no se puede descartar cuando no hay nada que descartar', () => {
    render(<SettingsPage />)
    expect(screen.queryByRole('button', { name: new RegExp(es('settings_discard')) })).toBeNull()
  })

  it('el objetivo semanal tampoco se aplica hasta confirmar', () => {
    render(<SettingsPage />)
    const number = screen.getAllByRole('spinbutton')[0] as HTMLInputElement
    fireEvent.change(number, { target: { value: '12' } })
    expect(useStudyStore.getState().settings.weeklyGoalHours).toBe(5)
    clickButton(new RegExp(es('settings_save')))
    expect(useStudyStore.getState().settings.weeklyGoalHours).toBe(12)
  })

  it('la previsión diaria sigue al borrador, para ver qué se va a confirmar', () => {
    // Si la previsión esperase al guardado, el candidato movería el objetivo a
    // ciegas: el número que decide es justamente el que aún no ha confirmado.
    render(<SettingsPage />)
    const number = screen.getAllByRole('spinbutton')[0] as HTMLInputElement
    fireEvent.change(number, { target: { value: '14' } })
    // 14 h / 7 días = 2 h al día.
    expect(screen.getByText(new RegExp(es('settings_goal_daily').replace('{daily}', '2 h')))).toBeTruthy()
  })

  it('volver a editar tras guardar vuelve a marcar pendiente', () => {
    render(<SettingsPage />)
    fireEvent.change(nameField(), { target: { value: 'Miguel' } })
    clickButton(new RegExp(es('settings_save')))
    fireEvent.change(nameField(), { target: { value: 'Miguel R.' } })
    expect(screen.getByText(es('settings_unsaved'))).toBeTruthy()
    expect(screen.queryByText(es('settings_saved'))).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// El progreso vive en el `localStorage` de cada navegador: el PC y el móvil no
// comparten nada. El fichero exportado es el único puente, y meterlo es la
// operación que menos admite un «vaya», así que lo que se asegura aquí es que
// elegir un fichero NO aplica nada — primero enseña qué trae y espera.
// ─────────────────────────────────────────────────────────────────────────────

/** Un fichero como el que saldría del otro dispositivo. */
function exportedFile(patch: Record<string, unknown> = {}): File {
  const body = JSON.stringify({
    app: 'epso-prep',
    format: SNAPSHOT_FORMAT,
    exportedAt: '2026-02-01T18:30:00.000Z',
    appVersion: '1.0',
    dayLog: { '2026-02-01': 1800 },
    testAttempts: [],
    essayAttempts: [],
    practiceAnswers: { q1: 'a', q2: 'b' },
    practiceOrder: {},
    ...patch,
  })
  return new File([body], 'epso-prep-2026-02-01.json', { type: 'application/json' })
}

async function choose(file: File) {
  const input = screen.getByLabelText(es('settings_sync_import')) as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => expect(screen.queryByText(es('settings_sync_cancel')) ?? screen.queryByRole('alert')).toBeTruthy())
}

describe('llevar el progreso a otro dispositivo', () => {
  it('ofrece exportar e importar', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('button', { name: new RegExp(es('settings_sync_export')) })).toBeTruthy()
    expect(screen.getByRole('button', { name: new RegExp(es('settings_sync_import')) })).toBeTruthy()
  })

  it('elegir un fichero enseña qué trae y todavía no aplica nada', async () => {
    render(<SettingsPage />)
    await choose(exportedFile())

    expect(screen.getByText(/Respuestas de práctica: 2/)).toBeTruthy()
    // Lo que importa: el almacén sigue intacto hasta que el candidato confirme.
    expect(usePracticeStore.getState().answers).toEqual({})
    expect(useStudyStore.getState().dayLog).toEqual({})
  })

  it('combinar mete lo del fichero y dice qué ha entrado', async () => {
    render(<SettingsPage />)
    await choose(exportedFile())
    clickButton(new RegExp(es('settings_sync_merge')))

    expect(usePracticeStore.getState().answers).toEqual({ q1: 'a', q2: 'b' })
    expect(useStudyStore.getState().dayLog).toEqual({ '2026-02-01': 1800 })
    expect(screen.getByRole('status').textContent).toMatch(/respuestas de práctica: 2/)
  })

  it('reimportar el mismo fichero avisa de que no traía nada nuevo', async () => {
    render(<SettingsPage />)
    await choose(exportedFile())
    clickButton(new RegExp(es('settings_sync_merge')))
    await choose(exportedFile())
    clickButton(new RegExp(es('settings_sync_merge')))

    expect(screen.getByText(es('settings_sync_nothing_new'))).toBeTruthy()
  })

  it('cancelar deja el dispositivo como estaba', async () => {
    render(<SettingsPage />)
    await choose(exportedFile())
    clickButton(es('settings_sync_cancel'))

    expect(usePracticeStore.getState().answers).toEqual({})
    expect(screen.queryByText(es('settings_sync_merge'))).toBeNull()
  })

  it('un fichero de otra cosa lo dice, en vez de un «error» a secas', async () => {
    render(<SettingsPage />)
    await choose(new File(['{"app":"otra-cosa"}'], 'otro.json', { type: 'application/json' }))

    expect(screen.getByRole('alert').textContent).toBe(es('settings_sync_error_foreign'))
    expect(screen.queryByText(es('settings_sync_merge'))).toBeNull()
  })

  it('un fichero roto lo distingue de uno ajeno', async () => {
    render(<SettingsPage />)
    await choose(new File(['no soy json'], 'roto.json', { type: 'application/json' }))

    expect(screen.getByRole('alert').textContent).toBe(es('settings_sync_error_unreadable'))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// La descarga tal como la hace el navegador: un Blob, un enlace con nombre de
// fichero y la URL temporal liberada después. Los tests de `backup.test.ts`
// prueban QUÉ se guarda; éstos prueban que de verdad SALE del navegador, que es
// donde se rompería sin que nadie se enterase hasta necesitar la copia.
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que ha salido por la descarga en el último clic. */
function downloadHarness() {
  const blobs: Blob[] = []
  const links: HTMLAnchorElement[] = []
  const revoked: string[] = []

  URL.createObjectURL = ((blob: Blob) => {
    blobs.push(blob)
    return 'blob:prueba'
  }) as typeof URL.createObjectURL
  URL.revokeObjectURL = ((url: string) => {
    revoked.push(url)
  }) as typeof URL.revokeObjectURL
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    links.push(this)
  })

  return { blobs, links, revoked }
}

describe('descargar el estado', () => {
  afterEach(() => vi.restoreAllMocks())

  it('entrega un fichero JSON con nombre fechado', () => {
    const out = downloadHarness()
    render(<SettingsPage />)
    clickButton(new RegExp(es('settings_sync_export')))

    expect(out.blobs).toHaveLength(1)
    expect(out.blobs[0].type).toBe('application/json')
    expect(out.links[0].download).toMatch(/^epso-prep-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('libera la URL temporal en vez de dejarla colgando', () => {
    const out = downloadHarness()
    render(<SettingsPage />)
    clickButton(new RegExp(es('settings_sync_export')))

    expect(out.revoked).toEqual(['blob:prueba'])
  })

  it('lo descargado lleva dentro lo que hay en este dispositivo', async () => {
    usePracticeStore.setState({ answers: { q1: 'a', q2: 'b' }, orderSeed: { banco: 4 } })
    useStudyStore.setState({ dayLog: { '2026-02-01': 1800 } })

    const out = downloadHarness()
    render(<SettingsPage />)
    clickButton(new RegExp(es('settings_sync_export')))

    const saved = JSON.parse(await out.blobs[0].text())
    expect(saved.practiceAnswers).toEqual({ q1: 'a', q2: 'b' })
    expect(saved.practiceOrder).toEqual({ banco: 4 })
    expect(saved.dayLog).toEqual({ '2026-02-01': 1800 })
  })

  it('descargar en un sitio y cargar en otro devuelve el progreso', async () => {
    // El caso completo y el motivo de todo esto: el ordenador exporta, el móvil
    // importa. Aquí el «otro dispositivo» es el mismo almacén vaciado, que es
    // exactamente lo que ve la aplicación al abrirse en un navegador nuevo.
    usePracticeStore.setState({ answers: { q1: 'a', q2: 'b' }, orderSeed: {} })
    useStudyStore.setState({ dayLog: { '2026-02-01': 1800 } })

    const out = downloadHarness()
    render(<SettingsPage />)
    clickButton(new RegExp(es('settings_sync_export')))
    const descargado = await out.blobs[0].text()

    usePracticeStore.setState({ answers: {}, orderSeed: {} })
    useStudyStore.setState({ dayLog: {} })

    await choose(new File([descargado], 'epso-prep.json', { type: 'application/json' }))
    clickButton(new RegExp(es('settings_sync_merge')))

    expect(usePracticeStore.getState().answers).toEqual({ q1: 'a', q2: 'b' })
    expect(useStudyStore.getState().dayLog).toEqual({ '2026-02-01': 1800 })
  })
})

describe('compartir desde el móvil', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(navigator, 'canShare')
    Reflect.deleteProperty(navigator, 'share')
  })

  function pretendMobile(canShare: boolean) {
    Object.defineProperty(navigator, 'canShare', { value: () => canShare, configurable: true })
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    return share
  }

  it('en el escritorio no aparece el botón, porque allí no funciona', () => {
    render(<SettingsPage />)
    expect(screen.queryByRole('button', { name: new RegExp(es('settings_sync_share')) })).toBeNull()
  })

  it('donde el sistema sabe compartir ficheros, manda el fichero', async () => {
    const share = pretendMobile(true)
    render(<SettingsPage />)

    const boton = await screen.findByRole('button', { name: new RegExp(es('settings_sync_share')) })
    fireEvent.click(boton)

    await waitFor(() => expect(share).toHaveBeenCalled())
    const enviado = share.mock.calls[0][0].files[0] as File
    expect(enviado.name).toMatch(/^epso-prep-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('cancelar el diálogo de compartir no rompe la página', async () => {
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('AbortError')),
      configurable: true,
    })
    render(<SettingsPage />)

    const boton = await screen.findByRole('button', { name: new RegExp(es('settings_sync_share')) })
    fireEvent.click(boton)

    // Cerrar el diálogo lanza excepción; no es un fallo, es cambiar de idea.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: new RegExp(es('settings_sync_export')) })).toBeTruthy(),
    )
  })
})

describe('cargar un fichero', () => {
  it('tras cancelar, se puede volver a empezar con otro fichero', async () => {
    // Cancelar tiene que dejar la pantalla lista para otro intento, no en un
    // estado intermedio del que ya no se sale.
    //
    // Lo que este test NO prueba, porque jsdom no lo modela: que el input se
    // vacíe (`e.target.value = ''`). El navegador real no dispara `change` al
    // reelegir el fichero que el input ya tiene, y sin vaciarlo el segundo
    // intento no haría nada; jsdom dispara `change` siempre, así que aquí la
    // línea es invisible. Queda anotado en TESTPLAN.md, «Qué NO cubre».
    render(<SettingsPage />)
    await choose(exportedFile({ practiceAnswers: { q1: 'a' } }))
    clickButton(es('settings_sync_cancel'))
    await choose(exportedFile({ practiceAnswers: { q1: 'a', q2: 'b', q3: 'c' } }))

    expect(screen.getByText(/Respuestas de práctica: 3/)).toBeTruthy()
  })

  it('reemplazar pide confirmación antes de destruir nada', async () => {
    usePracticeStore.setState({ answers: { mia: 'x' }, orderSeed: {} })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<SettingsPage />)
    await choose(exportedFile())
    clickButton(new RegExp(es('settings_sync_replace')))

    expect(confirm).toHaveBeenCalled()
    expect(usePracticeStore.getState().answers).toEqual({ mia: 'x' })
    confirm.mockRestore()
  })

  it('confirmado, reemplazar sustituye lo que había', async () => {
    usePracticeStore.setState({ answers: { mia: 'x' }, orderSeed: {} })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<SettingsPage />)
    await choose(exportedFile())
    clickButton(new RegExp(es('settings_sync_replace')))

    expect(usePracticeStore.getState().answers).toEqual({ q1: 'a', q2: 'b' })
    expect(screen.getByText(es('settings_sync_replaced'))).toBeTruthy()
    confirm.mockRestore()
  })

  it('un fichero de una versión posterior pide actualizar, no dice «error»', async () => {
    render(<SettingsPage />)
    await choose(exportedFile({ format: SNAPSHOT_FORMAT + 1 }))

    expect(screen.getByRole('alert').textContent).toBe(es('settings_sync_error_newer'))
  })

  it('el resumen de este dispositivo se actualiza tras cargar', async () => {
    render(<SettingsPage />)
    expect(screen.getByText(/Respuestas de práctica: 0/)).toBeTruthy()

    await choose(exportedFile())
    clickButton(new RegExp(es('settings_sync_merge')))

    expect(screen.getAllByText(/Respuestas de práctica: 2/).length).toBeGreaterThan(0)
  })

  it('lo exportado justo después de cargar contiene lo cargado', async () => {
    // Encadenar dispositivos: A → B → C. Si B exportara su estado anterior, la
    // cadena perdería trabajo en el segundo salto.
    render(<SettingsPage />)
    await choose(exportedFile())
    clickButton(new RegExp(es('settings_sync_merge')))

    const reexportado = JSON.parse(snapshotText(createSnapshot()))
    expect(reexportado.practiceAnswers).toEqual({ q1: 'a', q2: 'b' })
    expect(reexportado.dayLog).toEqual({ '2026-02-01': 1800 })
  })
})
