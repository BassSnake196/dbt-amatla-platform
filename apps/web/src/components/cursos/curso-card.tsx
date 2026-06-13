import Link from 'next/link'
import { Clock3, PlayCircle, CheckCircle2 } from 'lucide-react'
import type { CursoAsignado } from '@/lib/tipos-estudiante'
import { formatearDuracion } from '@/lib/formato'

// Miniatura generativa por categoría: gradientes de marca + Ψ serif como marca
// de agua. Vida visual sin depender del thumbnail (que llega en la vista de curso).
interface ArteCategoria {
  fondo: string
  psi: string
}

const PALETAS: ArteCategoria[] = [
  { fondo: 'linear-gradient(135deg, #2E7D6B 0%, #1A3A35 85%)', psi: 'rgba(245, 166, 35, 0.35)' },
  { fondo: 'linear-gradient(135deg, #F5A623 0%, #DC8A10 90%)', psi: 'rgba(26, 58, 53, 0.30)' },
  { fondo: 'linear-gradient(135deg, #F9EDD5 0%, #EDD9B4 90%)', psi: 'rgba(46, 125, 107, 0.35)' },
  { fondo: 'linear-gradient(135deg, #1A3A35 0%, #2E7D6B 90%)', psi: 'rgba(249, 237, 213, 0.30)' },
]

const ARTE_CONOCIDO: Record<string, ArteCategoria> = {
  'Regulación emocional': PALETAS[0]!,
  'RO-DBT': PALETAS[1]!,
  Mindfulness: PALETAS[2]!,
  'Habilidades TIP': PALETAS[3]!,
}

// La categoría es texto libre del instructor: las conocidas conservan su arte,
// las nuevas reciben una paleta estable derivada del nombre (mismo arte siempre).
function artePara(categoria: string): ArteCategoria {
  const conocido = ARTE_CONOCIDO[categoria]
  if (conocido) return conocido
  let hash = 0
  for (const caracter of categoria) hash = (hash * 31 + caracter.charCodeAt(0)) | 0
  return PALETAS[Math.abs(hash) % PALETAS.length]!
}

export function CursoCard({ curso }: { curso: CursoAsignado }) {
  const arte = artePara(curso.categoria)
  const completado = curso.progreso === 100

  return (
    <Link
      href={`/cursos/${curso.id}`}
      className="group flex flex-col overflow-hidden rounded-card bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
    >
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

        <div className="mt-2 flex items-center gap-3 text-xs text-neutral-900/60">
          <span className="inline-flex items-center gap-1">
            <PlayCircle size={13} aria-hidden="true" /> {curso.lecciones}{' '}
            {curso.lecciones === 1 ? 'lección' : 'lecciones'}
          </span>
          {curso.duracionSegundos > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock3 size={13} aria-hidden="true" /> {formatearDuracion(curso.duracionSegundos)}
            </span>
          )}
        </div>

        {/* Estado al pie: progreso o completado */}
        <div className="mt-auto pt-4">
          {completado ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary">
              <CheckCircle2 size={15} aria-hidden="true" /> Curso completado
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
    </Link>
  )
}
