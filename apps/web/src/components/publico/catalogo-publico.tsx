'use client'

// Catálogo público "General" — visible sin sesión. Cada card, al hacer clic:
//  - sin sesión: avisa y manda a iniciar sesión.
//  - con sesión: autoinscribe (idempotente) y abre el curso.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, Clock3, Loader2, PlayCircle, Sparkles, X } from 'lucide-react'
import { formatearDuracion } from '@/lib/formato'
import { inscribirmeAction } from '@/acciones/catalogo'

export interface CursoPublico {
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
  destacado = false,
}: {
  cursos: CursoPublico[]
  sesionActiva: boolean
  /** Resalta el primer curso como hero card sobre el grid (página Explorar). */
  destacado?: boolean
}) {
  const router = useRouter()
  const [, iniciarTransicion] = useTransition()
  const [cargandoId, setCargandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avisoLogin, setAvisoLogin] = useState(false)

  function abrirCurso(curso: CursoPublico) {
    if (!sesionActiva) {
      setAvisoLogin(true)
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

  // Hero card del curso destacado (Explorar): el primero del catálogo filtrado.
  const cursoHero = destacado ? cursos[0] : undefined
  const cursosGrid = cursoHero ? cursos.slice(1) : cursos

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

      {cursoHero && (
        <HeroCardCurso
          curso={cursoHero}
          cargando={cargandoId === cursoHero.id}
          onAbrir={() => abrirCurso(cursoHero)}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cursosGrid.map((curso) => {
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

      {avisoLogin && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 p-4"
          onClick={() => setAvisoLogin(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-card border border-borde bg-white p-6 text-center md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAvisoLogin(false)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 text-texto-suave transition-colors hover:text-texto"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-naranja-suave text-naranja">
              <Sparkles size={22} aria-hidden="true" />
            </div>

            <h3 className="mt-4 text-heading text-texto">Crea tu cuenta para empezar</h3>
            <p className="mt-2 text-body text-texto-suave">
              Este curso es parte del espacio de habilidades DBT.Amatla. Inicia sesión para
              guardarlo en tu plataforma y seguir tu progreso.
            </p>

            <button
              type="button"
              onClick={() => router.push('/iniciar-sesion')}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-naranja px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Continuar con Google
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Hero card del curso destacado (Explorar): imagen ancha + info y CTA naranja.
function HeroCardCurso({
  curso,
  cargando,
  onAbrir,
}: {
  curso: CursoPublico
  cargando: boolean
  onAbrir: () => void
}) {
  const arte = artePara(curso.categoria)

  return (
    <div className="mb-8 grid gap-7 rounded-2xl border border-borde bg-white p-5 md:grid-cols-2 md:p-7">
      {/* Imagen 16:9 — thumbnail real o arte generativo */}
      <div
        className="relative aspect-video overflow-hidden rounded-[10px]"
        style={curso.thumbnailUrl ? undefined : { background: arte.fondo }}
      >
        {curso.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={curso.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="pointer-events-none absolute -right-4 -top-10 select-none font-serif text-[12rem] leading-none"
            style={{ color: arte.psi }}
            aria-hidden="true"
          >
            Ψ
          </span>
        )}
      </div>

      <div className="flex flex-col justify-center">
        <span className="w-fit rounded-md bg-teal-suave px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal">
          Te puede interesar
        </span>
        <h2 className="mt-3 font-serif text-xl font-bold leading-snug text-brand-dark md:text-2xl">
          {curso.titulo}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-texto-suave">
          <span>{curso.instructora}</span>
          <span aria-hidden="true">·</span>
          <span>
            {curso.lecciones} {curso.lecciones === 1 ? 'lección' : 'lecciones'}
          </span>
          {curso.duracionSegundos > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatearDuracion(curso.duracionSegundos)}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onAbrir}
          disabled={cargando}
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-naranja px-6 py-3 text-sm font-semibold text-brand-dark transition-all hover:-translate-y-px hover:bg-[#e09610] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          {cargando ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight size={16} aria-hidden="true" />
          )}
          Comenzar curso
        </button>
      </div>
    </div>
  )
}
