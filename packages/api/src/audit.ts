// Puente de auditoría para resolvers tRPC: completa userId, IP y user-agent
// desde el contexto del request. Usar SIEMPRE este wrapper en resolvers
// (el helper crudo de @amatla/db es para workers y scripts).

import {
  auditLog,
  auditResource,
  type AuditAction,
  type AuditLogInput,
  type Prisma,
} from '@amatla/db'
import type { Context, SessionUser } from './context.js'

type AuthedContext = Context & { user: SessionUser }

export async function auditFromRequest(
  ctx: AuthedContext,
  action: AuditAction,
  resource: string,
  metadata?: Prisma.InputJsonValue,
  /** Cliente transaccional opcional — pásalo dentro de prisma.$transaction. */
  client?: Parameters<typeof auditLog>[1],
) {
  const input: AuditLogInput = {
    userId: ctx.user.id,
    action,
    resource,
    metadata,
    ip: ctx.req.ip ?? null,
    userAgent: ctx.req.headers['user-agent'] ?? null,
  }
  return auditLog(input, client)
}

export { auditResource }
