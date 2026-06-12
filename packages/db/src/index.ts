// @amatla/db — cliente Prisma compartido (singleton).
// Todas las apps y workers importan `prisma` desde aquí — nunca instanciar PrismaClient directo.

import { PrismaClient } from '@prisma/client'

// En desarrollo, el hot-reload de Next.js re-evalúa los módulos: guardamos la
// instancia en globalThis para no agotar el pool de conexiones de PostgreSQL.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Re-export de tipos y enums generados para que los consumidores
// no dependan de @prisma/client directamente.
export * from '@prisma/client'

// Auditoría centralizada (regla de seguridad #19)
export { auditLog, auditResource, AUDIT_ACTIONS, type AuditAction, type AuditLogInput } from './audit.js'
