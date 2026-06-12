import { Play } from 'lucide-react'
import { CURSO_EN_CURSO } from '@/lib/cursos-mock'

// Anillo de progreso que "respira" (5s, como ejercicio de respiración consciente).
// La animación vive en globals.css y respeta prefers-reduced-motion.
const RADIO = 52
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

export function HeroContinuar() {
  const { titulo, leccionActual, progreso, restante } = CURSO_EN_CURSO
  const offset = CIRCUNFERENCIA * (1 - progreso / 100)

  return (
    <section
      aria-labelledby="continuar-titulo"
      className="overflow-hidden rounded-card bg-brand-dark text-white shadow-card"
    >
      <div className="flex flex-col gap-8 p-6 md:flex-row md:items-center md:p-10">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary">
            En curso
          </p>
          <h2 id="continuar-titulo" className="mt-3 font-serif text-2xl leading-tight md:text-4xl">
            {titulo}
          </h2>
          <p className="mt-3 text-sm text-white/70 md:text-base">{leccionActual}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-dark transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <Play size={16} fill="currentColor" aria-hidden="true" />
              Continuar lección
            </button>
            <span className="text-sm text-white/60">{restante}</span>
          </div>
        </div>

        {/* Firma de la página: anillo de respiración */}
        <div className="anillo-respira relative mx-auto h-36 w-36 shrink-0 md:mx-0 md:h-40 md:w-40">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={RADIO} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r={RADIO}
              fill="none"
              stroke="var(--color-brand-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-3xl font-semibold">{progreso}%</span>
            <span className="text-[11px] uppercase tracking-widest text-white/60">completado</span>
          </div>
        </div>
      </div>
    </section>
  )
}
