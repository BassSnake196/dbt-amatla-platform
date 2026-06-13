import { notFound } from 'next/navigation'
import { FileText, MonitorPlay, NotebookText } from 'lucide-react'
import { apiServer } from '@/lib/api-server'
import { formatearDuracion } from '@/lib/formato'

export const metadata = { title: 'Lección — DBT.Amatla' }

// Página de lección del estudiante. El acceso lo valida estudiante.leccion
// (Enrollment + sección accesible o preview): lección bloqueada → 404 sin
// revelar nada. El contenido real (video HLS firmado / visor PDF) se conecta
// en la tarea del reproductor — aquí queda el marco listo.
export default async function LeccionPage({
  params,
}: {
  params: Promise<{ id: string; leccionId: string }>
}) {
  const { id, leccionId } = await params

  const api = await apiServer()
  const leccion = await api.estudiante.leccion({ id: leccionId }).catch(() => null)
  // 404 también si la lección existe pero pertenece a otro curso (URL cruzada)
  if (!leccion || leccion.curso.id !== id) notFound()

  return (
    <article className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-secondary">
          {leccion.seccionTitulo}
        </p>
        <h3 className="mt-1 font-serif text-xl font-semibold text-brand-dark md:text-2xl">
          {leccion.titulo}
        </h3>
        {leccion.duracion !== null && leccion.duracion > 0 && (
          <p className="mt-1 text-xs text-neutral-900/55">{formatearDuracion(leccion.duracion)}</p>
        )}
      </header>

      {leccion.tipo === 'VIDEO' && (
        <div className="flex aspect-video w-full items-center justify-center rounded-card bg-black text-center">
          <div className="px-6 text-white/70">
            <MonitorPlay size={32} className="mx-auto" aria-hidden="true" />
            <p className="mt-3 text-sm">
              El reproductor de video estará disponible muy pronto.
            </p>
          </div>
        </div>
      )}

      {leccion.tipo === 'PDF' && (
        <div className="flex min-h-64 items-center justify-center rounded-card bg-white p-10 text-center shadow-card">
          <div className="text-neutral-900/60">
            <FileText size={32} className="mx-auto text-brand-secondary" aria-hidden="true" />
            <p className="mt-3 text-sm">El visor de materiales estará disponible muy pronto.</p>
          </div>
        </div>
      )}

      {(leccion.tipo === 'TEXT' || leccion.tipo === 'QUIZ') && (
        <div className="flex min-h-64 items-center justify-center rounded-card bg-brand-surface p-10 text-center shadow-card">
          <div className="text-neutral-900/60">
            <NotebookText size={32} className="mx-auto text-brand-secondary" aria-hidden="true" />
            <p className="mt-3 text-sm">El contenido de esta lección estará disponible muy pronto.</p>
          </div>
        </div>
      )}
    </article>
  )
}
