'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Bookmark, Calendar, LogOut, Menu, Search, Settings } from 'lucide-react'
import { cerrarSesion } from '@/acciones/auth'
import type { UsuarioShell } from './app-shell'

interface HeaderProps {
  usuario: UsuarioShell
  onOpenSidebar: () => void
}

const ETIQUETA_ROL: Record<string, string> = {
  SUPER_ADMIN: 'Administrador',
  INSTRUCTOR: 'Instructor',
  ESTUDIANTE: 'Estudiante',
}

export function Header({ usuario, onOpenSidebar }: HeaderProps) {
  const esAdmin = usuario.rol === 'SUPER_ADMIN'

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-borde bg-white px-4 py-3 md:px-8">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="rounded p-1.5 text-texto transition-colors hover:bg-crema-hover md:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      {/* Search pill decorativo — oculto para administradores (B1) */}
      {!esAdmin && (
        <div className="hidden w-80 max-w-xs cursor-default items-center gap-2 rounded-full border border-borde px-4 py-2 text-sm text-texto-suave md:flex">
          <Search size={16} aria-hidden="true" />
          Buscar cursos…
        </div>
      )}

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificaciones"
          className="rounded-full p-1.5 text-texto-suave transition-colors hover:bg-crema-hover hover:text-texto"
        >
          <Bell size={20} />
        </button>
        <button
          type="button"
          aria-label="Guardados"
          className="rounded-full p-1.5 text-texto-suave transition-colors hover:bg-crema-hover hover:text-texto"
        >
          <Bookmark size={20} />
        </button>

        {esAdmin && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-texto">{usuario.nombre}</p>
            <p className="text-caption text-texto-suave">Administrador</p>
          </div>
        )}

        <MenuUsuario usuario={usuario} />
      </div>
    </header>
  )
}

function MenuUsuario({ usuario }: { usuario: UsuarioShell }) {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera (B2)
  useEffect(() => {
    if (!abierto) return
    function alClickFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false)
      }
    }
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', alClickFuera)
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('mousedown', alClickFuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  const rolLegible = ETIQUETA_ROL[usuario.rol] ?? 'Estudiante'

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Menú de ${usuario.nombre}`}
        className="block rounded-full ring-2 ring-transparent transition-all hover:ring-naranja focus-visible:outline-none focus-visible:ring-naranja"
      >
        {usuario.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={usuario.imagen}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
            alt=""
            title={usuario.nombre}
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-naranja-suave text-sm font-semibold text-naranja">
            {usuario.iniciales}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 origin-top-right animate-[menu-aparece_150ms_ease] overflow-hidden rounded-xl border border-borde bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {usuario.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={usuario.imagen} className="h-10 w-10 rounded-full object-cover" alt="" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-naranja-suave text-sm font-semibold text-naranja">
                {usuario.iniciales}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-texto">{usuario.nombre}</p>
              <p className="text-caption text-texto-suave">{rolLegible}</p>
            </div>
          </div>

          <div className="border-t border-borde py-1">
            <Link
              href="/calendario"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-texto transition-colors hover:bg-fondo"
            >
              <Calendar size={16} className="text-texto-suave" aria-hidden="true" />
              Calendario
            </Link>
            <Link
              href="/configuracion"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-texto transition-colors hover:bg-fondo"
            >
              <Settings size={16} className="text-texto-suave" aria-hidden="true" />
              Configuración
            </Link>
          </div>

          <div className="border-t border-borde py-1">
            <form action={cerrarSesion}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/5"
              >
                <LogOut size={16} aria-hidden="true" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
