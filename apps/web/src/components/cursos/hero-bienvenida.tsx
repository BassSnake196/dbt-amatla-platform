import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { EnCurso } from '@/lib/tipos-estudiante'

// Hero de bienvenida de la home — saludo personalizado + anillo de progreso
// global (ponderado por lecciones, calculado en page.tsx) + vitrina del curso
// destacado (retomar lo dejado o sugerencia). El anillo reutiliza el patrón de
// HeroContinuar (RADIO=52, anillo-respira en globals.css, respeta reduced-motion).
const RADIO = 52
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

// Vitrina: imagen + CTA del curso destacado. La calcula page.tsx con la
// prioridad del feedback (curso en progreso → primer inscrito → público).
export interface VitrinaHero {
  modo: 'continuar' | 'sugerencia'
  titulo: string
  href: string
  thumbnailUrl: string | null
}

export function HeroBienvenida({
  nombre,
  progresoGlobal,
  enCurso,
  vitrina,
}: {
  nombre: string
  progresoGlobal: number
  enCurso: EnCurso | null
  vitrina: VitrinaHero | null
}) {
  const offset = CIRCUNFERENCIA * (1 - progresoGlobal / 100)
  // Compat: si no llega vitrina pero hay lección en curso, retomar esa.
  const destacado: VitrinaHero | null =
    vitrina ??
    (enCurso
      ? {
          modo: 'continuar',
          titulo: enCurso.titulo,
          href: `/cursos/${enCurso.cursoId}/lecciones/${enCurso.leccionId}`,
          thumbnailUrl: null,
        }
      : null)

  return (
    <section className="flex flex-col gap-8 rounded-card border border-borde bg-white p-6 md:flex-row md:items-center md:p-10">
      <div className="min-w-0 flex-1">
        <p className="text-eyebrow uppercase tracking-wider text-teal">Bienvenido de nuevo</p>
        <h1 className="mt-3 text-display text-texto">
          Hola, <span className="text-display text-teal">{nombre}</span>
        </h1>
        <p className="mt-3 text-body text-texto-suave">
          Llevas un {progresoGlobal}% de tu camino completado. Continúa cuando quieras.
        </p>

        {destacado && <Vitrina vitrina={destacado} />}
      </div>

      {/* Firma de la página: anillo de respiración */}
      <div className="anillo-respira relative mx-auto h-32 w-32 shrink-0 md:mx-0 md:h-36 md:w-36">
        <svg viewBox="0 0 120 120" className="-rotate-90 h-full w-full" aria-hidden="true">
          <circle cx="60" cy="60" r={RADIO} fill="none" stroke="var(--color-borde)" strokeWidth="8" />
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
          <span className="text-3xl font-semibold text-texto">{progresoGlobal}%</span>
          <span className="text-eyebrow uppercase tracking-wider text-texto-suave">
            Progreso global
          </span>
        </div>
      </div>
    </section>
  )
}

function Vitrina({ vitrina }: { vitrina: VitrinaHero }) {
  const continuar = vitrina.modo === 'continuar'
  const inicial = vitrina.titulo.trim().charAt(0).toUpperCase() || 'Ψ'

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-card border border-borde bg-fondo/60 p-4 sm:flex-row sm:items-center">
      {/* Miniatura 16:9 — thumbnail real o placeholder con gradiente de marca (R6) */}
      <div className="relative aspect-video w-full overflow-hidden rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] sm:w-[180px] sm:shrink-0">
        {vitrina.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vitrina.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-serif text-4xl font-semibold text-white/90"
            style={{ background: 'linear-gradient(135deg, #1A3A35, #2E7D6B)' }}
            aria-hidden="true"
          >
            {inicial}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-eyebrow uppercase tracking-wider text-teal">
          {continuar ? 'Continúa donde lo dejaste' : 'Te puede interesar'}
        </p>
        <p className="mt-1 truncate font-serif text-lg font-semibold text-brand-dark">
          {vitrina.titulo}
        </p>
        <Link
          href={vitrina.href}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-naranja px-5 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:-translate-y-px hover:bg-[#e09610] active:translate-y-0 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          {continuar ? 'Continuar' : 'Ver curso'}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
