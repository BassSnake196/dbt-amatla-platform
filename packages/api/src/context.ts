// Contexto tRPC — se construye en cada request.
// Regla de seguridad #6: NUNCA confiar en el rol enviado por el cliente;
// el usuario se carga siempre desde la BD / sesión del servidor.

import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { prisma, type Role } from '@amatla/db'

/** Usuario autenticado disponible en los resolvers. */
export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: Role
}

/** Metadatos del request para auditoría — null cuando no hay request HTTP (workers, scripts). */
export interface RequestMeta {
  ip: string | null
  userAgent: string | null
}

export interface CreateInnerContextOptions {
  user: SessionUser | null
  requestMeta?: RequestMeta
}

/**
 * Contexto interno — lo usan el adapter de Fastify Y el caller server-side
 * de Next.js (Server Components llaman a tRPC sin salto HTTP).
 */
export function createContextInner(opts: CreateInnerContextOptions) {
  return {
    prisma,
    user: opts.user,
    requestMeta: opts.requestMeta ?? { ip: null, userAgent: null },
  }
}

export type Context = ReturnType<typeof createContextInner>

/** Adapter Fastify — contexto por request HTTP. */
export async function createContext({ req }: CreateFastifyContextOptions): Promise<Context> {
  let user: SessionUser | null = null

  // TODO(móvil, Fase 3): verificación de JWT con refresh tokens.
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

  return createContextInner({
    user,
    requestMeta: {
      ip: req.ip ?? null,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    },
  })
}
