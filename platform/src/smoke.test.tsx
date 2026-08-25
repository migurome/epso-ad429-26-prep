// Smoke tests: cada ruta principal debe montar sin lanzar excepciones.
// Existen porque un selector de zustand mal escrito (devolviendo un array
// nuevo en cada render, p. ej. `useProgressStore(s => s.testAttempts.filter(...))`)
// provocaba un bucle infinito de re-render ("Maximum update depth exceeded")
// que sólo se manifestaba en el navegador como pantalla en blanco al navegar.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ReasoningSkillPage } from './pages/ReasoningSkillPage'
import { FieldMcqPage } from './pages/FieldMcqPage'
import { EuftePage } from './pages/EuftePage'
import { ProgressPage } from './pages/ProgressPage'
import { useLocaleStore } from './lib/localeStore'

describe('pages render without crashing', () => {
  it('reasoning: verbal', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/razonamiento/verbal']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBeTruthy()
  })

  it('reasoning: numerical', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/razonamiento/numerical']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBeTruthy()
  })

  it('reasoning: abstract', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/razonamiento/abstract']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBeTruthy()
  })

  it('field mcq: data-science', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/campo/data-science']}>
        <Routes>
          <Route path="/campo/:fieldId" element={<FieldMcqPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBeTruthy()
  })

  it('eufte', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/eufte']}>
        <EuftePage />
      </MemoryRouter>,
    )
    expect(container.textContent).toBeTruthy()
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
  it('reasoning: verbal renders in English without crashing', () => {
    useLocaleStore.getState().setLocale('en')
    const { container } = render(
      <MemoryRouter initialEntries={['/razonamiento/verbal']}>
        <Routes>
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toContain('Reasoning')
    expect(container.textContent).not.toContain('Razonamiento')
    useLocaleStore.getState().setLocale('es')
  })

  it('field mcq: data-science renders in English without crashing', () => {
    useLocaleStore.getState().setLocale('en')
    const { container } = render(
      <MemoryRouter initialEntries={['/campo/data-science']}>
        <Routes>
          <Route path="/campo/:fieldId" element={<FieldMcqPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBeTruthy()
    useLocaleStore.getState().setLocale('es')
  })
})
