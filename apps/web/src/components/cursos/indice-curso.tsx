'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckCircle2, ChevronDown, Circle, Lock, PlayCircle } from 'lucide-react'
import type { SeccionEstudiante, LeccionIndice } from '@/lib/tipos-estudiante'
import { formatearDuracion } from '@/lib/formato'

// Índice del curso (sidebar): secciones colapsables con estado por lección.
// Las lecciones 🔒 llegan del server ya enmascaradas (título recortado, sin
// duración) y NO son navegables — el candado real lo pone el resolver.

function IconoEstado({ estado, navegable }: { estado: LeccionIndice['estado']; navegable: boolean }) {
  if (estado === 'COMPLETADA')
    return <CheckCircle2 size={16} className="shrink-0 text-brand-secondary" aria-hidden="true" />
  if (estado === 'EN_PROGRESO')
    return <PlayCircle size={16} className="shrink-0 text-brand-primary" aria-hidden="true" />
  // No navegable: sin acceso (ModuleAccess) o bloqueada por progreso secuencial
  if (!navegable)
    return <Lock size={14} className="shrink-0 text-neutral-900/35" aria-hidden="true" />
  return <Circle size={16} className="shrink-0 text-neutral-900/25" aria-hidden="true" />
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
    <nav aria-label="Contenido del curso" className="rounded-card bg-white shadow-card">
      <ul className="divide-y divide-neutral-100">
        {secciones.map((seccion) => {
          const abierta = abiertas.has(seccion.id)
          return (
            <li key={seccion.id}>
              <button
                type="button"
                onClick={() => alternar(seccion.id)}
                aria-expanded={abierta}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
              >
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-neutral-900/40 transition-transform ${abierta ? '' : '-rotate-90'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark">
                  {seccion.titulo}
                </span>
                {!seccion.accesible && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-900/60">
                    <Lock size={10} aria-hidden="true" /> Sin acceso
                  </span>
                )}
              </button>

              {abierta && (
                <ul className="pb-2">
                  {seccion.lecciones.map((leccion) => {
                    const href = `/cursos/${cursoId}/lecciones/${leccion.id}`
                    const activa = pathname === href
                    const sinAcceso = leccion.estado === 'BLOQUEADA' // ModuleAccess: título enmascarado
                    const bloqueada = !leccion.navegable // sin acceso O bloqueo secuencial → no abrible

                    const contenido = (
                      <>
                        <IconoEstado estado={leccion.estado} navegable={leccion.navegable} />
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            sinAcceso
                              ? 'italic text-neutral-900/40'
                              : bloqueada
                                ? 'text-neutral-900/45'
                                : 'text-neutral-900/80'
                          }`}
                        >
                          {leccion.titulo}
                        </span>
                        <span className="sr-only">({ETIQUETA_ESTADO[leccion.estado]})</span>
                        {leccion.duracion !== null && leccion.duracion > 0 && (
                          <span className="shrink-0 text-xs text-neutral-900/45">
                            {formatearDuracion(leccion.duracion)}
                          </span>
                        )}
                      </>
                    )

                    return (
                      <li key={leccion.id}>
                        {bloqueada ? (
                          <div className="flex items-center gap-2.5 py-2 pl-10 pr-4">{contenido}</div>
                        ) : (
                          <Link
                            href={href}
                            aria-current={activa ? 'page' : undefined}
                            className={`flex items-center gap-2.5 py-2 pl-10 pr-4 transition-colors hover:bg-brand-surface/60 ${
                              activa ? 'border-l-2 border-brand-secondary bg-brand-surface/80' : ''
                            }`}
                          >
                            {contenido}
                          </Link>
                        )}
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
