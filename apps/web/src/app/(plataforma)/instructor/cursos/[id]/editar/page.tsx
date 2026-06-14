import { notFound } from 'next/navigation'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'
import { actualizarCursoAction } from '@/acciones/cursos'
import { CursoForm } from '@/components/instructor/curso-form'
import { SubirArchivo } from '@/components/instructor/subir-archivo'

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
      <section className="max-w-2xl space-y-3 rounded-card bg-white p-5 shadow-card">
        <h3 className="text-sm font-semibold text-brand-dark">Imagen del curso</h3>
        <div className="flex flex-wrap items-start gap-5">
          {curso.thumbnailUrl && (
            // La URL viene firmada on-demand (expira en 30 min) — no se cachea
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={curso.thumbnailUrl}
              alt={`Portada de ${curso.titulo}`}
              className="aspect-video w-56 rounded-[10px] border border-neutral-100 object-cover"
            />
          )}
          <div className="min-w-[16rem] flex-1 space-y-2">
            <SubirArchivo
              proposito="THUMBNAIL_CURSO"
              objetivoId={curso.id}
              accept=".jpg,.jpeg,.png"
              etiqueta={curso.thumbnailUrl ? 'Reemplazar imagen' : 'Subir imagen'}
              zona
            />
            <p className="max-w-xs text-xs text-neutral-900/50">
              JPG o PNG, máximo 10MB. Todo archivo pasa por un escaneo de seguridad antes de
              publicarse. Si no subes imagen, se usará una portada con las iniciales del curso.
            </p>
          </div>
        </div>
      </section>

      <CursoForm
        action={accionConId}
        textoBoton="Guardar cambios"
        valoresIniciales={{
          titulo: curso.titulo,
          descripcion: curso.descripcion,
          categoria: curso.categoria,
          esPublico: curso.esPublico,
        }}
      />
    </div>
  )
}
