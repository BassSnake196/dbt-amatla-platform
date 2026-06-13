'use server'

// Server actions de administración (Fase 4): cambiar rol y activar/desactivar
// cuentas. La validación/permisos/auditoría viven en el backend.

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

export type RolUsuario = 'SUPER_ADMIN' | 'INSTRUCTOR' | 'MODERATOR' | 'STUDENT'

function mensajeLegible(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : 'Algo salió mal. Intenta de nuevo.'
  try {
    const issues = JSON.parse(mensaje) as Array<{ message: string }>
    return issues.map((issue) => issue.message).join('. ')
  } catch {
    return mensaje
  }
}

export async function cambiarRolAction(
  userId: string,
  rol: RolUsuario,
): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.admin.cambiarRol({ userId, rol })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath('/admin/usuarios')
  return { error: null }
}

export async function cambiarEstadoAction(
  userId: string,
  activo: boolean,
): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.admin.cambiarEstado({ userId, activo })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath('/admin/usuarios')
  return { error: null }
}
