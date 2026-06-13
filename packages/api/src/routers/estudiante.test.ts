// Tests de integración del dashboard del estudiante.
// Regla crítica: solo cursos asignados via Enrollment y PUBLISHED —
// nunca cursos de otros estudiantes ni borradores/archivados.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const PREFIJO = 'test-dash'

const INSTRUCTORA: SessionUser = {
  id: `${PREFIJO}-instructora`,
  email: 'instructora-dash@test.dev',
  name: 'Dra. Test Dashboard',
  role: 'INSTRUCTOR',
}
const ESTUDIANTE: SessionUser = {
  id: `${PREFIJO}-estudiante`,
  email: 'estudiante-dash@test.dev',
  name: 'Estudiante Dashboard',
  role: 'STUDENT',
}
const OTRA_ESTUDIANTE: SessionUser = {
  id: `${PREFIJO}-otra`,
  email: 'otra-dash@test.dev',
  name: 'Otra Estudiante',
  role: 'STUDENT',
}

// Curso publicado y asignado: 2 secciones, 4 lecciones (1800s c/u donde aplica)
let cursoAsignadoId: string
let inscripcionId: string
let seccion1Id: string
let seccion2Id: string
let leccion1Id: string
let leccion2Id: string
let leccion3Id: string
let leccion4Id: string
// Curso publicado SIN asignar, y curso DRAFT asignado — no deben aparecer
let cursoNoAsignadoId: string
let cursoBorradorId: string

async function crearCurso(opts: {
  titulo: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  conLecciones?: boolean
}) {
  return prisma.course.create({
    data: {
      title: opts.titulo,
      description: 'Curso de prueba del dashboard del estudiante.',
      category: 'Pruebas',
      status: opts.status,
      totalDuration: opts.conLecciones ? 7200 : 0,
      instructorId: INSTRUCTORA.id,
      sections: opts.conLecciones
        ? {
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
              {
                title: 'Sección dos',
                order: 2,
                lessons: {
                  create: [
                    { title: 'Lección tres', order: 1, type: 'VIDEO', duration: 1800 },
                    { title: 'Material cuatro', order: 2, type: 'PDF' },
                  ],
                },
              },
            ],
          }
        : undefined,
    },
    include: {
      sections: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
    },
  })
}

// Acceso granular: dejar visible SOLO la sección 1 de la inscripción
async function restringirASeccion1() {
  await prisma.moduleAccess.create({
    data: { enrollmentId: inscripcionId, sectionId: seccion1Id, grantedBy: INSTRUCTORA.id },
  })
}

beforeAll(async () => {
  for (const u of [INSTRUCTORA, ESTUDIANTE, OTRA_ESTUDIANTE]) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, name: u.name, role: u.role },
    })
  }

  const asignado = await crearCurso({ titulo: 'Curso asignado', status: 'PUBLISHED', conLecciones: true })
  cursoAsignadoId = asignado.id
  seccion1Id = asignado.sections[0]!.id
  seccion2Id = asignado.sections[1]!.id
  leccion1Id = asignado.sections[0]!.lessons[0]!.id
  leccion2Id = asignado.sections[0]!.lessons[1]!.id
  leccion3Id = asignado.sections[1]!.lessons[0]!.id
  leccion4Id = asignado.sections[1]!.lessons[1]!.id

  cursoNoAsignadoId = (await crearCurso({ titulo: 'Curso ajeno', status: 'PUBLISHED', conLecciones: true })).id
  cursoBorradorId = (await crearCurso({ titulo: 'Curso borrador', status: 'DRAFT' })).id

  const inscripcion = await prisma.enrollment.create({
    data: { studentId: ESTUDIANTE.id, courseId: cursoAsignadoId, assignedBy: INSTRUCTORA.id },
  })
  inscripcionId = inscripcion.id
  // El borrador también está "asignado" — pero al no estar publicado no se ve
  await prisma.enrollment.create({
    data: { studentId: ESTUDIANTE.id, courseId: cursoBorradorId, assignedBy: INSTRUCTORA.id },
  })
})

