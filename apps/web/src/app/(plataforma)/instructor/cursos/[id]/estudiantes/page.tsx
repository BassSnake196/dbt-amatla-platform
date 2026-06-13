import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'
import { GestionEstudiantes } from '@/components/instructor/gestion-estudiantes'

export const metadata = { title: 'Estudiantes del curso — DBT.Amatla' }

// Asignación de curso completo a estudiantes (Fase 4). El acceso/ownership lo
// valida el resolver (curso propio o SUPER_ADMIN) → 404 si no es tuyo.
export default async function EstudiantesCursoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await exigirInstructor()
  const { id } = await params

  const api = await apiServer()
  const curso = await api.cursos.obtener({ id }).catch(() => null)
  if (!curso) notFound()
  const { asignados, disponibles } = await api.inscripciones.estudiantesCurso({ cursoId: id })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/instructor/cursos/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary transition-colors hover:text-brand-dark"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Estructura del curso
        </Link>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          Estudiantes
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">
          Asigna este curso a tus estudiantes. Al asignarlo, lo verán en su portal de inmediato.
        </p>
      </div>

      <GestionEstudiantes
        cursoId={id}
        asignados={asignados.map((a) => ({
          studentId: a.studentId,
          nombre: a.nombre,
          email: a.email,
          asignadoEl: a.asignadoEl.toISOString(),
        }))}
        disponibles={disponibles}
      />
    </div>
  )
}
