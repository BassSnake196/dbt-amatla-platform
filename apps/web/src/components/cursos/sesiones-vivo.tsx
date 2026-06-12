import { Video } from 'lucide-react'
import { SESIONES_VIVO } from '@/lib/cursos-mock'

export function SesionesVivo() {
  return (
    <section aria-labelledby="sesiones-titulo">
      <h3 id="sesiones-titulo" className="mb-4 font-serif text-xl font-semibold text-brand-dark">
        Sesiones en vivo
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {SESIONES_VIVO.map((sesion) => (
          <article
            key={sesion.id}
            className="flex items-center gap-4 rounded-card bg-white p-4 shadow-card"
          >
            {/* Bloque de fecha estilo calendario */}
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-surface text-brand-dark">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary">
                {sesion.dia}
              </span>
              <span className="font-serif text-2xl font-semibold leading-none">{sesion.fecha}</span>
              <span className="text-[10px] uppercase text-neutral-900/50">{sesion.mes}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold text-brand-dark">{sesion.titulo}</h4>
              <p className="mt-0.5 text-xs text-neutral-900/60">
                {sesion.hora} · {sesion.curso}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-secondary px-4 py-2 text-xs font-semibold text-brand-secondary transition-colors hover:bg-brand-secondary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
            >
              <Video size={14} aria-hidden="true" />
              Unirse
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