beforeEach(async () => {
  await prisma.progress.deleteMany({ where: { enrollmentId: inscripcionId } })
  await prisma.calendarEvent.deleteMany({ where: { createdBy: INSTRUCTORA.id } })
  await prisma.moduleAccess.deleteMany({ where: { enrollmentId: inscripcionId } })
})

afterAll(async () => {
  await prisma.progress.deleteMany({ where: { enrollment: { studentId: ESTUDIANTE.id } } })
  await prisma.calendarEvent.deleteMany({ where: { createdBy: INSTRUCTORA.id } })
  await prisma.enrollment.deleteMany({ where: { studentId: ESTUDIANTE.id } })
  await prisma.course.deleteMany({ where: { instructorId: INSTRUCTORA.id } })
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIJO } } })
  await prisma.$disconnect()
})

describe('estudiante.dashboard — acceso', () => {
  it('rechaza sin sesión (UNAUTHORIZED)', async () => {
    await expect(callerComo(null).estudiante.dashboard()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('solo devuelve cursos asignados Y publicados', async () => {
    const r = await callerComo(ESTUDIANTE).estudiante.dashboard()
    const ids = r.cursos.map((c) => c.id)
    expect(ids).toContain(cursoAsignadoId)
    expect(ids).not.toContain(cursoNoAsignadoId) // publicado pero sin Enrollment
    expect(ids).not.toContain(cursoBorradorId) // asignado pero no publicado
  })

  it('una estudiante sin inscripciones recibe todo vacío (aislamiento)', async () => {
    const r = await callerComo(OTRA_ESTUDIANTE).estudiante.dashboard()
    expect(r.cursos).toHaveLength(0)
    expect(r.enCurso).toBeNull()
    expect(r.sesiones).toHaveLength(0)
  })

  it('un curso archivado desaparece del dashboard', async () => {
    await prisma.course.update({ where: { id: cursoAsignadoId }, data: { status: 'ARCHIVED' } })
    try {
      const r = await callerComo(ESTUDIANTE).estudiante.dashboard()
      expect(r.cursos.map((c) => c.id)).not.toContain(cursoAsignadoId)
    } finally {
      await prisma.course.update({ where: { id: cursoAsignadoId }, data: { status: 'PUBLISHED' } })
    }
  })
})

describe('estudiante.dashboard — progreso y hero', () => {
  it('sin progreso: 0%, marcado como nuevo y sin hero', async () => {
    const r = await callerComo(ESTUDIANTE).estudiante.dashboard()
    const curso = r.cursos.find((c) => c.id === cursoAsignadoId)!
    expect(curso.progreso).toBe(0)
    expect(curso.nuevo).toBe(true)
    expect(curso.lecciones).toBe(4)
    expect(curso.duracionSegundos).toBe(7200)
    expect(r.enCurso).toBeNull()
  })

  it('1 de 4 lecciones completadas = 25% y hero apunta a la lección en curso', async () => {
    await prisma.progress.create({
      data: {
        enrollmentId: inscripcionId,
        lessonId: leccion1Id,
        watchedSeconds: 1800,
        completedAt: new Date(Date.now() - 60_000),
      },
    })
    // Lección 3 tocada después, sin completar → es la que se retoma
    await prisma.progress.create({
      data: { enrollmentId: inscripcionId, lessonId: leccion3Id, watchedSeconds: 600, lastPosition: 600 },
    })

    const r = await callerComo(ESTUDIANTE).estudiante.dashboard()
    const curso = r.cursos.find((c) => c.id === cursoAsignadoId)!
    expect(curso.progreso).toBe(25)
    expect(curso.nuevo).toBe(false) // ya comenzó

    expect(r.enCurso).not.toBeNull()
    expect(r.enCurso!.cursoId).toBe(cursoAsignadoId)
    expect(r.enCurso!.leccionTitulo).toBe('Lección tres')
    expect(r.enCurso!.leccionNumero).toBe(3) // posición global: sección 1 (2) + 1
    expect(r.enCurso!.progreso).toBe(25)
    // Restante: lecciones 2, 3 y 4 (la 4 es PDF sin duración) = 3600
    expect(r.enCurso!.restanteSegundos).toBe(3600)
  })

  it('última lección tocada ya completada → el hero sugiere la primera pendiente', async () => {
    await prisma.progress.create({
      data: { enrollmentId: inscripcionId, lessonId: leccion2Id, watchedSeconds: 1800, completedAt: new Date() },
    })
    const r = await callerComo(ESTUDIANTE).estudiante.dashboard()
    expect(r.enCurso!.leccionTitulo).toBe('Lección uno')
    expect(r.enCurso!.leccionNumero).toBe(1)
  })

  it('curso 100% completado: sin hero y progreso 100', async () => {
    for (const lessonId of [leccion1Id, leccion2Id, leccion3Id, leccion4Id]) {
      await prisma.progress.create({
        data: { enrollmentId: inscripcionId, lessonId, watchedSeconds: 1800, completedAt: new Date() },
      })
    }
    const r = await callerComo(ESTUDIANTE).estudiante.dashboard()
    expect(r.cursos.find((c) => c.id === cursoAsignadoId)!.progreso).toBe(100)
    expect(r.enCurso).toBeNull()
  })
})

describe('estudiante.curso — vista con estado por lección', () => {
  it('rechaza sin sesión, sin inscripción y con curso no publicado', async () => {
    await expect(callerComo(null).estudiante.curso({ id: cursoAsignadoId })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    // Publicado pero sin Enrollment — mismo NOT_FOUND que un curso inexistente
    await expect(
      callerComo(ESTUDIANTE).estudiante.curso({ id: cursoNoAsignadoId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    // Asignado pero en borrador
    await expect(
      callerComo(ESTUDIANTE).estudiante.curso({ id: cursoBorradorId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('sin ModuleAccess: acceso total con estados ✓ / en progreso / pendiente', async () => {
    await prisma.progress.create({
      data: { enrollmentId: inscripcionId, lessonId: leccion1Id, watchedSeconds: 1800, completedAt: new Date() },
    })
    await prisma.progress.create({
      data: { enrollmentId: inscripcionId, lessonId: leccion2Id, watchedSeconds: 600 },
    })

    const r = await callerComo(ESTUDIANTE).estudiante.curso({ id: cursoAsignadoId })
    expect(r.secciones.every((s) => s.accesible)).toBe(true)
    expect(r.progreso).toBe(25)
    expect(r.leccionesTotales).toBe(4)
    expect(r.leccionesCompletadas).toBe(1)

    const estados = new Map(
      r.secciones.flatMap((s) => s.lecciones).map((l) => [l.id, l.estado]),
    )
    expect(estados.get(leccion1Id)).toBe('COMPLETADA')
    expect(estados.get(leccion2Id)).toBe('EN_PROGRESO')
    expect(estados.get(leccion3Id)).toBe('PENDIENTE')
    expect(estados.get(leccion4Id)).toBe('PENDIENTE')
  })

  it('con ModuleAccess a la sección 1: la sección 2 va 🔒 con títulos enmascarados', async () => {
    await restringirASeccion1()

    const r = await callerComo(ESTUDIANTE).estudiante.curso({ id: cursoAsignadoId })
    const s1 = r.secciones.find((s) => s.id === seccion1Id)!
    const s2 = r.secciones.find((s) => s.id === seccion2Id)!
    expect(s1.accesible).toBe(true)
    expect(s2.accesible).toBe(false)

    for (const leccion of s2.lecciones) {
      expect(leccion.estado).toBe('BLOQUEADA')
      expect(leccion.duracion).toBeNull()
      expect(leccion.titulo.endsWith('…')).toBe(true)
    }
    // El título completo NUNCA viaja: "Lección tres" se recorta
    const bloqueada = s2.lecciones.find((l) => l.id === leccion3Id)!
    expect(bloqueada.titulo).not.toBe('Lección tres')
    expect('Lección tres'.startsWith(bloqueada.titulo.slice(0, -1))).toBe(true)
  })

  it('una lección isPreview es visible aunque su sección esté bloqueada', async () => {
    await restringirASeccion1()
    await prisma.lesson.update({ where: { id: leccion4Id }, data: { isPreview: true } })
    try {
      const r = await callerComo(ESTUDIANTE).estudiante.curso({ id: cursoAsignadoId })
      const s2 = r.secciones.find((s) => s.id === seccion2Id)!
      const preview = s2.lecciones.find((l) => l.id === leccion4Id)!
      expect(preview.titulo).toBe('Material cuatro')
      expect(preview.estado).toBe('PENDIENTE')
      // Las demás de la sección siguen bloqueadas
      expect(s2.lecciones.find((l) => l.id === leccion3Id)!.estado).toBe('BLOQUEADA')
    } finally {
      await prisma.lesson.update({ where: { id: leccion4Id }, data: { isPreview: false } })
    }
  })
})

describe('estudiante.leccion — acceso a una lección', () => {
  it('devuelve metadata de una lección accesible con su estado', async () => {
    await prisma.progress.create({
      data: { enrollmentId: inscripcionId, lessonId: leccion1Id, watchedSeconds: 1800, completedAt: new Date() },
    })
    const r = await callerComo(ESTUDIANTE).estudiante.leccion({ id: leccion1Id })
    expect(r.titulo).toBe('Lección uno')
    expect(r.estado).toBe('COMPLETADA')
    expect(r.curso.id).toBe(cursoAsignadoId)
    expect(r.seccionTitulo).toBe('Sección uno')
  })

  it('una lección de sección bloqueada da NOT_FOUND aunque se conozca el id', async () => {
    await restringirASeccion1()
    await expect(
      callerComo(ESTUDIANTE).estudiante.leccion({ id: leccion3Id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    // ...pero una isPreview de esa misma sección sí se entrega
    await prisma.lesson.update({ where: { id: leccion4Id }, data: { isPreview: true } })
    try {
      const r = await callerComo(ESTUDIANTE).estudiante.leccion({ id: leccion4Id })
      expect(r.titulo).toBe('Material cuatro')
    } finally {
      await prisma.lesson.update({ where: { id: leccion4Id }, data: { isPreview: false } })
    }
  })

  it('sin inscripción al curso: NOT_FOUND; id inexistente: NOT_FOUND', async () => {
    await expect(
      callerComo(OTRA_ESTUDIANTE).estudiante.leccion({ id: leccion1Id }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      callerComo(ESTUDIANTE).estudiante.leccion({ id: 'no-existe' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('estudiante.dashboard — sesiones en vivo', () => {
  it('solo sesiones futuras de SUS cursos, en orden cronológico', async () => {
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000)
    const enUnDia = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000)

    await prisma.calendarEvent.createMany({
      data: [
        // De su curso: una pasada (fuera) y dos futuras (dentro, ordenadas)
        { courseId: cursoAsignadoId, title: 'Sesión pasada', startAt: ayer, endAt: ayer, createdBy: INSTRUCTORA.id },
        { courseId: cursoAsignadoId, title: 'Sesión mañana', startAt: enUnDia, endAt: enUnDia, createdBy: INSTRUCTORA.id, meetUrl: 'https://meet.google.com/test' },
        { courseId: cursoAsignadoId, title: 'Sesión próxima', startAt: enUnaHora, endAt: enUnaHora, createdBy: INSTRUCTORA.id },
        // De un curso NO asignado — nunca debe filtrarse al dashboard
        { courseId: cursoNoAsignadoId, title: 'Sesión ajena', startAt: enUnaHora, endAt: enUnaHora, createdBy: INSTRUCTORA.id },
      ],
    })

    const r = await callerComo(ESTUDIANTE).estudiante.dashboard()
    expect(r.sesiones.map((s) => s.titulo)).toEqual(['Sesión próxima', 'Sesión mañana'])
    expect(r.sesiones[1]!.meetUrl).toBe('https://meet.google.com/test')
    expect(r.sesiones[0]!.cursoTitulo).toBe('Curso asignado')
  })
})
