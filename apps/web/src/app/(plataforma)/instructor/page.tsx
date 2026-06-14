import Link from 'next/link'
import { BookOpen, Clock3, Layers, ListTree, Pencil, Plus, Users } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'

export const metadata = { title: 'Panel de instructor — DBT.Amatla' }

const ETIQUETA_STATUS = {
  DRAFT: { texto: 'Borrador', clases: 'bg-neutral-100 text-texto-suave' },
  PUBLISHED: { texto: 'Publicado', clases: 'bg-teal-suave text-teal' },
  ARCHIVED: { texto: 'Archivado', clases: 'bg-neutral-900/5 text-texto-suave' },
} as const

const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Mexico_City',
})

function formatearDuracion(segundos: number): string {
  if (segundos === 0) return 'Sin contenido'
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.round((segundos % 3600) / 60)
  return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`
}

const PALETAS = [
  { fondo: 'linear-gradient(135deg, #2E7D6B 0%, #1A3A35 85%)', psi: 'rgba(245, 166, 35, 0.35)' },
  { fondo: 'linear-gradient(135deg, #F5A623 0%, #DC8A10 90%)', psi: 'rgba(26, 58, 53, 0.30)' },
  { fondo: 'linear-gradient(135deg, #F9EDD5 0%, #EDD9B4 90%)', psi: 'rgba(46, 125, 107, 0.35)' },
  { fondo: 'linear-gradient(135deg, #1A3A35 0%, #2E7D6B 90%)', psi: 'rgba(249, 237, 213, 0.30)' },
] as const

function artePara(categoria: string) {
  let hash = 0
  for (const c of categoria) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return PALETAS[Math.abs(hash) % PALETAS.length]!
}

export default async function InstructorPage() {
  // Doble guardia: además del layout con sesión, esta vista exige rol de instructor
  await exigirInstructor()

  const api = await apiServer()
  const cursos = await api.cursos.misCursos()

  const publicados = cursos.filter((c) => c.status === 'PUBLISHED').length
  const totalEstudiantes = cursos.reduce((suma, c) => suma + c.estudiantes, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display text-texto">Panel de instructor</h1>
          <p className="mt-1 text-body text-texto-suave">
            Tus cursos, su estado y el avance de tus estudiantes.
          </p>
        </div>
        <Link
          href="/instructor/cursos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-naranja px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} aria-hidden="true" />
          Nuevo curso
        </Link>
      </section>

      {/* Métricas generales */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumen">
        {[
          { etiqueta: 'Cursos', valor: cursos.length, Icono: BookOpen, clasesIcono: 'bg-teal-suave text-teal' },
          { etiqueta: 'Publicados', valor: publicados, Icono: Layers, clasesIcono: 'bg-naranja-suave text-naranja' },
          { etiqueta: 'Estudiantes', valor: totalEstudiantes, Icono: Users, clasesIcono: 'bg-teal-suave text-teal' },
        ].map(({ etiqueta, valor, Icono, clasesIcono }) => (
          <div
            key={etiqueta}
            className="flex items-center gap-4 rounded-card border border-borde bg-white p-5"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${clasesIcono}`}>
              <Icono size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-3xl font-semibold text-texto">{valor}</p>
              <p className="text-caption text-texto-suave">{etiqueta}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Lista de cursos */}
      <section aria-labelledby="mis-cursos">
        <h2 id="mis-cursos" className="mb-5 text-heading text-texto">
          Mis cursos
        </h2>

        {cursos.length === 0 ? (
          <div className="rounded-card border border-borde bg-white p-10 text-center">
            <p className="text-heading text-texto">Aún no tienes cursos</p>
            <p className="mx-auto mt-2 max-w-sm text-body text-texto-suave">
              Crea tu primer curso y empieza a estructurar las secciones y lecciones para tus
              estudiantes.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {cursos.map((curso) => {
              const status = ETIQUETA_STATUS[curso.status]
              const arte = artePara(curso.categoria)
              return (
                <article
                  key={curso.id}
                  className="group flex flex-col overflow-hidden rounded-card border border-borde bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div
                    className="relative flex h-28 items-end overflow-hidden p-4"
                    style={{ background: arte.fondo }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-2 -top-9 select-none font-serif text-[8rem] leading-none"
                      style={{ color: arte.psi }}
                    >
                      Ψ
                    </span>
                    <span className="relative rounded-full bg-black/25 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                      {curso.categoria}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.clases}`}>
                        {status.texto}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          curso.esPublico ? 'bg-teal-suave text-teal' : 'bg-neutral-100 text-texto-suave'
                        }`}
                      >
                        {curso.esPublico ? 'Público' : 'Privado'}
                      </span>
                    </div>

                    <h3 className="mt-2">
                      <Link
                        href={`/instructor/cursos/${curso.id}`}
                        className="font-serif text-base font-semibold text-texto hover:text-teal"
                      >
                        {curso.titulo}
                      </Link>
                    </h3>

                    <p className="mt-1 text-caption text-texto-suave">
                      Actualizado el {formatoFecha.format(curso.actualizadoEl)}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-4 pt-3 text-caption text-texto-suave">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers size={14} aria-hidden="true" />
                        {curso.secciones} secc · {curso.lecciones} lecc
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={14} aria-hidden="true" />
                        {formatearDuracion(curso.duracionSegundos)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={14} aria-hidden="true" />
                        {curso.estudiantes} estudiantes
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/instructor/cursos/${curso.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-naranja px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <ListTree size={13} aria-hidden="true" />
                        Gestionar contenido
                      </Link>
                      <Link
                        href={`/instructor/cursos/${curso.id}/editar`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-borde px-3 py-1.5 text-xs font-semibold text-texto transition-colors hover:bg-crema-hover"
                      >
                        <Pencil size={13} aria-hidden="true" />
                        Editar datos
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
