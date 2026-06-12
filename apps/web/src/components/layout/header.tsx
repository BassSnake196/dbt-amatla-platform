'use client'

import { Menu } from 'lucide-react'
import type { UsuarioShell } from './app-shell'

interface HeaderProps {
  usuario: UsuarioShell
  onOpenSidebar: () => void
}

// El progreso real del curso llegará vía tRPC en la Fase 3 (Experiencia del Estudiante)
const MOCK_PROGRESS = 35

export function Header({ usuario, onOpenSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-neutral-100 bg-white px-4 py-3 md:px-8">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="rounded p-1.5 text-brand-dark hover:bg-neutral-100 md:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold text-brand-dark md:text-base">
          Hola, {usuario.nombre}
        </h1>
        <div className="mt-1.5 flex items-center gap-3">
          <div
            className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100"
            role="progressbar"
            aria-valuenow={MOCK_PROGRESS}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del curso"
          >
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: `${MOCK_PROGRESS}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-brand-secondary">
            {MOCK_PROGRESS}% completado
          </span>
        </div>
      </div>

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-sm font-semibold text-white"
        aria-label={`Perfil de ${usuario.nombre}`}
        title={usuario.nombre}
      >
        {usuario.iniciales}
      </div>
    </header>
  )
}
