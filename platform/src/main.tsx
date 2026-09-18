import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startAccountWatch } from './lib/accountEngine'

// La vigilancia de la sesión se arranca aquí, y no dentro de `App`, por dos
// razones. La primera es que es cosa del arranque del programa y no de un
// componente: es global, dura toda la vida de la página y no se desmonta. La
// segunda es que así `App` queda como una función pura de lo que hay en el
// almacén —dada una fase, esta pantalla—, y eso se puede probar fijando el
// almacén, sin que un efecto salga a preguntarle a Supabase por detrás.
startAccountWatch()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
