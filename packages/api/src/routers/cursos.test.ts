// Tests de integración del router de cursos — RBAC, ownership y auditoría.
// Corren contra el PostgreSQL local de docker-compose (seed-dev.sql aplicado).

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const INSTRUCTORA: SessionUser = {
  id: 'dev-instructor-1',
  email: 'instructora@test.dev',
  name: 'Dra. Mariana Cepeda',
  role: 'INSTRUCTOR',
}

const OTRO_INSTRUCTOR: SessionUser = {
  id: 'test-instructor-2',
  email: 'otro@test.dev',
  name: 'Otro Instructor',
  role: 'INSTRUCTOR',
}

const ESTUDIANTE: SessionUser = {
  id: 'dev-student-1',
  email: 'estudiante@test.dev',
  name: 'Estudiante Prueba',
  role: 'STUDENT',
}

const idsCreados: string[] = []

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: OTRO_INSTRUCTOR.id },
    update: {},
    create: {
      id: OTRO_INSTRUCTOR.id,
      email: OTRO_INSTRUCTOR.email,
      name: OTRO_INSTRUCTOR.name,
      role: 'INSTRUCTOR',
    },
  })
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { resource: { in: idsCreados.map((id) => `Course:${id}`) } },
  })
  await prisma.course.deleteMany({ where: { id: { in: idsCreados } } })
  await prisma.user.delete({ where: { id: OTRO_INSTRUCTOR.id } }).catch(() => {})
  await prisma.$disconnect()
})

describe('cursos.crear', () => {
  it('crea el curso en DRAFT, con ownership y auditoría', async () => {
    const api = callerComo(INSTRUCTORA)
    const { id } = await api.cursos.crear({
      titulo: 'Curso de prueba integración',
      descripcion: 'Descripción suficientemente larga para pasar validación.',
      categoria: 'Pruebas',
    })
    idsCreados.push(id)

    const curso = await prisma.course.findUniqueOrThrow({ where: { id } })
    expect(curso.status).toBe('DRAFT')
    expect(curso.instructorId).toBe(INSTRUCTORA.id)

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `Course:${id}`, action: 'CREATE_COURSE' },
    })
    expect(auditoria?.userId).toBe(INSTRUCTORA.id)
  })

  it('rechaza títulos demasiado cortos (Zod)', async () => {
    const api = callerComo(INSTRUCTORA)
    await expect(
      api.cursos.crear({ titulo: 'ab', descripcion: 'Descripción válida y larga.', categoria: 'X' }),
    ).rejects.toThrow(/3 caracteres/)
  })

  it('un STUDENT no puede crear cursos (FORBIDDEN)', async () => {
    const api = callerComo(ESTUDIANTE)
    await expect(
      api.cursos.crear({
        titulo: 'Curso pirata',
        descripcion: 'No debería poder crearse jamás.',
        categoria: 'X',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('sin sesión → UNAUTHORIZED', async () => {
    const api = callerComo(null)
    await expect(api.cursos.misCursos()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('cursos.actualizar — ownership', () => {
  it('el dueño puede actualizar y queda auditado', async () => {
    const api = callerComo(INSTRUCTORA)
    const { id } = await api.cursos.crear({
      titulo: 'Para actualizar',
      descripcion: 'Descripción original del curso de prueba.',
      categoria: 'Pruebas',
    })
    idsCreados.push(id)

    await api.cursos.actualizar({ id, titulo: 'Título actualizado' })
    const curso = await prisma.course.findUniqueOrThrow({ where: { id } })
    expect(curso.title).toBe('Título actualizado')

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `Course:${id}`, action: 'UPDATE_COURSE' },
    })
    expect(auditoria).not.toBeNull()
  })

  it('OTRO instructor no puede tocar el curso (NOT_FOUND, sin revelar existencia)', async () => {
    const api = callerComo(INSTRUCTORA)
    const { id } = await api.cursos.crear({
      titulo: 'Curso ajeno',
      descripcion: 'Solo su dueña puede modificarlo.',
      categoria: 'Pruebas',
    })
    idsCreados.push(id)

    const intruso = callerComo(OTRO_INSTRUCTOR)
    await expect(intruso.cursos.actualizar({ id, titulo: 'Hackeado' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(intruso.cursos.obtener({ id })).rejects.toMatchObject({ code: 'NOT_FOUND' })

    // misCursos del intruso tampoco lo lista
    const lista = await intruso.cursos.misCursos()
    expect(lista.find((c) => c.id === id)).toBeUndefined()
  })
})
