import Link from 'next/link'
import type { EnCurso } from '@/lib/tipos-estudiante'

// Hero de bienvenida de la home — saludo personalizado + anillo de progreso
// global (ponderado por lecciones, calculado en page.tsx) + acceso directo
// a la lección en curso. El anillo reutiliza el patrón de HeroContinuar
// (RADIO=52, anillo-respira en globals.css, respeta prefers-reduced-motion).
const RADIO = 52
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

export function HeroBienvenida({
  nombre,
  progresoGlobal,
  enCurso,
}: {
  nombre: string
  progresoGlobal: number
  enCurso: EnCurso | null
}) {
  const offset = CIRCUNFERENCIA * (1 - progresoGlobal / 100)

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
        {enCurso && (
          <Link
            href={`/cursos/${enCurso.cursoId}/lecciones/${enCurso.leccionId}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border-[1.5px] border-teal px-5 py-2.5 text-sm font-semibold text-teal transition-colors hover:bg-teal-suave"
          >
            Continuar: {enCurso.titulo} →
          </Link>
        )}
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
