// Tests de integración del router de quiz (Fase 4, tarea 4.5).
// Reglas críticas verificadas aquí:
//  - El score se calcula en el SERVIDOR (regla #12).
//  - La respuesta correcta NUNCA se expone al estudiante antes del envío (#13).
//  - Un intento aprobatorio marca la lección completada (progreso secuencial).
//  - Ownership de 3 niveles para la gestión de preguntas (regla #7).

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const PREFIJO = 'test-quiz'

const INSTRUCTORA: SessionUser = {
  id: `${PREFIJO}-instructora`,
  email: 'instructora-quiz@test.dev',
  name: 'Dra. Test Quiz',
  role: 'INSTRUCTOR',
}
const INTRUSO: SessionUser = {
  id: `${PREFIJO}-intruso`,
  email: 'intruso-quiz@test.dev',
  name: 'Instructor Intruso',
  role: 'INSTRUCTOR',
}
const ESTUDIANTE: SessionUser = {
  id: `${PREFIJO}-estudiante`,
  email: 'estudiante-quiz@test.dev',
  name: 'Estudiante Quiz',
  role: 'STUDENT',
}
const OTRA_ESTUDIANTE: SessionUser = {
  id: `${PREFIJO}-otra`,
  email: 'otra-quiz@test.dev',
  name: 'Otra Estudiante',
  role: 'STUDENT',
}

let cursoId: string
let inscripcionId: string
let quizId: string // lección QUIZ principal (primera → accesible)
let bloqueadaId: string // lección QUIZ siguiente (bloqueada hasta aprobar la 1ª)
// Ids de las 4 preguntas del quiz principal, con su opción correcta conocida
let q1: string
let q2: string
let q3: string
let q4: string

