import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'

export const metadata = { title: 'Progreso del estudiante — DBT.Amatla' }

const ETIQUETA_TIPO = {
  VIDEO: 'Video',
  PDF: 'PDF',
  QUIZ: 'Quiz',
  TEXT: 'Texto',
} as const

const ETIQUETA_ESTADO = {
  COMPLETADA: 'Completada',
  EN_PROGRESO: 'En progreso',
  PENDIENTE: 'Pendiente',
} as const

function IconoEstado({ estado }: { estado: keyof typeof ETIQUETA_ESTADO }) {
  if (estado === 'COMPLETADA')
    return <CheckCircle2 size={16} className="shrink-0 text-brand-secondary" aria-hidden="true" />
  if (estado === 'EN_PROGRESO')
    return <PlayCircle size={16} className="shrink-0 text-brand-primary" aria-hidden="true" />
  return <Circle size={16} className="shrink-0 text-neutral-900/25" aria-hidden="true" />
}

// Detalle de progreso de un estudiante en un curso propio (Fase 4): estado de
// cada lección y, para las QUIZ, el último intento si existe.
export default async function ProgresoEstudiantePage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>
}) {
  await exigirInstructor()
  const { id, studentId } = await params

  const api = await apiServer()
  const datos = await api.progreso.estudiante({ cursoId: id, studentId }).catch(() => null)
  if (!datos) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/instructor/cursos/${id}/progreso`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary transition-colors hover:text-brand-dark"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Progreso del curso
        </Link>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          {datos.estudiante.nombre}
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">{datos.estudiante.email}</p>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-primary"
              style={{ width: `${datos.progreso}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-brand-dark">{datos.progreso}%</span>
          <span className="text-xs text-neutral-900/60">
            {datos.leccionesCompletadas}/{datos.leccionesTotales} lecciones
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {datos.secciones.map((seccion, i) => (
          <div key={i} className="rounded-card bg-white shadow-card">
            <h3 className="border-b border-neutral-100 px-4 py-3 font-serif text-lg font-semibold text-brand-dark">
              {seccion.titulo}
            </h3>
            <ul className="divide-y divide-neutral-100">
              {seccion.lecciones.map((leccion) => (
                <li key={leccion.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <IconoEstado estado={leccion.estado} />
                  <span className="min-w-0 flex-1 text-sm text-neutral-900/80">
                    {leccion.titulo}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-900/60">
                    {ETIQUETA_TIPO[leccion.tipo]}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      leccion.estado === 'COMPLETADA'
                        ? 'text-brand-secondary'
                        : leccion.estado === 'EN_PROGRESO'
                          ? 'text-brand-primary'
                          : 'text-neutral-900/50'
                    }`}
                  >
                    {ETIQUETA_ESTADO[leccion.estado]}
                  </span>

                  {leccion.completadaEl && (
                    <span className="basis-full text-xs text-neutral-900/50">
                      Completada el {new Date(leccion.completadaEl).toLocaleDateString('es-MX')}
                    </span>
                  )}

                  {leccion.intentoQuiz && (
                    <span
                      className={`basis-full text-xs font-medium ${
                        leccion.intentoQuiz.passed ? 'text-brand-secondary' : 'text-danger'
                      }`}
                    >
                      Quiz: {leccion.intentoQuiz.score}% —{' '}
                      {leccion.intentoQuiz.passed ? 'Aprobado' : 'Reprobado'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
