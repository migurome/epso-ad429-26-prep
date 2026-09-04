import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { ReasoningOverview } from './pages/ReasoningOverview'
import { ReasoningSkillPage } from './pages/ReasoningSkillPage'
import { FieldMcqOverview } from './pages/FieldMcqOverview'
import { FieldMcqPage } from './pages/FieldMcqPage'
import { EuftePage } from './pages/EuftePage'
import { TestDayPage } from './pages/TestDayPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { ProgressPage } from './pages/ProgressPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/razonamiento" element={<ReasoningOverview />} />
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
          <Route path="/campo" element={<FieldMcqOverview />} />
          <Route path="/campo/:fieldId" element={<FieldMcqPage />} />
          <Route path="/eufte" element={<EuftePage />} />
          <Route path="/dia-del-examen" element={<TestDayPage />} />
          <Route path="/recursos" element={<ResourcesPage />} />
          <Route path="/progreso" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
