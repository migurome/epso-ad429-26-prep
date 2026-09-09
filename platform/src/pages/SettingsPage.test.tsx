// El panel de ajustes guardaba cada pulsación al instante y sin decir nada:
// no había forma de saber si un cambio había entrado ni de deshacerlo antes de
// que contara. Ahora los campos editan un borrador y hay que confirmar, así que
// lo que hay que asegurar es justo eso: que sin confirmar NO se guarda, que
// descartar recupera lo guardado, y que la pantalla dice en qué estado está.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, useStudyStore } from '../lib/studyStore'
import { useProgressStore } from '../lib/progressStore'
import { useLocaleStore } from '../lib/localeStore'
import { DICT } from '../lib/dictionary'

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
