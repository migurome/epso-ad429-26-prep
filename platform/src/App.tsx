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
import { CoursePage } from './pages/CoursePage'
import { CourseModulePage } from './pages/CourseModulePage'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import { SelfCheckPage } from './pages/SelfCheckPage'
import { LoginPage } from './pages/LoginPage'
import { useAuthStore } from './lib/authStore'

function App() {
  // Sin sesión no se monta nada más: ni el armazón, ni las rutas, ni los
  // bloques de contenido que cuelgan de ellas.
  const user = useAuthStore((s) => s.user)
  if (!user) return <LoginPage />

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/razonamiento" element={<ReasoningOverview />} />
          <Route path="/razonamiento/:skillId" element={<ReasoningSkillPage />} />
          <Route path="/campo" element={<FieldMcqOverview />} />
          <Route path="/campo/:fieldId" element={<FieldMcqPage />} />
          <Route path="/formacion" element={<CoursePage />} />
          <Route path="/formacion/:moduleId" element={<CourseModulePage />} />
          <Route path="/eufte" element={<EuftePage />} />
          <Route path="/dia-del-examen" element={<TestDayPage />} />
          <Route path="/recursos" element={<ResourcesPage />} />
          <Route path="/progreso" element={<ProgressPage />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="/verificacion" element={<SelfCheckPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
