// Smoke tests: cada ruta principal debe montar sin lanzar excepciones.
// Existen porque un selector de zustand mal escrito (devolviendo un array
// nuevo en cada render, p. ej. `useProgressStore(s => s.testAttempts.filter(...))`)
// provocaba un bucle infinito de re-render ("Maximum update depth exceeded")
// que sólo se manifestaba en el navegador como pantalla en blanco al navegar.
//
// Las páginas que cargan su contenido bajo demanda (contentLoader.ts + `use()`)
// se suspenden en el primer render, igual que en producción bajo el
// <Suspense> de Layout.tsx — por eso se envuelven aquí también en <Suspense>
// y se espera con `waitFor` a que el contenido real (no el fallback) aparezca.
import { Suspense } from 'react'
import { describe, it, expect } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ReasoningSkillPage } from './pages/ReasoningSkillPage'
import { FieldMcqPage } from './pages/FieldMcqPage'
import { EuftePage } from './pages/EuftePage'
import { ProgressPage } from './pages/ProgressPage'
import { useLocaleStore } from './lib/localeStore'

const FALLBACK = 'smoke-test-loading-fallback'

// El render inicial se envuelve en un `act` async: el componente se suspende
// de inmediato (el chunk de contenido aún no ha resuelto), y sin este `act`
// React no llega a confirmar en el DOM el re-render posterior a que la
// promesa se resuelva dentro del entorno de test.
async function renderSuspended(ui: React.ReactNode) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(<Suspense fallback={<div>{FALLBACK}</div>}>{ui}</Suspense>)
  })
  return result
}

async function waitForRealContent(container: HTMLElement) {
  await waitFor(() => {
    expect(container.textContent).toBeTruthy()
    expect(container.textContent).not.toContain(FALLBACK)
  })
}

describe('pages render without crashing', () => {
  it('reasoning: verbal', async () => {
    const { container } = await renderSuspended(
      <MemoryRouter initialEntries={['/razonamiento/verbal']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitForRealContent(container)
  })

  it('reasoning: numerical', async () => {
    const { container } = await renderSuspended(
      <MemoryRouter initialEntries={['/razonamiento/numerical']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitForRealContent(container)
  })

  it('reasoning: abstract', async () => {
    const { container } = await renderSuspended(
      <MemoryRouter initialEntries={['/razonamiento/abstract']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitForRealContent(container)
  })

  it('field mcq: data-science', async () => {
    const { container } = await renderSuspended(
      <MemoryRouter initialEntries={['/campo/data-science']}>
        <Routes>
          <Route path="/campo/:fieldId" element={<FieldMcqPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitForRealContent(container)
  })

  it('eufte', async () => {
    const { container } = await renderSuspended(
      <MemoryRouter initialEntries={['/eufte']}>
        <EuftePage />
      </MemoryRouter>,
    )
    await waitForRealContent(container)
  })

  it('progress', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/progreso']}>
        <ProgressPage />
      </MemoryRouter>,
    )
    expect(container.textContent).toBeTruthy()
  })
})

describe('locale switch (en)', () => {
  it('reasoning: verbal renders in English without crashing', async () => {
    useLocaleStore.getState().setLocale('en')
    const { container } = await renderSuspended(
      <MemoryRouter initialEntries={['/razonamiento/verbal']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitForRealContent(container)
    expect(container.textContent).toContain('Reasoning')
    expect(container.textContent).not.toContain('Razonamiento')
    useLocaleStore.getState().setLocale('es')
  })

  it('field mcq: data-science renders in English without crashing', async () => {
    useLocaleStore.getState().setLocale('en')
    const { container } = await renderSuspended(
      <MemoryRouter initialEntries={['/campo/data-science']}>
        <Routes>
          <Route path="/campo/:fieldId" element={<FieldMcqPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitForRealContent(container)
    useLocaleStore.getState().setLocale('es')
  })
})
