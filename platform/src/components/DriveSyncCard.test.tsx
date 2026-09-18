// La tarjeta de sincronización con Drive.
//
// Lo que se comprueba aquí es que el candidato entienda en qué punto está y qué
// puede hacer: sin identificador, el formulario para pegarlo; con él, conectar;
// conectado, sincronizar ahora. Y que los dos límites incómodos —el permiso
// caduca cada hora, y el guardado automático sólo corre con la pestaña
// abierta— estén escritos, porque sin ellos el candidato acabará creyendo que
// la web se ha roto.
//
// Lo que NO se prueba aquí es la ventana de permiso de Google: necesita un
// navegador de verdad y una cuenta. Lo que sí está probado entero, sin red, es
// la decisión de qué se sube y qué se fusiona (driveSync.test.ts).
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DriveSyncCard } from './DriveSyncCard'
import { DICT } from '../lib/dictionary'
import { useDriveStore } from '../lib/driveStore'
import { useLocaleStore } from '../lib/localeStore'

const es = (key: keyof typeof DICT) => DICT[key].es

beforeEach(() => {
  useLocaleStore.setState({ locale: 'es' })
  useDriveStore.setState({
    clientId: '',
    auto: true,
    status: 'off',
    error: null,
    lastSyncAt: null,
    folderId: null,
    sync: {},
  })
})

afterEach(cleanup)

describe('sin identificador de cliente', () => {
  it('lo dice y pide el identificador, sin prometer sincronización', () => {
    render(<DriveSyncCard />)
    expect(screen.getByText(es('drive_status_off'))).toBeTruthy()
    expect(screen.getByText(es('drive_client_label'))).toBeTruthy()
    expect(screen.queryByRole('button', { name: es('drive_connect') })).toBeNull()
  })

  it('avisa de que ese identificador no es una contraseña', () => {
    // Si pareciera un secreto, el candidato no lo pegaría, o peor: creería que
    // la web guarda secretos que no puede guardar.
    render(<DriveSyncCard />)
    expect(screen.getByText(es('drive_client_not_secret'))).toBeTruthy()
  })

  it('no se puede guardar vacío', () => {
    render(<DriveSyncCard />)
    const save = screen.getByRole('button', { name: es('drive_client_save') }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })

  it('al guardarlo, pasa a poder conectar', () => {
    render(<DriveSyncCard />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' 123-abc.apps.googleusercontent.com ' } })
    fireEvent.click(screen.getByRole('button', { name: es('drive_client_save') }))

    // Sin espacios alrededor: pegarlo de una web los trae a menudo.
    expect(useDriveStore.getState().clientId).toBe('123-abc.apps.googleusercontent.com')
    expect(screen.getByText(es('drive_status_disconnected'))).toBeTruthy()
    expect(screen.getByRole('button', { name: es('drive_connect') })).toBeTruthy()
  })
})

describe('con identificador, sin autorizar', () => {
  beforeEach(() => {
    useDriveStore.setState({ clientId: '123-abc.apps.googleusercontent.com', status: 'disconnected' })
  })

  it('ofrece conectar, y todavía no ha sincronizado nunca', () => {
    render(<DriveSyncCard />)
    expect(screen.getByRole('button', { name: es('drive_connect') })).toBeTruthy()
    expect(screen.getByText(es('drive_never_synced'))).toBeTruthy()
  })

  it('dice dónde va a guardar, con el nombre de la carpeta y del fichero', () => {
    render(<DriveSyncCard />)
    expect(screen.getByText(/EPSO_savedata/)).toBeTruthy()
    expect(screen.getByText(/epso-prep-estado\.json/)).toBeTruthy()
  })

  it('explica los dos límites: la hora del permiso y la pestaña abierta', () => {
    render(<DriveSyncCard />)
    expect(screen.getByText(es('drive_auto_hint'))).toBeTruthy()
  })
})

describe('conectado', () => {
  beforeEach(() => {
    useDriveStore.setState({
      clientId: '123-abc.apps.googleusercontent.com',
      status: 'ready',
      lastSyncAt: '2026-09-18T07:30:00.000Z',
    })
  })

  it('ofrece sincronizar ahora y dice cuándo fue la última vez', () => {
    render(<DriveSyncCard />)
    expect(screen.getByRole('button', { name: es('drive_sync_now') })).toBeTruthy()
    expect(screen.getByText(new RegExp(es('drive_last_sync').replace('{when}', '')))).toBeTruthy()
    expect(screen.queryByRole('button', { name: es('drive_connect') })).toBeNull()
  })

  it('el guardado automático se puede apagar', () => {
    render(<DriveSyncCard />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useDriveStore.getState().auto).toBe(false)
  })

  it('mientras sincroniza, no se puede pedir otra pasada', () => {
    useDriveStore.setState({ status: 'syncing' })
    render(<DriveSyncCard />)
    // En «syncing» el botón principal es el de conectar; lo que importa es que
    // ninguno acepte clics mientras hay una pasada en marcha.
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })
})

describe('cuando algo falla', () => {
  it('enseña el motivo tal cual, para poder pegarlo en una consulta', () => {
    useDriveStore.setState({
      clientId: '123-abc.apps.googleusercontent.com',
      status: 'error',
      error: 'Drive respondió 403: insufficientPermissions',
    })
    render(<DriveSyncCard />)
    expect(screen.getByText('Drive respondió 403: insufficientPermissions')).toBeTruthy()
    expect(screen.getByText(es('drive_status_error'))).toBeTruthy()
    // Y deja volver a intentarlo.
    expect(screen.getByRole('button', { name: es('drive_connect') })).toBeTruthy()
  })
})

describe('en inglés', () => {
  it('la tarjeta entera cambia de idioma', () => {
    useLocaleStore.setState({ locale: 'en' })
    useDriveStore.setState({ clientId: '123-abc.apps.googleusercontent.com', status: 'ready' })
    render(<DriveSyncCard />)
    expect(screen.getByText(DICT.drive_status_ready.en)).toBeTruthy()
    expect(screen.queryByText(es('drive_status_ready'))).toBeNull()
  })
})
