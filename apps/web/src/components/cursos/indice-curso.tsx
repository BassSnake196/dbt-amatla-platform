'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, CheckCircle2, ChevronDown, Circle, Lock, PlayCircle } from 'lucide-react'
import type { SeccionEstudiante, LeccionIndice } from '@/lib/tipos-estudiante'
import { formatearDuracion } from '@/lib/formato'

// Índice del curso (sidebar): secciones colapsables con estado por lección.
// Las lecciones 🔒 llegan del server ya enmascaradas (título recortado, sin
// duración) y NO son navegables — el candado real lo pone el resolver.

function IconoEstado({
  estado,
  navegable,
  activa,
}: {
  estado: LeccionIndice['estado']
  navegable: boolean
  activa: boolean
}) {
  if (estado === 'COMPLETADA')
    return <CheckCircle2 size={18} className="shrink-0 text-brand-secondary" aria-hidden="true" />
  if (activa)
    return <PlayCircle size={18} className="shrink-0 text-brand-primary" aria-hidden="true" />
  if (estado === 'EN_PROGRESO')
    return <PlayCircle size={18} className="shrink-0 text-brand-primary" aria-hidden="true" />
  // No navegable: sin acceso (ModuleAccess) o bloqueada por progreso secuencial
  if (!navegable)
    return <Lock size={14} className="shrink-0 text-[#b0a99f]" aria-hidden="true" />
  return <Circle size={18} className="shrink-0 text-neutral-900/25" aria-hidden="true" />
}

const ETIQUETA_ESTADO: Record<LeccionIndice['estado'], string> = {
  COMPLETADA: 'completada',
  EN_PROGRESO: 'en progreso',
  PENDIENTE: 'pendiente',
  BLOQUEADA: 'bloqueada',
}

export function IndiceCurso({
  cursoId,
  secciones,
}: {
  cursoId: string
  secciones: SeccionEstudiante[]
}) {
  const pathname = usePathname()
  // Secciones accesibles abiertas; las bloqueadas inician colapsadas
  const [abiertas, setAbiertas] = useState<Set<string>>(
    () => new Set(secciones.filter((s) => s.accesible).map((s) => s.id)),
  )

  function alternar(id: string) {
    setAbiertas((previas) => {
      const siguientes = new Set(previas)
      if (siguientes.has(id)) siguientes.delete(id)
      else siguientes.add(id)
      return siguientes
    })
  }

  return (
    <nav aria-label="Contenido del curso" className="rounded-card bg-white p-3 shadow-card">
      <p className="flex items-center gap-2 px-2 pb-3 pt-1 text-eyebrow uppercase tracking-wider text-brand-dark">
        <BookOpen size={14} className="text-brand-secondary" aria-hidden="true" />
        Contenido del curso
      </p>

      <ul className="space-y-1">
        {secciones.map((seccion) => {
          const abierta = abiertas.has(seccion.id)
          return (
            <li key={seccion.id}>
              <button
                type="button"
                onClick={() => alternar(seccion.id)}
                aria-expanded={abierta}
                className="flex w-full items-center gap-2 rounded-lg bg-[#f0ede8] px-4 py-3 text-left transition-colors hover:bg-[#e8e3d9]"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[0.02em] text-brand-dark">
                  {seccion.titulo}
                </span>
                {!seccion.accesible && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-medium text-neutral-900/60">
                    <Lock size={10} aria-hidden="true" /> Sin acceso
                  </span>
                )}
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-brand-dark/50 transition-transform duration-200 ${abierta ? '' : '-rotate-90'}`}
                  aria-hidden="true"
                />
              </button>

              {abierta && (
                <ul className="mt-1 space-y-0.5 pb-1">
                  {seccion.lecciones.map((leccion) => {
                    const href = `/cursos/${cursoId}/lecciones/${leccion.id}`
                    const activa = pathname === href
                    const completada = leccion.estado === 'COMPLETADA'
                    const sinAcceso = leccion.estado === 'BLOQUEADA' // ModuleAccess: título enmascarado
                    const bloqueada = !leccion.navegable // sin acceso O bloqueo secuencial → no abrible

                    // Clases por estado (D3): activa > completada > base, locked aparte
                    const claseEstado = activa
                      ? 'bg-naranja-suave border-l-[3px] border-brand-primary pl-[17px] font-semibold text-[#b07d10]'
                      : completada
                        ? 'bg-teal-suave text-brand-secondary hover:bg-teal-suave'
                        : 'text-neutral-900/80 hover:bg-crema-hover'

                    const contenido = (
                      <>
                        <IconoEstado
                          estado={leccion.estado}
                          navegable={leccion.navegable}
                          activa={activa}
                        />
                        <span
                          className={`min-w-0 flex-1 truncate ${sinAcceso ? 'italic' : ''}`}
                        >
                          {leccion.titulo}
                        </span>
                        <span className="sr-only">({ETIQUETA_ESTADO[leccion.estado]})</span>
                        {leccion.duracion !== null && leccion.duracion > 0 && (
                          <span
                            className={`shrink-0 text-xs ${activa ? 'text-[#b07d10]/70' : completada ? 'text-brand-secondary/70' : 'text-[#9b9590]'}`}
                          >
                            {formatearDuracion(leccion.duracion)}
                          </span>
                        )}
                      </>
                    )

                    if (bloqueada) {
                      return (
                        <li key={leccion.id}>
                          <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-5 py-2.5 text-sm text-[#b0a99f]">
                            {contenido}
                          </div>
                        </li>
                      )
                    }

                    return (
                      <li key={leccion.id}>
                        <Link
                          href={href}
                          aria-current={activa ? 'page' : undefined}
                          className={`flex items-center gap-2.5 rounded-lg px-5 py-2.5 text-sm transition-colors ${claseEstado}`}
                        >
                          {contenido}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
