import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AppShell } from '@/components/layout/app-shell'

// Toda la plataforma vive detrás de este layout: sin sesión → al login.
export default async function PlataformaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/iniciar-sesion')

  const nombre = session.user.name ?? session.user.email ?? 'Estudiante'
  const iniciales = nombre
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('')

  return (
    <AppShell usuario={{ nombre, iniciales, rol: session.user.role }}>{children}</AppShell>
  )
}
