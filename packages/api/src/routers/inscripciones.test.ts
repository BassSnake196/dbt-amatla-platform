// Tests de integración del router de inscripciones (asignación de curso completo).
// RBAC, ownership, doble inscripción, revocación y aislamiento entre instructores.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const PREFIJO = 'test-insc'

const INSTRUCTORA: SessionUser = {
  id: `${PREFIJO}-instructora`,
  email: 'insc-instructora@test.dev',
  name: 'Dra. Inscripciones',
  role: 'INSTRUCTOR',
}
const OTRO_INSTRUCTOR: SessionUser = {
  id: `${PREFIJO}-otro`,
  email: 'insc-otro@test.dev',
  name: 'Otro Instructor',
  role: 'INSTRUCTOR',
}
const ESTUDIANTE_A: SessionUser = {
  id: `${PREFIJO}-est-a`,
  email: 'insc-est-a@test.dev',
  name: 'Valentina Prueba',
  role: 'STUDENT',
}
const ESTUDIANTE_B: SessionUser = {
  id: `${PREFIJO}-est-b`,
  email: 'insc-est-b@test.dev',
  name: null, // sin nombre: la UI cae al email
  role: 'STUDENT',
}
const ESTUDIANTE_INACTIVO: SessionUser = {
  id: `${PREFIJO}-est-off`,
  email: 'insc-est-off@test.dev',
  name: 'Inactivo',
  role: 'STUDENT',
}

let cursoId: string
let cursoAjenoId: string

beforeAll(async () => {
  for (const u of [INSTRUCTORA, OTRO_INSTRUCTOR, ESTUDIANTE_A, ESTUDIANTE_B]) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role },
    })
  }
  await prisma.user.upsert({
    where: { id: ESTUDIANTE_INACTIVO.id },
    update: {},
    create: {
      id: ESTUDIANTE_INACTIVO.id,
      email: ESTUDIANTE_INACTIVO.email,
      name: ESTUDIANTE_INACTIVO.name,
      role: 'STUDENT',
      isActive: false,
    },
  })

  cursoId = (
    await prisma.course.create({
      data: {
        title: 'Curso para asignación',
        description: 'Curso de prueba del router de inscripciones.',
        category: 'Pruebas',
        instructorId: INSTRUCTORA.id,
      },
    })
  ).id
  cursoAjenoId = (
    await prisma.course.create({
      data: {
        title: 'Curso del otro instructor',
        description: 'No debe ser tocable por la instructora.',
        category: 'Pruebas',
        instructorId: OTRO_INSTRUCTOR.id,
      },
    })
  ).id
})

beforeEach(async () => {
  await prisma.enrollment.deleteMany({ where: { courseId: { in: [cursoId, cursoAjenoId] } } })
  await prisma.courseBlock.deleteMany({ where: { courseId: { in: [cursoId, cursoAjenoId] } } })
})

afterAll(async () => {
  await prisma.enrollment.deleteMany({ where: { courseId: { in: [cursoId, cursoAjenoId] } } })
  await prisma.courseBlock.deleteMany({ where: { courseId: { in: [cursoId, cursoAjenoId] } } })
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: PREFIJO } } })
  await prisma.course.deleteMany({ where: { id: { in: [cursoId, cursoAjenoId] } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIJO } } })
  await prisma.$disconnect()
})

