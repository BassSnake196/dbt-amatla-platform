// Tests de integración del helper de auditoría — corren contra el PostgreSQL
// local de docker-compose (DATABASE_URL de packages/db/.env o fallback dev).

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('./index.js')
const { auditLog, auditResource, AUDIT_ACTIONS } = await import('./audit.js')

const TEST_USER_ID = 'test-audit-user'

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: 'audit-test@test.dev',
      name: 'Usuario Test Auditoría',
      role: 'SUPER_ADMIN',
    },
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: TEST_USER_ID } })
  await prisma.user.delete({ where: { id: TEST_USER_ID } })
  await prisma.$disconnect()
})

describe('auditResource', () => {
  it('genera el formato canónico Modelo:id', () => {
    expect(auditResource('Course', 'abc123')).toBe('Course:abc123')
    expect(auditResource('User', 'xyz789')).toBe('User:xyz789')
  })
})

describe('auditLog', () => {
  it('persiste un registro completo y legible', async () => {
    const creado = await auditLog({
      userId: TEST_USER_ID,
      action: 'CREATE_COURSE',
      resource: auditResource('Course', 'curso-demo-1'),
      metadata: { titulo: 'Curso demo', categoria: 'RO-DBT' },
      ip: '127.0.0.1',
      userAgent: 'vitest',
    })

    const leido = await prisma.auditLog.findUniqueOrThrow({ where: { id: creado.id } })
    expect(leido.userId).toBe(TEST_USER_ID)
    expect(leido.action).toBe('CREATE_COURSE')
    expect(leido.resource).toBe('Course:curso-demo-1')
    expect(leido.metadata).toEqual({ titulo: 'Curso demo', categoria: 'RO-DBT' })
    expect(leido.ip).toBe('127.0.0.1')
    expect(leido.userAgent).toBe('vitest')
    expect(leido.createdAt).toBeInstanceOf(Date)
  })

  it('ip y userAgent son opcionales (workers sin request)', async () => {
    const creado = await auditLog({
      userId: TEST_USER_ID,
      action: 'CRISIS_DETECTED',
      resource: auditResource('AiSession', 'sesion-demo'),
    })
    expect(creado.ip).toBeNull()
    expect(creado.userAgent).toBeNull()
  })

  it('participa del rollback dentro de una transacción', async () => {
    const resource = auditResource('Course', 'curso-rollback')
    await expect(
      prisma.$transaction(async (tx) => {
        await auditLog(
          { userId: TEST_USER_ID, action: 'DELETE_COURSE', resource },
          tx,
        )
        throw new Error('falla simulada — la operación principal no se concretó')
      }),
    ).rejects.toThrow('falla simulada')

    // El registro de auditoría NO debe existir: la acción nunca ocurrió
    const huerfanos = await prisma.auditLog.findMany({ where: { resource } })
    expect(huerfanos).toHaveLength(0)
  })

  it('rechaza un userId inexistente (FK íntegra — no se audita en el vacío)', async () => {
    await expect(
      auditLog({
        userId: 'usuario-fantasma',
        action: 'CHANGE_ROLE',
        resource: auditResource('User', 'x'),
      }),
    ).rejects.toThrow()
  })
})

describe('catálogo de acciones', () => {
  it('incluye las acciones críticas del prompt maestro', () => {
    for (const accion of ['CREATE_COURSE', 'DELETE_USER', 'CHANGE_ROLE', 'CRISIS_DETECTED']) {
      expect(AUDIT_ACTIONS).toContain(accion)
    }
  })
})
