// El panel de ajustes guardaba cada pulsación al instante y sin decir nada:
// no había forma de saber si un cambio había entrado ni de deshacerlo antes de
// que contara. Ahora los campos editan un borrador y hay que confirmar, así que
// lo que hay que asegurar es justo eso: que sin confirmar NO se guarda, que
// descartar recupera lo guardado, y que la pantalla dice en qué estado está.
//
// El traslado a mano de un fichero ya no vive aquí. Con cuentas de verdad,
// bajar y restaurar el progreso pasó a ser cosa del administrador y sobre la
// cuenta de otra persona: está en `AdminPanel`. Lo que aquellos tests
// vigilaban de verdad —que fusionar no destruya nada— sigue donde siempre
// estuvo, en `backup.test.ts`.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, useStudyStore } from '../lib/studyStore'
import { useProgressStore } from '../lib/progressStore'
import { usePracticeStore } from '../lib/practiceStore'
import { useLocaleStore } from '../lib/localeStore'
import { DICT } from '../lib/dictionary'
import { ALL_FIELDS } from '../data/competition'

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

describe('alta de ámbitos', () => {
  // La plataforma cubre los seis ámbitos convocados, pero el menú sólo enseña
  // los que se den de alta aquí. Es lo que sustituyó al selector AD7/AD8: sin
  // esta pantalla no habría forma de sumar un ámbito nuevo sin tocar código.
  // El nombre accesible lleva detrás el grado y las plazas, y alguna etiqueta
  // trae paréntesis —"Inteligencia artificial (IA)"—, así que se compara por
  // contenido y no con una expresión regular construida al vuelo.
  const checkbox = (label: string) =>
    screen.getByRole('checkbox', {
      name: (accessible: string) => accessible.includes(label),
    }) as HTMLInputElement

  it('los seis ámbitos convocados se pueden dar de alta', () => {
    render(<SettingsPage />)
    for (const f of ALL_FIELDS) {
      expect(checkbox(f.label.es), `${f.id} no se puede dar de alta`).toBeTruthy()
    }
  })

  it('de fábrica vienen dados de alta los dos por los que se presenta', () => {
    render(<SettingsPage />)
    expect(checkbox('Ciencia de datos').checked).toBe(true)
    expect(checkbox('Ciberseguridad').checked).toBe(true)
    expect(checkbox('Nubes y redes').checked).toBe(false)
  })

  it('dar de alta uno nuevo no cuenta hasta confirmar', () => {
    render(<SettingsPage />)
    fireEvent.click(checkbox('Nubes y redes'))
    expect(screen.getByText(es('settings_unsaved'))).toBeTruthy()
    expect(useStudyStore.getState().profile.activeFields).not.toContain('clouds-networks')

    clickButton(new RegExp(es('settings_save')))
    expect(useStudyStore.getState().profile.activeFields).toContain('clouds-networks')
  })

  it('el ámbito por el que te presentas no se puede dar de baja', () => {
    // Sería quitar del menú la página que se está usando, y dejar la
    // convocatoria activa sin ningún ámbito del que colgar.
    render(<SettingsPage />)
    expect(checkbox('Ciberseguridad').disabled).toBe(true)
    expect(checkbox('Ciencia de datos').disabled).toBe(false)
  })

  it('dar de baja el resto se guarda', () => {
    render(<SettingsPage />)
    fireEvent.click(checkbox('Ciencia de datos'))
    clickButton(new RegExp(es('settings_save')))
    expect(useStudyStore.getState().profile.activeFields).toEqual(['cybersecurity'])
  })
})
