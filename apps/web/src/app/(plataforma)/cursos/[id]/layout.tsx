import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { obtenerCursoEstudiante } from '@/lib/curso-estudiante'
import { IndiceCurso } from '@/components/cursos/indice-curso'

// Vista de curso del estudiante: cabecera con progreso + índice lateral
// compartido entre el resumen y las páginas de lección. El acceso lo valida
// el resolver (Enrollment + PUBLISHED): sin asignación → 404.
export default async function CursoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const curso = await obtenerCursoEstudiante(id)
  if (!curso) notFound()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-secondary transition-colors hover:text-brand-dark hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Mis cursos
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-secondary">
              {curso.categoria}
            </p>
            <h2 className="mt-1 font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
              {curso.titulo}
            </h2>
            <p className="mt-1 text-sm text-neutral-900/60">{curso.instructora}</p>
          </div>
          <div className="w-full md:w-72">
            <div className="flex items-baseline justify-between text-xs text-neutral-900/60">
              <span>
                {curso.leccionesCompletadas} de {curso.leccionesTotales} lecciones
              </span>
              <span className="font-semibold text-brand-dark">{curso.progreso}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={curso.progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso del curso"
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#d9d3c9]"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-[400ms] ease-out ${
                  curso.progreso === 100 ? 'bg-brand-secondary' : 'bg-brand-primary'
                }`}
                style={{ width: `${curso.progreso}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <IndiceCurso cursoId={curso.id} secciones={curso.secciones} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
