// Tests de integración del catálogo público "General" (catalogo.publicos +
// catalogo.inscribirme) y de cursos.cambiarVisibilidad.
// Reglas críticas: solo cursos PUBLISHED + isPublic son visibles sin sesión;
// la autoinscripción es idempotente y respeta ownership/visibilidad.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const PREFIJO = 'test-cat'

const INSTRUCTORA: SessionUser = {
  id: `${PREFIJO}-instructora`,
  email: 'cat-instructora@test.dev',
  name: 'Dra. Catálogo',
  role: 'INSTRUCTOR',
}
const USUARIO: SessionUser = {
  id: `${PREFIJO}-usuario`,
  email: 'cat-usuario@test.dev',
  name: 'Usuario Catálogo',
  role: 'STUDENT',
}

let cursoPublicoId: string
let cursoPrivadoId: string
let cursoBorradorId: string

beforeAll(async () => {
  for (const u of [INSTRUCTORA, USUARIO]) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role },
    })
  }

  cursoPublicoId = (
    await prisma.course.create({
      data: {
        title: 'Curso público de catálogo',
        description: 'Curso visible en el catálogo general.',
        category: 'Pruebas',
        status: 'PUBLISHED',
        isPublic: true,
        totalDuration: 3600,
        instructorId: INSTRUCTORA.id,
        sections: {
          create: [
            {
              title: 'Sección uno',
              order: 1,
              lessons: {
                create: [
                  { title: 'Lección uno', order: 1, type: 'VIDEO', duration: 1800 },
                  { title: 'Lección dos', order: 2, type: 'VIDEO', duration: 1800 },
                ],
              },
            },
          ],
        },
      },
    })
  ).id

  cursoPrivadoId = (
    await prisma.course.create({
      data: {
        title: 'Curso privado',
        description: 'Curso publicado pero solo para inscritos.',
        category: 'Pruebas',
        status: 'PUBLISHED',
        isPublic: false,
        instructorId: INSTRUCTORA.id,
      },
    })
  ).id

  cursoBorradorId = (
    await prisma.course.create({
      data: {
        title: 'Curso borrador',
        description: 'Curso aún no publicado, marcado público.',
        category: 'Pruebas',
        status: 'DRAFT',
        isPublic: true,
        instructorId: INSTRUCTORA.id,
      },
    })
  ).id
})

afterAll(async () => {
  await prisma.enrollment.deleteMany({
    where: { courseId: { in: [cursoPublicoId, cursoPrivadoId, cursoBorradorId] } },
  })
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: PREFIJO } } })
  await prisma.course.deleteMany({ where: { instructorId: INSTRUCTORA.id } })
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIJO } } })
  await prisma.$disconnect()
})

describe('catalogo.publicos', () => {
  it('lista cursos PUBLISHED + isPublic (sin sesión); excluye privados y borradores', async () => {
    const r = await callerComo(null).catalogo.publicos()

    const ids = r.map((c) => c.id)
    expect(ids).toContain(cursoPublicoId)
    expect(ids).not.toContain(cursoPrivadoId)
    expect(ids).not.toContain(cursoBorradorId)

    const publico = r.find((c) => c.id === cursoPublicoId)!
    expect(publico.lecciones).toBe(2)
    expect(publico.titulo).toBe('Curso público de catálogo')
    expect(publico.instructora).toBe(INSTRUCTORA.name)
    expect(publico.duracionSegundos).toBe(3600)
  })
})

describe('catalogo.inscribirme', () => {
  it('el usuario se inscribe en el curso público y se crea el Enrollment', async () => {
    const r = await callerComo(USUARIO).catalogo.inscribirme({ cursoId: cursoPublicoId })
    expect(r).toEqual({ ok: true })

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: USUARIO.id, courseId: cursoPublicoId } },
    })
    expect(enrollment).not.toBeNull()
    expect(enrollment!.assignedBy).toBe(USUARIO.id)
  })

  it('repetir la inscripción es idempotente (sigue habiendo un solo Enrollment)', async () => {
    const r = await callerComo(USUARIO).catalogo.inscribirme({ cursoId: cursoPublicoId })
    expect(r).toEqual({ ok: true })

    const total = await prisma.enrollment.count({
      where: { studentId: USUARIO.id, courseId: cursoPublicoId },
    })
    expect(total).toBe(1)
  })

  it('inscribirse en un curso privado da NOT_FOUND', async () => {
    await expect(
      callerComo(USUARIO).catalogo.inscribirme({ cursoId: cursoPrivadoId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('inscribirse en un curso borrador (no publicado) da NOT_FOUND', async () => {
    await expect(
      callerComo(USUARIO).catalogo.inscribirme({ cursoId: cursoBorradorId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('sin sesión da UNAUTHORIZED', async () => {
    await expect(
      callerComo(null).catalogo.inscribirme({ cursoId: cursoPublicoId }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('cursos.cambiarVisibilidad', () => {
  it('la instructora cambia isPublic del borrador y cursos.obtener refleja esPublico', async () => {
    await callerComo(INSTRUCTORA).cursos.cambiarVisibilidad({
      id: cursoBorradorId,
      esPublico: false,
    })
    let r = await callerComo(INSTRUCTORA).cursos.obtener({ id: cursoBorradorId })
    expect(r.esPublico).toBe(false)

    await callerComo(INSTRUCTORA).cursos.cambiarVisibilidad({
      id: cursoBorradorId,
      esPublico: true,
    })
    r = await callerComo(INSTRUCTORA).cursos.obtener({ id: cursoBorradorId })
    expect(r.esPublico).toBe(true)
  })

  it('un STUDENT no puede cambiar la visibilidad (FORBIDDEN)', async () => {
    await expect(
      callerComo(USUARIO).cursos.cambiarVisibilidad({ id: cursoBorradorId, esPublico: false }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
