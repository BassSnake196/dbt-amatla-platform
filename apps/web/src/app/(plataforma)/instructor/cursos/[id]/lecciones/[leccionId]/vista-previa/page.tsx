import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlignLeft, ArrowLeft, Eye, FileText, Video } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'

export const metadata = { title: 'Vista previa de lección — DBT.Amatla' }

const ETIQUETA_TIPO = {
  VIDEO: 'Video',
  PDF: 'PDF',
  TEXT: 'Texto',
  QUIZ: 'Cuestionario',
} as const

/** 754 → "12:34"; 3725 → "1:02:05". */
function formatearDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export default async function VistaPreviaLeccionPage({
  params,
}: {
  params: Promise<{ id: string; leccionId: string }>
}) {
  await exigirInstructor()
  const { id, leccionId } = await params

  const api = await apiServer()
  const leccion = await api.lecciones.preview({ id: leccionId }).catch(() => null)
  // El curso de la URL debe coincidir — no servir lecciones bajo rutas ajenas
  if (!leccion || leccion.curso.id !== id) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/instructor/cursos/${leccion.curso.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary hover:underline"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          {leccion.curso.titulo}
        </Link>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          {leccion.titulo}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-900/60">
          <span>{leccion.seccionTitulo}</span>
          <span className="font-semibold text-brand-secondary">{ETIQUETA_TIPO[leccion.tipo]}</span>
          {leccion.duracion !== null && <span>{formatearDuracion(leccion.duracion)}</span>}
          {leccion.esPreview && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-brand-primary">
              <Eye size={11} aria-hidden="true" /> Lección de muestra
            </span>
          )}
        </p>
      </div>

      <p className="rounded-card bg-brand-surface px-4 py-3 text-xs text-brand-dark/80">
        Así verá esta lección el estudiante. Los enlaces de reproducción expiran en 30 minutos —
        recarga la página si caducan.
      </p>

      {leccion.tipo === 'VIDEO' &&
        (leccion.urlVideo ? (
          <video
            controls
            src={leccion.urlVideo}
            className="aspect-video w-full rounded-card bg-black"
          />
        ) : (
          <EstadoVacio
            icono={<Video size={20} aria-hidden="true" />}
            mensaje="Aún no hay video cargado en esta lección. Súbelo desde la estructura del curso."
          />
        ))}

      {leccion.tipo === 'PDF' &&
        (leccion.urlPdf ? (
          <iframe
            src={leccion.urlPdf}
            title={`PDF de ${leccion.titulo}`}
            className="h-[75vh] w-full rounded-card border border-neutral-100 bg-white"
          />
        ) : (
          <EstadoVacio
            icono={<FileText size={20} aria-hidden="true" />}
            mensaje="Aún no hay PDF cargado en esta lección. Súbelo desde la estructura del curso."
          />
        ))}

      {leccion.tipo === 'TEXT' && (
        <EstadoVacio
          icono={<AlignLeft size={20} aria-hidden="true" />}
          mensaje="El editor de contenido para lecciones de texto llega en una tarea posterior."
        />
      )}
    </div>
  )
}

function EstadoVacio({ icono, mensaje }: { icono: React.ReactNode; mensaje: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-neutral-100 bg-neutral-50 px-6 py-12 text-center text-sm text-neutral-900/60">
      <span className="text-brand-secondary">{icono}</span>
      {mensaje}
    </div>
  )
}
