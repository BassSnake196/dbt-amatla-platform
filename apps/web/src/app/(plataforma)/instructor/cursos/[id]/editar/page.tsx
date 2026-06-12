import { notFound } from 'next/navigation'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'
import { actualizarCursoAction } from '@/acciones/cursos'
import { CursoForm } from '@/components/instructor/curso-form'

export const metadata = { title: 'Editar curso — DBT.Amatla' }

export default async function EditarCursoPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirInstructor()
  const { id } = await params

  const api = await apiServer()
  const curso = await api.cursos.obtener({ id }).catch(() => null)
  if (!curso) notFound()

  const accionConId = actualizarCursoAction.bind(null, curso.id)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          Editar curso
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">{curso.titulo}</p>
      </div>
      <CursoForm
        action={accionConId}
        textoBoton="Guardar cambios"
        valoresIniciales={{
          titulo: curso.titulo,
          descripcion: curso.descripcion,
          categoria: curso.categoria,
        }}
      />
    </div>
  )
}
