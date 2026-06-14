'use client'

// Catálogo público "General" — visible sin sesión. Cada card, al hacer clic:
//  - sin sesión: avisa y manda a iniciar sesión.
//  - con sesión: autoinscribe (idempotente) y abre el curso.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Clock3, Loader2, PlayCircle } from 'lucide-react'
import { formatearDuracion } from '@/lib/formato'
import { inscribirmeAction } from '@/acciones/catalogo'

interface CursoPublico {
  id: string
  titulo: string
  categoria: string
  instructora: string
  thumbnailUrl: string | null
  lecciones: number
  duracionSegundos: number
}

// Miniatura generativa por categoría: mismas paletas que las cards del
// catálogo privado, para mantener consistencia visual entre ambos.
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

function artePara(categoria: string): ArteCategoria {
  const conocido = ARTE_CONOCIDO[categoria]
  if (conocido) return conocido
  let hash = 0
  for (const caracter of categoria) hash = (hash * 31 + caracter.charCodeAt(0)) | 0
  return PALETAS[Math.abs(hash) % PALETAS.length]!
}

export function CatalogoPublico({
  cursos,
  sesionActiva,
}: {
  cursos: CursoPublico[]
  sesionActiva: boolean
}) {
  const router = useRouter()
  const [, iniciarTransicion] = useTransition()
  const [cargandoId, setCargandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function abrirCurso(curso: CursoPublico) {
    if (!sesionActiva) {
      window.alert('Inicia sesión con Google para ver este curso.')
      router.push('/iniciar-sesion')
      return
    }

    setError(null)
    setCargandoId(curso.id)
    iniciarTransicion(async () => {
      const { error: mensaje } = await inscribirmeAction(curso.id)
      if (mensaje) {
        setError(mensaje)
        setCargandoId(null)
        return
      }
      router.push(`/cursos/${curso.id}`)
    })
  }

  if (cursos.length === 0) {
    return (
      <div className="rounded-card bg-brand-surface p-10 text-center shadow-card">
        <p className="font-serif text-lg text-brand-dark">
          Aún no hay cursos públicos disponibles.
        </p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2 rounded-card bg-red-50 p-4 text-sm text-red-700 shadow-card"
        >
          <AlertCircle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cursos.map((curso) => {
          const arte = artePara(curso.categoria)
          const cargando = cargandoId === curso.id

          return (
            <button
              key={curso.id}
              type="button"
              onClick={() => abrirCurso(curso)}
              disabled={cargando}
              className="group flex flex-col overflow-hidden rounded-card bg-white text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary disabled:cursor-wait disabled:opacity-75"
            >
              {/* Miniatura: thumbnail real si existe, si no arte generativo */}
              <div
                className="relative flex h-36 items-end overflow-hidden p-4"
                style={curso.thumbnailUrl ? undefined : { background: arte.fondo }}
              >
                {curso.thumbnailUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={curso.thumbnailUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent"
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <span
                    className="pointer-events-none absolute -right-2 -top-9 select-none font-serif text-[9rem] leading-none transition-transform duration-300 group-hover:scale-105"
                    style={{ color: arte.psi }}
                    aria-hidden="true"
                  >
                    Ψ
                  </span>
                )}
                <span className="relative rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  {curso.categoria}
                </span>

                {cargando && (
                  <span className="absolute inset-0 flex items-center justify-center bg-brand-dark/40">
                    <Loader2 className="animate-spin text-white" size={28} aria-hidden="true" />
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
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
