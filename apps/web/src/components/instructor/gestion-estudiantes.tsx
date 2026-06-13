'use client'

// Gestión de estudiantes de un curso: asignar (selector + botón) y quitar.
// El estado optimista vive aquí; la verdad la pone el server (revalidatePath).

import { useState, useTransition } from 'react'
import { Loader2, UserMinus, UserPlus, Users } from 'lucide-react'
import { asignarCursoAction, revocarCursoAction } from '@/acciones/inscripciones'

export interface EstudianteAsignado {
  studentId: string
  nombre: string
  email: string
  asignadoEl: string // ISO
}
export interface EstudianteDisponible {
  studentId: string
  nombre: string
  email: string
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Mexico_City',
})

export function GestionEstudiantes({
  cursoId,
  asignados,
  disponibles,
}: {
  cursoId: string
  asignados: EstudianteAsignado[]
  disponibles: EstudianteDisponible[]
}) {
  const [seleccion, setSeleccion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  function asignar(e: React.FormEvent) {
    e.preventDefault()
    if (!seleccion) return
    setError(null)
    startTransition(async () => {
      const r = await asignarCursoAction(cursoId, seleccion)
      if (r.error) setError(r.error)
      else setSeleccion('')
    })
  }

  function quitar(studentId: string, nombre: string) {
    if (
      !window.confirm(
        `¿Quitar el acceso de ${nombre} a este curso? Se perderá su progreso y notas en él.`,
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const r = await revocarCursoAction(cursoId, studentId)
      if (r.error) setError(r.error)
    })
  }

  return (
    <div className="space-y-6">
      {/* Asignar */}
      <section className="rounded-card bg-white p-5 shadow-card">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-brand-dark">
          <UserPlus size={18} className="text-brand-secondary" aria-hidden="true" />
          Asignar estudiante
        </h3>
        {disponibles.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-900/55">
            No hay estudiantes disponibles para asignar. Todos los estudiantes activos ya tienen
            este curso, o aún no se han registrado estudiantes.
          </p>
        ) : (
          <form onSubmit={asignar} className="mt-3 flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="selector-estudiante">
              Estudiante
            </label>
            <select
              id="selector-estudiante"
              value={seleccion}
              onChange={(e) => setSeleccion(e.target.value)}
              className="min-w-0 flex-1 basis-64 rounded-lg border border-neutral-100 bg-white px-3 py-2.5 text-sm shadow-card focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20"
            >
              <option value="">Elige un estudiante…</option>
              {disponibles.map((est) => (
                <option key={est.studentId} value={est.studentId}>
                  {est.nombre} ({est.email})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!seleccion || pendiente}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {pendiente ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus size={15} aria-hidden="true" />
              )}
              Asignar curso
            </button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-3 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </section>

      {/* Asignados */}
      <section className="rounded-card bg-white p-5 shadow-card">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-brand-dark">
          <Users size={18} className="text-brand-secondary" aria-hidden="true" />
          Estudiantes asignados
          <span className="text-sm font-normal text-neutral-900/50">({asignados.length})</span>
        </h3>
        {asignados.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-900/55">
            Aún no has asignado este curso a ningún estudiante.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {asignados.map((est) => (
              <li key={est.studentId} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-surface text-sm font-semibold text-brand-dark">
                  {est.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-dark">{est.nombre}</p>
                  <p className="truncate text-xs text-neutral-900/55">
                    {est.email} · asignado el {formatoFecha.format(new Date(est.asignadoEl))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitar(est.studentId, est.nombre)}
                  disabled={pendiente}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-900/70 transition-colors hover:border-danger hover:text-danger disabled:opacity-40"
                >
                  <UserMinus size={13} aria-hidden="true" />
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