beforeAll(async () => {
  for (const u of [INSTRUCTORA, INTRUSO, ESTUDIANTE, OTRA_ESTUDIANTE]) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role },
    })
  }

  const curso = await prisma.course.create({
    data: {
      title: 'Curso con quiz (test)',
      description: 'Curso temporal para probar el backend de quiz.',
      category: 'Pruebas',
      status: 'PUBLISHED',
      instructorId: INSTRUCTORA.id,
      sections: {
        create: [
          {
            title: 'Sección única',
            order: 1,
            lessons: {
              create: [
                { title: 'Quiz principal', order: 1, type: 'QUIZ', passingScore: 70 },
                { title: 'Quiz siguiente', order: 2, type: 'QUIZ', passingScore: 70 },
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
  quizId = curso.sections[0]!.lessons[0]!.id
  bloqueadaId = curso.sections[0]!.lessons[1]!.id

  const inscripcion = await prisma.enrollment.create({
    data: { studentId: ESTUDIANTE.id, courseId: cursoId, assignedBy: INSTRUCTORA.id },
  })
  inscripcionId = inscripcion.id

  // 4 preguntas creadas por la instructora — correctas conocidas: A, B, C, D
  const api = callerComo(INSTRUCTORA)
  q1 = (
    await api.quiz.crearPregunta({
      leccionId: quizId,
      enunciado: '¿Pregunta uno?',
      opcionA: 'Correcta',
      opcionB: 'b',
      opcionC: 'c',
      opcionD: 'd',
      correcta: 'A',
      explicacion: 'Porque sí es A',
    })
  ).id
  q2 = (
    await api.quiz.crearPregunta({
      leccionId: quizId,
      enunciado: '¿Pregunta dos?',
      opcionA: 'a',
      opcionB: 'Correcta',
      opcionC: 'c',
      opcionD: 'd',
      correcta: 'B',
    })
  ).id
  q3 = (
    await api.quiz.crearPregunta({
      leccionId: quizId,
      enunciado: '¿Pregunta tres?',
      opcionA: 'a',
      opcionB: 'b',
      opcionC: 'Correcta',
      opcionD: 'd',
      correcta: 'C',
    })
  ).id
  q4 = (
    await api.quiz.crearPregunta({
      leccionId: quizId,
      enunciado: '¿Pregunta cuatro?',
      opcionA: 'a',
      opcionB: 'b',
      opcionC: 'c',
      opcionD: 'Correcta',
      correcta: 'D',
    })
  ).id
})

beforeEach(async () => {
  // Cada test parte sin intentos ni progreso (la completitud es pegajosa)
  await prisma.quizAttempt.deleteMany({ where: { enrollmentId: inscripcionId } })
  await prisma.progress.deleteMany({ where: { enrollmentId: inscripcionId } })
})

afterAll(async () => {
  await prisma.quizAttempt.deleteMany({ where: { enrollment: { studentId: ESTUDIANTE.id } } })
  await prisma.progress.deleteMany({ where: { enrollment: { studentId: ESTUDIANTE.id } } })
  await prisma.enrollment.deleteMany({ where: { courseId: cursoId } })
  await prisma.course.deleteMany({ where: { id: cursoId } })
  await prisma.auditLog.deleteMany({ where: { userId: { startsWith: PREFIJO } } })
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIJO } } })
  await prisma.$disconnect()
})

// Respuestas correctas completas del quiz principal
function todasCorrectas() {
  return [
    { preguntaId: q1, opcion: 'A' as const },
    { preguntaId: q2, opcion: 'B' as const },
    { preguntaId: q3, opcion: 'C' as const },
    { preguntaId: q4, opcion: 'D' as const },
  ]
}

describe('quiz — gestión de preguntas (instructor)', () => {
  it('crear asigna orden incremental, guarda la correcta y audita', async () => {
    const api = callerComo(INSTRUCTORA)
    const { passingScore, preguntas } = await api.quiz.preguntas({ leccionId: quizId })
    expect(passingScore).toBe(70)
    expect(preguntas.map((p) => p.orden)).toEqual([1, 2, 3, 4])
    expect(preguntas.map((p) => p.correcta)).toEqual(['A', 'B', 'C', 'D'])
    expect(preguntas[0]!.explicacion).toBe('Porque sí es A')

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `QuizQuestion:${q1}`, action: 'CREATE_QUIZ_QUESTION' },
    })
    expect(auditoria).not.toBeNull()
  })

  it('actualizar cambia campos de la pregunta', async () => {
    const api = callerComo(INSTRUCTORA)
    await api.quiz.actualizarPregunta({ id: q1, enunciado: '¿Pregunta uno (editada)?', correcta: 'B' })
    try {
      const { preguntas } = await api.quiz.preguntas({ leccionId: quizId })
      const editada = preguntas.find((p) => p.id === q1)!
      expect(editada.enunciado).toBe('¿Pregunta uno (editada)?')
      expect(editada.correcta).toBe('B')
    } finally {
      await api.quiz.actualizarPregunta({ id: q1, enunciado: '¿Pregunta uno?', correcta: 'A' })
    }
  })

  it('reordenar aplica el nuevo orden y rechaza conjuntos inválidos', async () => {
    const api = callerComo(INSTRUCTORA)
    const invertido = [q4, q3, q2, q1]
    await api.quiz.reordenarPreguntas({ leccionId: quizId, ordenIds: invertido })
    try {
      const { preguntas } = await api.quiz.preguntas({ leccionId: quizId })
      expect(preguntas.map((p) => p.id)).toEqual(invertido)
      expect(preguntas.map((p) => p.orden)).toEqual([1, 2, 3, 4])
    } finally {
      await api.quiz.reordenarPreguntas({ leccionId: quizId, ordenIds: [q1, q2, q3, q4] })
    }

    await expect(
      api.quiz.reordenarPreguntas({ leccionId: quizId, ordenIds: ['falso'] }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('configurarPassingScore actualiza el umbral (1-100)', async () => {
    const api = callerComo(INSTRUCTORA)
    await api.quiz.configurarPassingScore({ leccionId: quizId, passingScore: 50 })
    try {
      expect((await api.quiz.preguntas({ leccionId: quizId })).passingScore).toBe(50)
    } finally {
      await api.quiz.configurarPassingScore({ leccionId: quizId, passingScore: 70 })
    }
    await expect(
      api.quiz.configurarPassingScore({ leccionId: quizId, passingScore: 0 }),
    ).rejects.toThrow()
  })

  it('una lección que no es QUIZ da BAD_REQUEST', async () => {
    const api = callerComo(INSTRUCTORA)
    const seccion = await prisma.section.findFirstOrThrow({ where: { courseId: cursoId } })
    const texto = await prisma.lesson.create({
      data: { sectionId: seccion.id, title: 'No es quiz', order: 99, type: 'TEXT' },
    })
    try {
      await expect(api.quiz.preguntas({ leccionId: texto.id })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      })
    } finally {
      await prisma.lesson.delete({ where: { id: texto.id } })
    }
  })

  it('ownership: un instructor ajeno no puede gestionar el quiz', async () => {
    const intruso = callerComo(INTRUSO)
    await expect(intruso.quiz.preguntas({ leccionId: quizId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      intruso.quiz.crearPregunta({
        leccionId: quizId,
        enunciado: 'pirata',
        opcionA: 'a',
        opcionB: 'b',
        opcionC: 'c',
        opcionD: 'd',
        correcta: 'A',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(intruso.quiz.actualizarPregunta({ id: q1, correcta: 'D' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(intruso.quiz.eliminarPregunta({ id: q1 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      intruso.quiz.reordenarPreguntas({ leccionId: quizId, ordenIds: [q1, q2, q3, q4] }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      intruso.quiz.configurarPassingScore({ leccionId: quizId, passingScore: 80 }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('quiz — vista del estudiante (regla #13)', () => {
  it('preguntasEstudiante NO incluye la respuesta correcta ni la explicación', async () => {
    const r = await callerComo(ESTUDIANTE).quiz.preguntasEstudiante({ leccionId: quizId })
    expect(r.passingScore).toBe(70)
    expect(r.preguntas).toHaveLength(4)
    for (const p of r.preguntas) {
      expect(p).not.toHaveProperty('correcta')
      expect(p).not.toHaveProperty('explicacion')
      expect(p).toHaveProperty('enunciado')
      expect(p).toHaveProperty('opcionA')
    }
  })

  it('sin inscripción al curso: NOT_FOUND', async () => {
    await expect(
      callerComo(OTRA_ESTUDIANTE).quiz.preguntasEstudiante({ leccionId: quizId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      callerComo(OTRA_ESTUDIANTE).quiz.enviarIntento({ leccionId: quizId, respuestas: todasCorrectas() }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('respeta el progreso secuencial: el 2º quiz está bloqueado hasta aprobar el 1º', async () => {
    // Antes de aprobar el quiz principal, el siguiente está bloqueado
    await expect(
      callerComo(ESTUDIANTE).quiz.preguntasEstudiante({ leccionId: bloqueadaId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    // Aprobar el principal lo desbloquea
    await callerComo(ESTUDIANTE).quiz.enviarIntento({ leccionId: quizId, respuestas: todasCorrectas() })
    const r = await callerComo(ESTUDIANTE).quiz.preguntasEstudiante({ leccionId: bloqueadaId })
    expect(r.preguntas).toHaveLength(0) // el 2º quiz no tiene preguntas
  })
})

describe('quiz — envío de intento (score en el servidor)', () => {
  it('todas correctas: score 100, passed, y marca la lección completada', async () => {
    const r = await callerComo(ESTUDIANTE).quiz.enviarIntento({
      leccionId: quizId,
      respuestas: todasCorrectas(),
    })
    expect(r.score).toBe(100)
    expect(r.passed).toBe(true)
    expect(r.passingScore).toBe(70)
    // El feedback revela las correctas DESPUÉS del envío (lícito)
    expect(r.resultados).toHaveLength(4)
    expect(r.resultados.every((res) => res.acerto)).toBe(true)
    expect(r.resultados.find((res) => res.preguntaId === q1)!.correcta).toBe('A')

    // Progreso: lección marcada como completada
    const prog = await prisma.progress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: inscripcionId, lessonId: quizId } },
    })
    expect(prog?.completedAt).not.toBeNull()

    // QuizAttempt guardado con el score del servidor
    const intento = await prisma.quizAttempt.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: inscripcionId, lessonId: quizId } },
    })
    expect(intento?.score).toBe(100)
    expect(intento?.passed).toBe(true)

    // Auditoría SUBMIT_QUIZ
    const auditoria = await prisma.auditLog.findFirst({
      where: { userId: ESTUDIANTE.id, action: 'SUBMIT_QUIZ', resource: `Lesson:${quizId}` },
    })
    expect(auditoria).not.toBeNull()
  })

  it('3 de 4 (75%) aprueba; 2 de 4 (50%) no aprueba ni completa', async () => {
    const caller = callerComo(ESTUDIANTE)

    // 3 correctas (q4 mal) = 75 ≥ 70 → passed
    let r = await caller.quiz.enviarIntento({
      leccionId: quizId,
      respuestas: [
        { preguntaId: q1, opcion: 'A' },
        { preguntaId: q2, opcion: 'B' },
        { preguntaId: q3, opcion: 'C' },
        { preguntaId: q4, opcion: 'A' },
      ],
    })
    expect(r.score).toBe(75)
    expect(r.passed).toBe(true)
    expect(r.resultados.find((res) => res.preguntaId === q4)!.acerto).toBe(false)

    // Reset para probar el caso reprobatorio limpio
    await prisma.quizAttempt.deleteMany({ where: { enrollmentId: inscripcionId } })
    await prisma.progress.deleteMany({ where: { enrollmentId: inscripcionId } })

    // 2 correctas = 50 < 70 → no passed y NO completa la lección
    r = await caller.quiz.enviarIntento({
      leccionId: quizId,
      respuestas: [
        { preguntaId: q1, opcion: 'A' },
        { preguntaId: q2, opcion: 'B' },
        { preguntaId: q3, opcion: 'A' },
        { preguntaId: q4, opcion: 'A' },
      ],
    })
    expect(r.score).toBe(50)
    expect(r.passed).toBe(false)
    const prog = await prisma.progress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: inscripcionId, lessonId: quizId } },
    })
    expect(prog?.completedAt ?? null).toBeNull()
  })

  it('aprobar es pegajoso: reprobar después NO des-completa la lección', async () => {
    const caller = callerComo(ESTUDIANTE)
    await caller.quiz.enviarIntento({ leccionId: quizId, respuestas: todasCorrectas() })

    // Segundo intento reprobatorio
    const r = await caller.quiz.enviarIntento({
      leccionId: quizId,
      respuestas: [
        { preguntaId: q1, opcion: 'B' },
        { preguntaId: q2, opcion: 'A' },
        { preguntaId: q3, opcion: 'A' },
        { preguntaId: q4, opcion: 'A' },
      ],
    })
    expect(r.passed).toBe(false)
    // El último intento sobrescribe el score, pero la lección sigue completada
    const intento = await prisma.quizAttempt.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: inscripcionId, lessonId: quizId } },
    })
    expect(intento?.score).toBe(0)
    const prog = await prisma.progress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: inscripcionId, lessonId: quizId } },
    })
    expect(prog?.completedAt).not.toBeNull()
  })

  it('rechaza enviar con preguntas sin responder', async () => {
    await expect(
      callerComo(ESTUDIANTE).quiz.enviarIntento({
        leccionId: quizId,
        respuestas: [
          { preguntaId: q1, opcion: 'A' },
          { preguntaId: q2, opcion: 'B' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    // Sin intento ni progreso escritos
    expect(await prisma.quizAttempt.count({ where: { enrollmentId: inscripcionId } })).toBe(0)
    expect(await prisma.progress.count({ where: { enrollmentId: inscripcionId } })).toBe(0)
  })

  it('un quiz sin preguntas no se puede enviar', async () => {
    const caller = callerComo(ESTUDIANTE)
    // Desbloquear el 2º quiz (sin preguntas) aprobando el 1º
    await caller.quiz.enviarIntento({ leccionId: quizId, respuestas: todasCorrectas() })
    await expect(
      caller.quiz.enviarIntento({
        leccionId: bloqueadaId,
        respuestas: [{ preguntaId: 'cualquiera', opcion: 'A' }],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})

describe('quiz — miIntento (feedback persistente)', () => {
  it('null antes de enviar; devuelve el último intento después', async () => {
    const caller = callerComo(ESTUDIANTE)
    expect(await caller.quiz.miIntento({ leccionId: quizId })).toBeNull()

    await caller.quiz.enviarIntento({ leccionId: quizId, respuestas: todasCorrectas() })
    const r = await caller.quiz.miIntento({ leccionId: quizId })
    expect(r).not.toBeNull()
    expect(r!.score).toBe(100)
    expect(r!.passed).toBe(true)
    expect(r!.resultados).toHaveLength(4)
    expect(r!.resultados.find((res) => res.preguntaId === q1)!.elegida).toBe('A')
  })
})
