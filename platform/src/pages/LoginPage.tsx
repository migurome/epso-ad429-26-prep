import { LoginForm } from '../components/LoginForm'
import { signIn, signUp } from '../lib/accountEngine'

// El cableado del formulario de acceso con la sesión de verdad. Lo visible, y
// todo lo que se puede probar, está en `components/LoginForm.tsx`.
export function LoginPage() {
  return <LoginForm onSignIn={signIn} onSignUp={signUp} />
}
