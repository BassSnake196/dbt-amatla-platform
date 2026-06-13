'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Calendar,
  Bell,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cerrarSesion } from '@/acciones/auth'

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/cursos', label: 'Mis cursos', icon: BookOpen },
  { href: '/calendario', label: 'Calendario', icon: Calendar },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

// Entrada extra solo para instructores y administradores
const NAV_INSTRUCTOR = { href: '/instructor', label: 'Panel de instructor', icon: LayoutDashboard }

// Entrada extra solo para administradores
const NAV_ADMIN = { href: '/admin/usuarios', label: 'Administración', icon: ShieldCheck }

interface SidebarProps {
  open: boolean
  rol: string
  onClose: () => void
}

export function Sidebar({ open, rol, onClose }: SidebarProps) {
  const pathname = usePathname()
  const items =
    rol === 'SUPER_ADMIN'
      ? [...NAV_ITEMS, NAV_INSTRUCTOR, NAV_ADMIN]
      : rol === 'INSTRUCTOR'
        ? [...NAV_ITEMS, NAV_INSTRUCTOR]
        : NAV_ITEMS

  return (
    <>
      {/* Overlay móvil — cierra el menú al tocar fuera */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-brand-dark/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-dark text-white transition-transform duration-200 md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-xl font-semibold tracking-wide">
            DBT.<span className="text-brand-primary">Amatla</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10 md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegación principal">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-secondary text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-3 px-3 py-4">
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
          <p className="px-3 text-xs text-white/50">Entrenamiento en habilidades DBT · RO</p>
        </div>
      </aside>
    </>
  )
}
