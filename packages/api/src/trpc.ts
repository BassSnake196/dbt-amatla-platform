// Inicialización de tRPC + middleware RBAC (4 niveles).
// Regla de desarrollo #5: error handling centralizado con TRPCError —
// nunca lanzar Error crudo en resolvers.

import { initTRPC, TRPCError } from '@trpc/server'
import type { Role } from '@amatla/db'
import type { Context, SessionUser } from './context.js'

const t = initTRPC.context<Context>().create()

export const router = t.router

/** Nivel 1 — endpoints públicos (ej. verificación de certificados, health). */
export const publicProcedure = t.procedure

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sesión requerida.' })
  }
  // Re-tipamos el contexto: de aquí en adelante `user` no es null
  return next({ ctx: { ...ctx, user: ctx.user satisfies SessionUser } })
})

/** Nivel 2 — cualquier usuario autenticado y activo. */
export const protectedProcedure = t.procedure.use(enforceAuth)

// SUPER_ADMIN hereda los permisos de los demás roles
const enforceRole = (allowed: Role[]) =>
  enforceAuth.unstable_pipe(({ ctx, next }) => {
    if (ctx.user.role !== 'SUPER_ADMIN' && !allowed.includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No tienes permisos para esta acción.' })
    }
    return next({ ctx })
  })

/** Nivel 3 — instructores (y SUPER_ADMIN). El ownership se valida en CADA resolver. */
export const instructorProcedure = t.procedure.use(enforceRole(['INSTRUCTOR']))

/** Nivel 4 — solo SUPER_ADMIN. */
export const adminProcedure = t.procedure.use(enforceRole([]))
