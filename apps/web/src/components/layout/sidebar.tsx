'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell,
  Calendar,
  Compass,
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
  { href: '/general', label: 'Explorar', icon: Compass },
]

// Entrada extra solo para instructores y administradores
const NAV_INSTRUCTOR = { href: '/instructor', label: 'Panel de instructor', icon: LayoutDashboard }

// Entrada extra solo para administradores
const NAV_ADMIN = { href: '/admin/usuarios', label: 'Administración', icon: ShieldCheck }

// Grupo inferior: páginas de soporte, siempre visibles
const NAV_INFERIOR = [
  { href: '/calendario', label: 'Calendario', icon: Calendar },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

interface SidebarProps {
  open: boolean
  imagen: string | null
  nombre: string
  iniciales: string
  rol: string
  onClose: () => void
}

export function Sidebar({ open, imagen, nombre, iniciales, rol, onClose }: SidebarProps) {
  const pathname = usePathname()
  const items =
    rol === 'SUPER_ADMIN'
      ? [...NAV_ITEMS, NAV_INSTRUCTOR, NAV_ADMIN]
      : rol === 'INSTRUCTOR'
        ? [...NAV_ITEMS, NAV_INSTRUCTOR]
        : NAV_ITEMS

  const claseItem = (active: boolean) =>
    active
      ? 'flex items-center gap-3 rounded-lg border-l-[3px] border-naranja bg-white/10 py-2.5 pl-[13px] pr-3 text-sm font-medium text-white'
      : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.07]'

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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-white transition-transform duration-200 md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-6 py-5">
          <div className="flex flex-col items-start gap-3">
            {imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagen}
                className="h-12 w-12 rounded-full object-cover"
                alt=""
                title={nombre}
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full bg-naranja-suave text-base font-semibold text-naranja"
                title={nombre}
              >
                {iniciales}
              </div>
            )}
            <div>
              <Link href="/" className="font-serif text-xl font-semibold tracking-wide">
                DBT.<span className="text-naranja">Amatla</span>
              </Link>
              <p className="text-xs text-white/60">Aprendizaje clínico DBT</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10 md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Navegación principal">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={claseItem(active)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 px-3 py-2">
          {NAV_INFERIOR.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={claseItem(active)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </div>

        <div className="space-y-3 px-3 py-4">
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.07]"
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
