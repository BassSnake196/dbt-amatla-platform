// Tests de integración del router de administración (gestión de usuarios).
// RBAC (solo SUPER_ADMIN), cambio de rol, activación/desactivación,
// auditoría e invalidación de sesión.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const PREFIJO = 'test-admin'

const ADMIN: SessionUser = {
  id: `${PREFIJO}-admin`,
  email: 'admin-admin@test.dev',
  name: 'Admin Principal',
  role: 'SUPER_ADMIN',
}
const INSTRUCTOR: SessionUser = {
  id: `${PREFIJO}-instructor`,
  email: 'admin-instructor@test.dev',
  name: 'Instructor Cualquiera',
  role: 'INSTRUCTOR',
}
const STUDENT: SessionUser = {
  id: `${PREFIJO}-student`,
  email: 'admin-student@test.dev',
  name: 'Estudiante Cualquiera',
  role: 'STUDENT',
}
const OBJETIVO: SessionUser = {
  id: `${PREFIJO}-objetivo`,
  email: 'admin-objetivo@test.dev',
  name: 'Usuario Objetivo',
  role: 'STUDENT',
}

const SESSION_TOKEN = `${PREFIJO}-sess-1`

beforeAll(async () => {
  for (const u of [ADMIN, INSTRUCTOR, STUDENT, OBJETIVO]) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role },
    })
  }
})

beforeEach(async () => {
  // Resetea al usuario objetivo entre casos: STUDENT, activo, sin sesiones.
  await prisma.user.update({
    where: { id: OBJETIVO.id },
    data: { role: 'STUDENT', isActive: true },
  })
  await prisma.session.deleteMany({ where: { userId: OBJETIVO.id } })
})

afterAll(async () => {
  await prisma.session.deleteMany({
    where: { userId: { in: [ADMIN.id, INSTRUCTOR.id, STUDENT.id, OBJETIVO.id] } },
  })
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: PREFIJO } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIJO } } })
  await prisma.$disconnect()
})

describe('admin.usuarios', () => {
  it('el ADMIN lista usuarios e incluye al OBJETIVO', async () => {
    const r = await callerComo(ADMIN).admin.usuarios()
    expect(r.map((u) => u.id)).toContain(OBJETIVO.id)
  })

  it('busqueda por email del OBJETIVO lo encuentra', async () => {
    const r = await callerComo(ADMIN).admin.usuarios({ busqueda: OBJETIVO.email })
    expect(r.map((u) => u.id)).toContain(OBJETIVO.id)
    expect(r.every((u) => u.id === OBJETIVO.id)).toBe(true)
  })

  it('un INSTRUCTOR no puede listar usuarios (FORBIDDEN)', async () => {
    await expect(callerComo(INSTRUCTOR).admin.usuarios()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('un STUDENT no puede listar usuarios (FORBIDDEN)', async () => {
    await expect(callerComo(STUDENT).admin.usuarios()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('sin sesión, UNAUTHORIZED', async () => {
    await expect(callerComo(null).admin.usuarios()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

describe('admin.cambiarRol', () => {
  it('el ADMIN cambia el rol del OBJETIVO, audita CHANGE_ROLE e invalida su sesión', async () => {
    await prisma.session.create({
      data: {
        sessionToken: SESSION_TOKEN,
        userId: OBJETIVO.id,
        expires: new Date(Date.now() + 86400000),
      },
    })

    await callerComo(ADMIN).admin.cambiarRol({ userId: OBJETIVO.id, rol: 'INSTRUCTOR' })

    const usuario = await prisma.user.findUnique({ where: { id: OBJETIVO.id } })
    expect(usuario!.role).toBe('INSTRUCTOR')

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'CHANGE_ROLE', resource: `User:${OBJETIVO.id}`, userId: ADMIN.id },
    })
    expect(audit).not.toBeNull()

    const sesiones = await prisma.session.count({ where: { userId: OBJETIVO.id } })
    expect(sesiones).toBe(0)
  })

  it('el ADMIN no puede cambiar su propio rol (BAD_REQUEST)', async () => {
    await expect(
      callerComo(ADMIN).admin.cambiarRol({ userId: ADMIN.id, rol: 'INSTRUCTOR' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('userId inexistente da NOT_FOUND', async () => {
    await expect(
      callerComo(ADMIN).admin.cambiarRol({ userId: `${PREFIJO}-no-existe`, rol: 'INSTRUCTOR' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('un INSTRUCTOR no puede cambiar roles (FORBIDDEN)', async () => {
    await expect(
      callerComo(INSTRUCTOR).admin.cambiarRol({ userId: OBJETIVO.id, rol: 'INSTRUCTOR' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('admin.cambiarEstado', () => {
  it('desactiva al OBJETIVO, audita DEACTIVATE_USER e invalida su sesión', async () => {
    await prisma.session.create({
      data: {
        sessionToken: SESSION_TOKEN,
        userId: OBJETIVO.id,
        expires: new Date(Date.now() + 86400000),
      },
    })

    await callerComo(ADMIN).admin.cambiarEstado({ userId: OBJETIVO.id, activo: false })

    const usuario = await prisma.user.findUnique({ where: { id: OBJETIVO.id } })
    expect(usuario!.isActive).toBe(false)

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'DEACTIVATE_USER', resource: `User:${OBJETIVO.id}`, userId: ADMIN.id },
    })
    expect(audit).not.toBeNull()

    const sesiones = await prisma.session.count({ where: { userId: OBJETIVO.id } })
    expect(sesiones).toBe(0)
  })

  it('reactiva al OBJETIVO y audita ACTIVATE_USER', async () => {
    await prisma.user.update({ where: { id: OBJETIVO.id }, data: { isActive: false } })

    await callerComo(ADMIN).admin.cambiarEstado({ userId: OBJETIVO.id, activo: true })

    const usuario = await prisma.user.findUnique({ where: { id: OBJETIVO.id } })
    expect(usuario!.isActive).toBe(true)

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ACTIVATE_USER', resource: `User:${OBJETIVO.id}`, userId: ADMIN.id },
    })
    expect(audit).not.toBeNull()
  })

  it('el ADMIN no puede desactivarse a sí mismo (BAD_REQUEST)', async () => {
    await expect(
      callerComo(ADMIN).admin.cambiarEstado({ userId: ADMIN.id, activo: false }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('userId inexistente da NOT_FOUND', async () => {
    await expect(
      callerComo(ADMIN).admin.cambiarEstado({ userId: `${PREFIJO}-no-existe`, activo: false }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
