import { Cargando } from '@/components/layout/cargando'

// Fallback de carga para TODA la plataforma: se muestra al instante en cada
// navegación mientras el server component de la página resuelve sus datos.
// Las rutas con necesidades específicas pueden tener su propio loading.tsx.
export default function Loading() {
  return <Cargando />
}