describe('inscripciones.estudiantesCurso', () => {
  it('lista disponibles (STUDENT activos no inscritos) y excluye inactivos', async () => {
    const r = await callerComo(INSTRUCTORA).inscripciones.estudiantesCurso({ cursoId })
    const idsDisp = r.asignados.length === 0 ? r.disponibles.map((d) => d.studentId) : []
    expect(idsDisp).toContain(ESTUDIANTE_A.id)
    expect(idsDisp).toContain(ESTUDIANTE_B.id)
    expect(idsDisp).not.toContain(ESTUDIANTE_INACTIVO.id) // inactivo no asignable
    // El estudiante sin nombre se muestra por su email
    const b = r.disponibles.find((d) => d.studentId === ESTUDIANTE_B.id)!
    expect(b.nombre).toBe(ESTUDIANTE_B.email)
  })

  it('otro instructor no puede ver los estudiantes de un curso ajeno (NOT_FOUND)', async () => {
    await expect(
      callerComo(OTRO_INSTRUCTOR).inscripciones.estudiantesCurso({ cursoId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('requiere rol instructor (STUDENT → FORBIDDEN)', async () => {
    await expect(
      callerComo(ESTUDIANTE_A).inscripciones.estudiantesCurso({ cursoId }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('inscripciones.asignar', () => {
  it('asigna el curso, audita ASSIGN_COURSE y mueve al estudiante de disponible a asignado', async () => {
    await callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id })

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: ESTUDIANTE_A.id, courseId: cursoId } },
    })
    expect(enrollment).not.toBeNull()
    expect(enrollment!.assignedBy).toBe(INSTRUCTORA.id)

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ASSIGN_COURSE', resource: `Course:${cursoId}`, userId: INSTRUCTORA.id },
    })
    expect(audit).not.toBeNull()

    const r = await callerComo(INSTRUCTORA).inscripciones.estudiantesCurso({ cursoId })
    expect(r.asignados.map((a) => a.studentId)).toContain(ESTUDIANTE_A.id)
    expect(r.disponibles.map((d) => d.studentId)).not.toContain(ESTUDIANTE_A.id)
  })

  it('rechaza doble asignación (BAD_REQUEST) y asignar a un inactivo (NOT_FOUND)', async () => {
    await callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id })
    await expect(
      callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(
      callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_INACTIVO.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('otro instructor no puede asignar en un curso ajeno (NOT_FOUND, sin crear nada)', async () => {
    await expect(
      callerComo(OTRO_INSTRUCTOR).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await prisma.enrollment.count({ where: { courseId: cursoId } })).toBe(0)
  })
})

describe('inscripciones.revocar', () => {
  it('quita la asignación y audita REVOKE_ENROLLMENT', async () => {
    await callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id })
    await callerComo(INSTRUCTORA).inscripciones.revocar({ cursoId, studentId: ESTUDIANTE_A.id })

    expect(
      await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: ESTUDIANTE_A.id, courseId: cursoId } },
      }),
    ).toBeNull()
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'REVOKE_ENROLLMENT', userId: INSTRUCTORA.id },
    })
    expect(audit).not.toBeNull()
  })

  it('revocar algo no asignado da NOT_FOUND; otro instructor no puede revocar (NOT_FOUND)', async () => {
    await expect(
      callerComo(INSTRUCTORA).inscripciones.revocar({ cursoId, studentId: ESTUDIANTE_B.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    await callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id })
    await expect(
      callerComo(OTRO_INSTRUCTOR).inscripciones.revocar({ cursoId, studentId: ESTUDIANTE_A.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    // sigue inscrito (no se borró)
    expect(await prisma.enrollment.count({ where: { courseId: cursoId } })).toBe(1)
  })

  it('revocar crea un CourseBlock (expulsión autoritativa) con blockedBy del instructor', async () => {
    await callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id })
    await callerComo(INSTRUCTORA).inscripciones.revocar({ cursoId, studentId: ESTUDIANTE_A.id })

    const bloqueo = await prisma.courseBlock.findUnique({
      where: { studentId_courseId: { studentId: ESTUDIANTE_A.id, courseId: cursoId } },
    })
    expect(bloqueo).not.toBeNull()
    expect(bloqueo!.blockedBy).toBe(INSTRUCTORA.id)
  })
})

describe('inscripciones.asignar — limpieza de bloqueo', () => {
  it('re-asignar a un estudiante bloqueado borra el CourseBlock', async () => {
    // Bloqueo previo: asignar → revocar deja un CourseBlock
    await callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id })
    await callerComo(INSTRUCTORA).inscripciones.revocar({ cursoId, studentId: ESTUDIANTE_A.id })
    expect(
      await prisma.courseBlock.findUnique({
        where: { studentId_courseId: { studentId: ESTUDIANTE_A.id, courseId: cursoId } },
      }),
    ).not.toBeNull()

    // Re-asignar limpia el bloqueo y recrea la inscripción
    await callerComo(INSTRUCTORA).inscripciones.asignar({ cursoId, studentId: ESTUDIANTE_A.id })
    expect(
      await prisma.courseBlock.findUnique({
        where: { studentId_courseId: { studentId: ESTUDIANTE_A.id, courseId: cursoId } },
      }),
    ).toBeNull()
    expect(await prisma.enrollment.count({ where: { courseId: cursoId } })).toBe(1)
  })
})
