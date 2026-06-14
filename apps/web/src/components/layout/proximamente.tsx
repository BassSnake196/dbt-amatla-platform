import type { ReactNode } from 'react'

interface ProximamenteProps {
  titulo: string
  descripcion: string
  icono: ReactNode
}

// Card de "stub" reutilizable para secciones todavía no implementadas.
export function Proximamente({ titulo, descripcion, icono }: ProximamenteProps) {
  return (
    <div className="mx-auto max-w-md rounded-card border border-borde bg-white p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[10px] bg-teal-suave text-teal">
        {icono}
      </div>
      <p className="mt-4 text-eyebrow uppercase tracking-wider text-teal">Próximamente</p>
      <h1 className="mt-2 text-display text-texto">{titulo}</h1>
      <p className="mt-3 text-body text-texto-suave">{descripcion}</p>
    </div>
  )
}
