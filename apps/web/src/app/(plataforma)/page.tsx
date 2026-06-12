import { apiServer } from '@/lib/api-server'
import { HeroContinuar } from '@/components/cursos/hero-continuar'
import { Catalogo } from '@/components/cursos/catalogo'
import { SesionesVivo } from '@/components/cursos/sesiones-vivo'
import { LineaAyuda } from '@/components/cursos/linea-ayuda'

// Portal del estudiante — catálogo estilo Udemy adaptado al modelo clínico:
// los cursos los asigna la terapeuta, no se compran. Datos reales via tRPC:
// solo cursos asignados via Enrollment y publicados (RBAC en el resolver).
export default async function HomePage() {
  const api = await apiServer()
  const { enCurso, cursos, sesiones } = await api.estudiante.dashboard()

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {enCurso && <HeroContinuar enCurso={enCurso} />}
      <Catalogo cursos={cursos} />
      <SesionesVivo sesiones={sesiones} />
      <LineaAyuda />
    </div>
  )
}
