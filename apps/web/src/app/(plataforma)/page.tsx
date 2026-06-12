import { HeroContinuar } from '@/components/cursos/hero-continuar'
import { Catalogo } from '@/components/cursos/catalogo'
import { SesionesVivo } from '@/components/cursos/sesiones-vivo'
import { LineaAyuda } from '@/components/cursos/linea-ayuda'

// Portal del estudiante — catálogo estilo Udemy adaptado al modelo clínico:
// los cursos los asigna la terapeuta, no se compran.
export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <HeroContinuar />
      <Catalogo />
      <SesionesVivo />
      <LineaAyuda />
    </div>
  )
}
