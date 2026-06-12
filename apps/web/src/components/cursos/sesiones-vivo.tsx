import { Video } from 'lucide-react'
import type { SesionVivo } from '@/lib/tipos-estudiante'
import { partesFechaSesion } from '@/lib/formato'

// Próximas sesiones en vivo de los cursos asignados (CalendarEvent via tRPC).
// La plataforma solo muestra el enlace de Meet — no gestiona la llamada.
export function SesionesVivo({ sesiones }: { sesiones: SesionVivo[] }) {
  return (
    <section aria-labelledby="sesiones-titulo">
      <h3 id="sesiones-titulo" className="mb-4 font-serif text-xl font-semibold text-brand-dark">
        Sesiones en vivo
      </h3>
      {sesiones.length === 0 ? (
        <div className="rounded-card bg-white p-8 text-center shadow-card">
          <p className="text-sm text-neutral-900/60">
            No hay sesiones programadas por ahora. Las sesiones de tus cursos aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sesiones.map((sesion) => {
            const fecha = partesFechaSesion(sesion.iniciaEn)
            return (
              <article
                key={sesion.id}
                className="flex items-center gap-4 rounded-card bg-white p-4 shadow-card"
              >
                {/* Bloque de fecha estilo calendario */}
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-surface text-brand-dark">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary">
                    {fecha.dia}
                  </span>
                  <span className="font-serif text-2xl font-semibold leading-none">
                    {fecha.numero}
                  </span>
                  <span className="text-[10px] uppercase text-neutral-900/50">{fecha.mes}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold text-brand-dark">{sesion.titulo}</h4>
                  <p className="mt-0.5 text-xs text-neutral-900/60">
                    {fecha.hora} · Ciudad de México
                    {sesion.cursoTitulo ? ` · ${sesion.cursoTitulo}` : ''}
                  </p>
                </div>
                {sesion.meetUrl && (
                  <a
                    href={sesion.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-secondary px-4 py-2 text-xs font-semibold text-brand-secondary transition-colors hover:bg-brand-secondary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                  >
                    <Video size={14} aria-hidden="true" />
                    Unirse
                  </a>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
