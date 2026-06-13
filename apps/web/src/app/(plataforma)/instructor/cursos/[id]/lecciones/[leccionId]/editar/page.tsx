import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'
import { EditorContenido } from '@/components/instructor/editor-contenido'

export const metadata = { title: 'Editar contenido — DBT.Amatla' }

// Editor de contenido de lecciones TEXT. obtenerContenido valida ownership +
// que la lección sea TEXT (404 si no es del instructor; error si no es texto).
export default async function EditarContenidoPage({
  params,
}: {
  params: Promise<{ id: string; leccionId: string }>
}) {
  await exigirInstructor()
  const { id, leccionId } = await params

  const api = await apiServer()
  const leccion = await api.lecciones.obtenerContenido({ id: leccionId }).catch(() => null)
  if (!leccion) notFound()

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
          {leccion.titulo}
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">
          Redacta el contenido de esta lección. El formato se guarda y el estudiante lo verá tal cual.
        </p>
      </div>

      <EditorContenido cursoId={id} leccionId={leccion.id} contenidoInicial={leccion.contenido} />
    </div>
  )
}
