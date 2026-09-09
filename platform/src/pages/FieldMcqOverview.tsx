import { Navigate } from 'react-router-dom'
import { usePreferredField } from '../lib/studyStore'

// Había aquí una portada con una tarjeta por ámbito de la convocatoria. Ya no:
// el candidato se presenta por uno solo, lo elige en Ajustes, y los demás eran
// material que nunca va a examinar ocupando el sitio del que sí. Sin nada que
// elegir, la portada era un clic de más, así que /campo lleva directamente al
// ámbito elegido.
export function FieldMcqOverview() {
  const field = usePreferredField()
  return <Navigate to={`/campo/${field}`} replace />
}
