// Helper centralizado de auditoría (requerimiento de seguridad #19):
// TODAS las acciones de SUPER_ADMIN e INSTRUCTOR se registran por aquí.
// El registro es inmutable por convención: la app solo hace INSERT — nunca
// UPDATE ni DELETE sobre AuditLog. (Pendiente: trigger de Postgres que lo
// refuerce a nivel BD — ver ADR en STATUS.md.)

import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from './index.js'

/** Catálogo cerrado de acciones auditables — ampliar aquí, nunca strings sueltos. */
export const AUDIT_ACTIONS = [
  // Cursos
  'CREATE_COURSE',
  'UPDATE_COURSE',
  'DELETE_COURSE',
  'PUBLISH_COURSE',
  'ARCHIVE_COURSE',
  // Usuarios
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'CHANGE_ROLE',
  'ACTIVATE_USER',
  'DEACTIVATE_USER',
  // Acceso y asignación
  'ASSIGN_COURSE',
  'REVOKE_ENROLLMENT',
  'GRANT_MODULE_ACCESS',
  'REVOKE_MODULE_ACCESS',
  // Archivos
  'UPLOAD_FILE',
  'DELETE_FILE',
  // Certificados
  'GENERATE_CERTIFICATE',
  // Seguridad / IA
  'CRISIS_DETECTED',
  'LOGIN_BLOCKED',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/** Modelos referenciables en el campo resource. */
type AuditableModel =
  | 'User'
  | 'Course'
  | 'Section'
  | 'Lesson'
  | 'Enrollment'
  | 'ModuleAccess'
  | 'FileUpload'
  | 'Certificate'
  | 'AiSession'

/** Construye el identificador de recurso con formato canónico 'Modelo:id'. */
export function auditResource(model: AuditableModel, id: string): string {
  return `${model}:${id}`
}

// Acepta tanto el cliente global como un cliente transaccional ($transaction),
// para que la auditoría participe del rollback de la operación que registra.
type DbClient = PrismaClient | Prisma.TransactionClient

export interface AuditLogInput {
  /** Quién ejecuta la acción — siempre el usuario de la sesión del servidor. */
  userId: string
  action: AuditAction
  /** Usar auditResource(), p. ej. 'Course:abc123'. */
  resource: string
  /** Contexto adicional (valores previos, ids relacionados). Sin datos clínicos en claro. */
  metadata?: Prisma.InputJsonValue
  ip?: string | null
  userAgent?: string | null
}

/**
 * Registra una acción en el log de auditoría.
 * NO captura errores: si la auditoría falla, la operación debe enterarse
 * (pásale el cliente de $transaction para que el rollback sea conjunto).
 */
export async function auditLog(input: AuditLogInput, client: DbClient = prisma) {
  return client.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      metadata: input.metadata,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
}
