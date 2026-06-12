import { Clock3, PlayCircle, Star, CheckCircle2 } from 'lucide-react'
import type { CursoMock } from '@/lib/cursos-mock'

// Miniatura generativa por categoría: gradientes de marca + Ψ serif como marca de agua.
// Vida visual sin depender de imágenes subidas (llegan con R2 en Fase 2).
const ARTE_CATEGORIA: Record<CursoMock['categoria'], { fondo: string; psi: string }> = {
  'Regulación emocional': {
    fondo: 'linear-gradient(135deg, #2E7D6B 0%, #1A3A35 85%)',
    psi: 'rgba(245, 166, 35, 0.35)',
  },
  'RO-DBT': {
    fondo: 'linear-gradient(135deg, #F5A623 0%, #DC8A10 90%)',
    psi: 'rgba(26, 58, 53, 0.30)',
  },
  Mindfulness: {
    fondo: 'linear-gradient(135deg, #F9EDD5 0%, #EDD9B4 90%)',
    psi: 'rgba(46, 125, 107, 0.35)',
  },
  'Habilidades TIP': {
    fondo: 'linear-gradient(135deg, #1A3A35 0%, #2E7D6B 90%)',
    psi: 'rgba(249, 237, 213, 0.30)',
  },
}

export function CursoCard({ curso }: { curso: CursoMock }) {
  const arte = ARTE_CATEGORIA[curso.categoria]
  const completado = curso.progreso === 100

  return (
    <article className="group flex flex-col overflow-hidden rounded-card bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {/* Miniatura generativa */}
      <div
        className="relative flex h-36 items-end overflow-hidden p-4"
        style={{ background: arte.fondo }}
        aria-hidden="true"
      >
        <span
          className="pointer-events-none absolute -right-2 -top-9 select-none font-serif text-[9rem] leading-none transition-transform duration-300 group-hover:scale-105"
          style={{ color: arte.psi }}
        >
          Ψ
        </span>
        <span className="relative rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {curso.categoria}
        </span>
        {curso.nuevo && (
          <span className="absolute right-3 top-3 rounded-full bg-brand-primary px-2.5 py-0.5 text-[11px] font-bold text-brand-dark">
            Nuevo
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h4 className="font-serif text-base font-semibold leading-snug text-brand-dark">
          {curso.titulo}
        </h4>
        <p className="mt-1 text-xs text-neutral-900/60">{curso.instructora}</p>

        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span className="font-semibold text-brand-dark">{curso.rating.toFixed(1)}</span>
          <span className="flex text-brand-primary" aria-label={`Valoración ${curso.rating} de 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={12}
                fill={i < Math.round(curso.rating) ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className="text-neutral-900/50">({curso.votos})</span>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-neutral-900/60">
          <span className="inline-flex items-center gap-1">
            <PlayCircle size={13} aria-hidden="true" /> {curso.lecciones} lecciones
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} aria-hidden="true" /> {curso.duracionHoras} h
          </span>
        </div>

        {/* Estado al pie: progreso o completado */}
        <div className="mt-auto pt-4">
          {completado ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary">
              <CheckCircle2 size={15} aria-hidden="true" /> Completado · Certificado disponible
            </p>
          ) : (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${curso.progreso}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-neutral-900/60">
                {curso.progreso === 0 ? 'Sin comenzar' : `${curso.progreso}% completado`}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
