import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Play } from 'lucide-react'
import { obtenerCursoEstudiante } from '@/lib/curso-estudiante'

export const metadata = { title: 'Curso — DBT.Amatla' }

// Resumen del curso: descripción + retomar donde se quedó.
export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const curso = await obtenerCursoEstudiante(id)
  if (!curso) notFound()

  // Lección por la que continuar: primera no completada con acceso
  const siguiente = curso.secciones
    .flatMap((s) => s.lecciones)
    .find((l) => l.estado === 'EN_PROGRESO' || l.estado === 'PENDIENTE')
  const completado = curso.progreso === 100

  return (
    <div className="space-y-6">
      <section className="rounded-card bg-white p-6 shadow-card md:p-8">
        <h3 className="font-serif text-lg font-semibold text-brand-dark">Sobre este curso</h3>
        {curso.presentacion ? (
          <div
            className="contenido-rico mt-3 text-sm leading-relaxed text-neutral-900/75"
            // El HTML viene sanitizado en BD y con las imágenes ya re-firmadas
            dangerouslySetInnerHTML={{ __html: curso.presentacion }}
          />
        ) : (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-900/75">
            {curso.descripcion}
          </p>
        )}

        <div className="mt-6">
          {completado ? (
            <p className="text-sm font-semibold text-brand-secondary">
              Completaste este curso. Puedes repasar cualquier lección desde el índice.
            </p>
          ) : siguiente ? (
            <Link
              href={`/cursos/${curso.id}/lecciones/${siguiente.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-dark transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <Play size={16} fill="currentColor" aria-hidden="true" />
              {curso.progreso === 0 ? 'Comenzar el curso' : 'Continuar donde me quedé'}
            </Link>
          ) : (
            <p className="text-sm text-neutral-900/60">
              Las lecciones de este curso aún no están disponibles para ti. Si crees que es un
              error, coméntalo con tu terapeuta.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
