import { LoginForm } from '../components/LoginForm'
import { signIn, signUp } from '../lib/accountEngine'
import { accessRows } from '../lib/accessApi'

// El cableado del formulario de acceso con la sesión de verdad y con la cola de
// solicitudes. Lo visible, y todo lo que se puede probar, está en
// `components/LoginForm.tsx`.
const rows = accessRows()

export function LoginPage() {
  return <LoginForm onSignIn={signIn} onSignUp={signUp} onRequest={(email) => rows.ask(email)} />
}
