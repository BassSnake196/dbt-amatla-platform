import { exigirAdmin } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'
import { GestionUsuarios } from '@/components/admin/gestion-usuarios'

export const metadata = { title: 'Usuarios — DBT.Amatla' }

// Administración de usuarios (Fase 4, SUPER_ADMIN): listar, cambiar rol y
// activar/desactivar cuentas. Cambiar rol o desactivar cierra la sesión del
// usuario afectado de inmediato (lo valida el resolver).
export default async function UsuariosAdminPage() {
  const session = await exigirAdmin()

  const api = await apiServer()
  const usuarios = await api.admin.usuarios()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          Administración de usuarios
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">
          Cambia el rol o el estado de las cuentas de la plataforma. Cambiar el rol o desactivar
          una cuenta cierra la sesión de ese usuario de inmediato.
        </p>
      </div>

      <GestionUsuarios
        usuarios={usuarios.map((u) => ({ ...u, creadoEl: u.creadoEl.toISOString() }))}
        usuarioActualId={session.user.id}
      />
    </div>
  )
}
