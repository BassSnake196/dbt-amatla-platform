// Tests de integración del router de progreso (Fase 4).
// RBAC, ownership y cálculo de % de progreso/estado por lección.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const PREFIJO = 'test-prog'

const INSTRUCTORA: SessionUser = {
  id: `${PREFIJO}-instructora`,
  email: 'prog-instructora@test.dev',
  name: 'Dra. Progreso',
  role: 'INSTRUCTOR',
}
const OTRO_INSTRUCTOR: SessionUser = {
  id: `${PREFIJO}-otro`,
  email: 'prog-otro@test.dev',
  name: 'Otro Instructor',
  role: 'INSTRUCTOR',
}
const ESTUDIANTE: SessionUser = {
  id: `${PREFIJO}-estudiante`,
  email: 'prog-estudiante@test.dev',
  name: 'Estudiante Progreso',
  role: 'STUDENT',
}
const ESTUDIANTE_SIN_INSCRIPCION: SessionUser = {
  id: `${PREFIJO}-sin-insc`,
  email: 'prog-sin-insc@test.dev',
  name: 'Sin Inscripcion',
  role: 'STUDENT',
}

let cursoId: string
let videoId: string
let textoId: string
let quizId: string
let enrollmentId: string

beforeAll(async () => {
  for (const u of [INSTRUCTORA, OTRO_INSTRUCTOR, ESTUDIANTE, ESTUDIANTE_SIN_INSCRIPCION]) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role },
    })
  }

  const curso = await prisma.course.create({
    data: {
      title: 'Curso para progreso (test)',
      description: 'Curso temporal para probar el router de progreso.',
      category: 'Pruebas',
      instructorId: INSTRUCTORA.id,
      sections: {
        create: [
          {
            title: 'Sección única',
            order: 1,
            lessons: {
              create: [
                { title: 'Lección video', order: 1, type: 'VIDEO', duration: 300 },
                { title: 'Lección texto', order: 2, type: 'TEXT', content: '<p>Hola</p>' },
                { title: 'Lección quiz', order: 3, type: 'QUIZ', passingScore: 70 },
              ],
            },
          },
        ],
      },
    },
    include: {
      sections: { include: { lessons: { orderBy: { order: 'asc' } } } },
    },
  })
  cursoId = curso.id
  videoId = curso.sections[0]!.lessons[0]!.id
  textoId = curso.sections[0]!.lessons[1]!.id
  quizId = curso.sections[0]!.lessons[2]!.id

  const inscripcion = await prisma.enrollment.create({
    data: { studentId: ESTUDIANTE.id, courseId: cursoId, assignedBy: INSTRUCTORA.id },
  })
  enrollmentId = inscripcion.id

  // Lección video: completada
  await prisma.progress.create({
    data: { enrollmentId, lessonId: videoId, completedAt: new Date(), watchedSeconds: 300 },
  })
  // Lección texto: tocada pero no completada (en progreso)
  await prisma.progress.create({
    data: { enrollmentId, lessonId: textoId, completedAt: null },
  })
  // La lección quiz no tiene progress (pendiente), pero sí un intento
  await prisma.quizAttempt.create({
    data: {
      enrollmentId,
      lessonId: quizId,
      answers: {},
      score: 80,
      passed: true,
    },
  })
})

afterAll(async () => {
  await prisma.quizAttempt.deleteMany({ where: { enrollmentId } })
  await prisma.progress.deleteMany({ where: { enrollmentId } })
  await prisma.enrollment.deleteMany({ where: { courseId: cursoId } })
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: PREFIJO } } })
  await prisma.course.deleteMany({ where: { id: cursoId } })
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIJO } } })
  await prisma.$disconnect()
})

describe('progreso.curso', () => {
  it('la instructora obtiene el progreso de sus estudiantes', async () => {
    const r = await callerComo(INSTRUCTORA).progreso.curso({ cursoId })

    expect(r.cursoTitulo).toBe('Curso para progreso (test)')
    expect(r.leccionesTotales).toBe(3)
    expect(r.estudiantes).toHaveLength(1)

    const est = r.estudiantes[0]!
    expect(est.studentId).toBe(ESTUDIANTE.id)
    expect(est.nombre).toBe(ESTUDIANTE.name)
    expect(est.email).toBe(ESTUDIANTE.email)
    expect(est.leccionesCompletadas).toBe(1)
    expect(est.progreso).toBe(33) // 1/3 -> 33
    expect(est.ultimoAcceso).not.toBeNull()
  })

  it('otro instructor no puede ver el progreso de un curso ajeno (NOT_FOUND)', async () => {
    await expect(callerComo(OTRO_INSTRUCTOR).progreso.curso({ cursoId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('requiere rol instructor (STUDENT -> FORBIDDEN)', async () => {
    await expect(callerComo(ESTUDIANTE).progreso.curso({ cursoId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('progreso.estudiante', () => {
  it('la instructora obtiene el detalle por lección del estudiante', async () => {
    const r = await callerComo(INSTRUCTORA).progreso.estudiante({
      cursoId,
      studentId: ESTUDIANTE.id,
    })

    expect(r.estudiante.nombre).toBe(ESTUDIANTE.name)
    expect(r.estudiante.email).toBe(ESTUDIANTE.email)
    expect(r.leccionesTotales).toBe(3)
    expect(r.leccionesCompletadas).toBe(1)
    expect(r.progreso).toBe(33)
    expect(r.secciones).toHaveLength(1)

    const lecciones = r.secciones[0]!.lecciones
    expect(lecciones).toHaveLength(3)

    const video = lecciones.find((l) => l.id === videoId)!
    expect(video.estado).toBe('COMPLETADA')
    expect(video.completadaEl).not.toBeNull()

    const texto = lecciones.find((l) => l.id === textoId)!
    expect(texto.estado).toBe('EN_PROGRESO')
    expect(texto.completadaEl).toBeNull()

    const quiz = lecciones.find((l) => l.id === quizId)!
    expect(quiz.estado).toBe('PENDIENTE')
    expect(quiz.completadaEl).toBeNull()
    expect(quiz.intentoQuiz).not.toBeNull()
    expect(quiz.intentoQuiz!.score).toBe(80)
    expect(quiz.intentoQuiz!.passed).toBe(true)
  })

  it('un studentId no inscrito da NOT_FOUND', async () => {
    await expect(
      callerComo(INSTRUCTORA).progreso.estudiante({
        cursoId,
        studentId: ESTUDIANTE_SIN_INSCRIPCION.id,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('otro instructor no puede ver el detalle de un curso ajeno (NOT_FOUND)', async () => {
    await expect(
      callerComo(OTRO_INSTRUCTOR).progreso.estudiante({ cursoId, studentId: ESTUDIANTE.id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
