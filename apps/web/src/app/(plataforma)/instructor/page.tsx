import Link from 'next/link'
import { BookOpen, Clock3, Layers, Pencil, Plus, Users } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'

export const metadata = { title: 'Panel de instructor — DBT.Amatla' }

const ETIQUETA_STATUS = {
  DRAFT: { texto: 'Borrador', clases: 'bg-neutral-100 text-neutral-900/70' },
  PUBLISHED: { texto: 'Publicado', clases: 'bg-brand-secondary/10 text-brand-secondary' },
  ARCHIVED: { texto: 'Archivado', clases: 'bg-neutral-900/5 text-neutral-900/50' },
} as const

function formatearDuracion(segundos: number): string {
  if (segundos === 0) return 'Sin contenido'
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.round((segundos % 3600) / 60)
  return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Mexico_City',
})

export default async function InstructorPage() {
  // Doble guardia: además del layout con sesión, esta vista exige rol de instructor
  await exigirInstructor()

  const api = await apiServer()
  const cursos = await api.cursos.misCursos()

  const publicados = cursos.filter((c) => c.status === 'PUBLISHED').length
  const totalEstudiantes = cursos.reduce((suma, c) => suma + c.estudiantes, 0)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
            Panel de instructor
          </h2>
          <p className="mt-1 text-sm text-neutral-900/60">
            Tus cursos, su estado y el avance de tus estudiantes.
          </p>
        </div>
        <Link
          href="/instructor/cursos/nuevo"
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          <Plus size={16} aria-hidden="true" />
          Nuevo curso
        </Link>
      </section>

      {/* Métricas generales */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumen">
        {[
          { etiqueta: 'Cursos', valor: cursos.length, Icono: BookOpen },
          { etiqueta: 'Publicados', valor: publicados, Icono: Layers },
          { etiqueta: 'Estudiantes activos', valor: totalEstudiantes, Icono: Users },
        ].map(({ etiqueta, valor, Icono }) => (
          <div key={etiqueta} className="flex items-center gap-4 rounded-card bg-white p-5 shadow-card">
            <div className="rounded-lg bg-brand-surface p-2.5">
              <Icono className="text-brand-secondary" size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-2xl font-semibold text-brand-dark">{valor}</p>
              <p className="text-xs text-neutral-900/60">{etiqueta}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Lista de cursos */}
      <section aria-label="Mis cursos">
        {cursos.length === 0 ? (
          <div className="rounded-card bg-brand-surface p-10 text-center shadow-card">
            <p className="font-serif text-xl text-brand-dark">Aún no tienes cursos</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-brand-dark/70">
              Crea tu primer curso y empieza a estructurar las secciones y lecciones para tus
              estudiantes.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {cursos.map((curso) => {
              const status = ETIQUETA_STATUS[curso.status]
              return (
                <li
                  key={curso.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card bg-white p-5 shadow-card transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate font-serif text-base font-semibold text-brand-dark">
                        {curso.titulo}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.clases}`}
                      >
                        {status.texto}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-900/50">
                      {curso.categoria} · Actualizado el {formatoFecha.format(curso.actualizadoEl)}
                    </p>
                  </div>

                  <Link
                    href={`/instructor/cursos/${curso.id}/editar`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:border-brand-secondary hover:text-brand-secondary"
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Editar
                  </Link>

                  <dl className="flex shrink-0 items-center gap-5 text-xs text-neutral-900/70">
                    <div className="flex items-center gap-1.5">
                      <Layers size={14} aria-hidden="true" />
                      <dd>
                        {curso.secciones} secciones · {curso.lecciones} lecciones
                      </dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock3 size={14} aria-hidden="true" />
                      <dd>{formatearDuracion(curso.duracionSegundos)}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} aria-hidden="true" />
                      <dd>{curso.estudiantes} estudiantes</dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
