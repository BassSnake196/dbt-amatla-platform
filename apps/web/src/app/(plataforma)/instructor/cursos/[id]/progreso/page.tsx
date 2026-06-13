import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'

export const metadata = { title: 'Progreso — DBT.Amatla' }

// Resumen de progreso de los estudiantes inscritos en un curso propio
// (Fase 4): % completado, lecciones completadas y último acceso.
export default async function ProgresoCursoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await exigirInstructor()
  const { id } = await params

  const api = await apiServer()
  const datos = await api.progreso.curso({ cursoId: id }).catch(() => null)
  if (!datos) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/instructor/cursos/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary transition-colors hover:text-brand-dark"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Estructura del curso
        </Link>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          Progreso del curso {datos.cursoTitulo}
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">
          {datos.estudiantes.length} estudiantes · {datos.leccionesTotales} lecciones
        </p>
      </div>

      {datos.estudiantes.length === 0 ? (
        <div className="rounded-card bg-brand-surface p-6 text-sm text-neutral-900/70">
          Aún no hay estudiantes inscritos en este curso.
        </div>
      ) : (
        <>
          {/* Tabla — desktop */}
          <div className="hidden overflow-hidden rounded-card bg-white shadow-card md:table md:w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-900/50">
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Progreso</th>
                  <th className="px-4 py-3">Último acceso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {datos.estudiantes.map((e) => (
                  <tr key={e.studentId}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-brand-dark">{e.nombre}</p>
                      <p className="text-xs text-neutral-900/60">{e.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-brand-primary"
                            style={{ width: `${e.progreso}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-brand-dark">
                          {e.progreso}%
                        </span>
                        <span className="text-xs text-neutral-900/60">
                          {e.leccionesCompletadas}/{datos.leccionesTotales} lecciones
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900/70">
                      {e.ultimoAcceso
                        ? new Date(e.ultimoAcceso).toLocaleDateString('es-MX')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/instructor/cursos/${id}/progreso/${e.studentId}`}
                        className="text-xs font-semibold text-brand-secondary transition-colors hover:text-brand-dark"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas — móvil */}
          <div className="space-y-3 md:hidden">
            {datos.estudiantes.map((e) => (
              <div key={e.studentId} className="rounded-card bg-white p-4 shadow-card">
                <p className="font-semibold text-brand-dark">{e.nombre}</p>
                <p className="text-xs text-neutral-900/60">{e.email}</p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-brand-primary"
                      style={{ width: `${e.progreso}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-brand-dark">{e.progreso}%</span>
                </div>
                <p className="mt-1 text-xs text-neutral-900/60">
                  {e.leccionesCompletadas}/{datos.leccionesTotales} lecciones
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-neutral-900/60">
                    Último acceso:{' '}
                    {e.ultimoAcceso
                      ? new Date(e.ultimoAcceso).toLocaleDateString('es-MX')
                      : '—'}
                  </p>
                  <Link
                    href={`/instructor/cursos/${id}/progreso/${e.studentId}`}
                    className="text-xs font-semibold text-brand-secondary transition-colors hover:text-brand-dark"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
