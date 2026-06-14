'use client'

import { Bell, Bookmark, Menu, Search } from 'lucide-react'
import type { UsuarioShell } from './app-shell'

interface HeaderProps {
  usuario: UsuarioShell
  onOpenSidebar: () => void
}

export function Header({ usuario, onOpenSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-borde bg-white px-4 py-3 md:px-8">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="rounded p-1.5 text-texto hover:bg-crema-hover md:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      {/* Search pill decorativo — sin lógica, solo presentación */}
      <div className="hidden w-80 max-w-xs cursor-default items-center gap-2 rounded-full border border-borde px-4 py-2 text-sm text-texto-suave md:flex">
        <Search size={16} aria-hidden="true" />
        Buscar cursos…
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span aria-hidden="true" className="text-texto-suave">
          <Bell size={20} />
        </span>
        <span aria-hidden="true" className="text-texto-suave">
          <Bookmark size={20} />
        </span>

        {usuario.rol === 'SUPER_ADMIN' && (
          <div className="text-right">
            <p className="text-sm font-medium text-texto">{usuario.nombre}</p>
            <p className="text-caption text-texto-suave">Administrador</p>
          </div>
        )}

        {usuario.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usuario.imagen}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
            alt=""
            title={usuario.nombre}
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-naranja-suave text-sm font-semibold text-naranja"
            aria-label={`Perfil de ${usuario.nombre}`}
            title={usuario.nombre}
          >
            {usuario.iniciales}
          </div>
        )}
      </div>
    </header>
  )
}
