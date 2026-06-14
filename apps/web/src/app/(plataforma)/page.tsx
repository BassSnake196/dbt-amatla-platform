import { auth } from '@/auth'
import { apiServer } from '@/lib/api-server'
import { HeroBienvenida } from '@/components/cursos/hero-bienvenida'
import { Descubrir } from '@/components/cursos/descubrir'
import { Catalogo } from '@/components/cursos/catalogo'
import { SesionesVivo } from '@/components/cursos/sesiones-vivo'
import { LineaAyuda } from '@/components/cursos/linea-ayuda'

// Portal del estudiante — catálogo estilo Udemy adaptado al modelo clínico:
// los cursos los asigna la terapeuta, no se compran. Datos reales via tRPC:
// cursos asignados via Enrollment + catálogo público "General" (publicados).
export default async function HomePage() {
  const session = await auth()
  const nombre = session?.user?.name ?? session?.user?.email ?? 'Estudiante'

  const api = await apiServer()
  const [{ enCurso, cursos, sesiones }, publicos] = await Promise.all([
    api.estudiante.dashboard(),
    api.catalogo.publicos(),
  ])

  // Progreso global ponderado por lecciones: cada curso pesa según su
  // número de lecciones, no en partes iguales.
  const totalLecc = cursos.reduce((suma, curso) => suma + curso.lecciones, 0)
  const progresoGlobal =
    totalLecc === 0
      ? 0
      : Math.round(cursos.reduce((suma, curso) => suma + curso.progreso * curso.lecciones, 0) / totalLecc)

  // Dedupe: no repetir en "Descubrir" los cursos en los que ya está inscrito.
  const idsInscritos = new Set(cursos.map((curso) => curso.id))
  const descubrir = publicos.filter((curso) => !idsInscritos.has(curso.id))

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {cursos.length > 0 ? (
        <>
          <HeroBienvenida nombre={nombre} progresoGlobal={progresoGlobal} enCurso={enCurso} />
          <Catalogo cursos={cursos} />
        </>
      ) : (
        <section className="rounded-card border border-borde bg-white p-6 md:p-10">
          <p className="text-eyebrow uppercase tracking-wider text-teal">Te damos la bienvenida</p>
          <h1 className="mt-2 text-display text-texto">Hola, {nombre}</h1>
          <p className="mt-3 text-body text-texto-suave">
            Explora los cursos abiertos y empieza tu entrenamiento cuando quieras.
          </p>
        </section>
      )}

      <Descubrir cursos={descubrir} />

      <SesionesVivo sesiones={sesiones} />
      <LineaAyuda />
    </div>
  )
}
