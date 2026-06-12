// Contexto tRPC — se construye en cada request.
// Regla de seguridad #6: NUNCA confiar en el rol enviado por el cliente;
// el usuario se carga siempre desde la BD en el servidor.

import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { prisma, type Role } from '@amatla/db'

/** Usuario autenticado disponible en los resolvers. */
export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: Role
}

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  let user: SessionUser | null = null

  // TODO(tarea Auth): reemplazar por verificación real de sesión NextAuth v5 / JWT.
  // Mientras tanto, SOLO en desarrollo, el header `x-dev-user-id` permite
  // suplantar un usuario existente para probar el RBAC de punta a punta.
  const devUserId = req.headers['x-dev-user-id']
  if (process.env.NODE_ENV !== 'production' && typeof devUserId === 'string') {
    const found = await prisma.user.findUnique({
      where: { id: devUserId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })
    // Cuentas desactivadas no obtienen sesión (regla de negocio crítica)
    if (found?.isActive) {
      user = { id: found.id, email: found.email, name: found.name, role: found.role }
    }
  }

  return { req, res, prisma, user }
}

export type Context = Awaited<ReturnType<typeof createContext>>
