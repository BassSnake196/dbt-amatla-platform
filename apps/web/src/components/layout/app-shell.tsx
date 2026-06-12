'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

export interface UsuarioShell {
  nombre: string
  iniciales: string
  rol: string
}

// Shell de la plataforma: sidebar colapsable en móvil (< 768px) + header con progreso.
// Es client component solo por el estado del menú móvil; las páginas siguen siendo Server Components.
export function AppShell({ usuario, children }: { usuario: UsuarioShell; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-dvh">
      <Sidebar open={sidebarOpen} rol={usuario.rol} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header usuario={usuario} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  )
}
