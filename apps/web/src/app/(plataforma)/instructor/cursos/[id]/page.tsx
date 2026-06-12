import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'
import { EstructuraSecciones } from '@/components/instructor/estructura-secciones'
import { AccionesCurso } from '@/components/instructor/acciones-curso'

export const metadata = { title: 'Estructura del curso — DBT.Amatla' }

const ETIQUETA_STATUS = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
} as const

export default async function EstructuraCursoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await exigirInstructor()
  const { id } = await params

  const api = await apiServer()
  const curso = await api.cursos.obtener({ id }).catch(() => null)
  if (!curso) notFound()
  const secciones = await api.secciones.listar({ cursoId: id })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-secondary">
            {ETIQUETA_STATUS[curso.status]}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
            {curso.titulo}
          </h2>
          <p className="mt-1 text-sm text-neutral-900/60">
            Arrastra las secciones para reordenarlas. Las lecciones se gestionan dentro de cada
            sección.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Link
            href={`/instructor/cursos/${curso.id}/editar`}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-100 px-4 py-2 text-xs font-semibold text-brand-dark transition-colors hover:border-brand-secondary hover:text-brand-secondary"
          >
            <Pencil size={13} aria-hidden="true" />
            Editar datos
          </Link>
          <AccionesCurso cursoId={curso.id} status={curso.status} />
        </div>
      </div>

      <EstructuraSecciones
        cursoId={curso.id}
        secciones={secciones.map((s) => ({
          id: s.id,
          titulo: s.titulo,
          descripcion: s.descripcion,
          lecciones: s.lecciones.map((l) => ({
            id: l.id,
            titulo: l.titulo,
            tipo: l.tipo,
            duracion: l.duracion,
            esPreview: l.esPreview,
            tieneArchivo: l.tieneArchivo,
            tieneVideo: l.tieneVideo,
          })),
        }))}
      />
    </div>
  )
}
