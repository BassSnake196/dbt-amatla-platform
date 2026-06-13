// Router de progreso — Fase 4: el instructor consulta el avance de sus
// estudiantes en un curso (resumen) y el detalle por lección de un
// estudiante concreto.

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, instructorProcedure } from '../trpc.js'
import { cursoPropio } from './cursos.js'

const estudianteProgreso = z.object({
  studentId: z.string(),
  nombre: z.string(), // name ?? email — siempre algo legible
  email: z.string(),
  progreso: z.number().int().min(0).max(100),
  leccionesCompletadas: z.number().int(),
  ultimoAcceso: z.date().nullable(),
})

const leccionDetalle = z.object({
  id: z.string(),
  titulo: z.string(),
  tipo: z.enum(['VIDEO', 'PDF', 'QUIZ', 'TEXT']),
  estado: z.enum(['COMPLETADA', 'EN_PROGRESO', 'PENDIENTE']),
  completadaEl: z.date().nullable(),
  intentoQuiz: z
    .object({
      score: z.number().int(),
      passed: z.boolean(),
      fecha: z.date(),
    })
    .nullable(),
})

export const progresoRouter = router({
  /**
   * Resumen de progreso de todos los estudiantes inscritos en un curso propio:
   * % completado, lecciones completadas y último acceso (máximo updatedAt de
   * su progreso). Alimenta la página /instructor/cursos/[id]/progreso.
   */
  curso: instructorProcedure
    .input(z.object({ cursoId: z.string() }))
    .output(
      z.object({
        cursoTitulo: z.string(),
        leccionesTotales: z.number().int(),
        estudiantes: z.array(estudianteProgreso),
      }),
    )
    .query(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId) // ownership (regla #7)

      const curso = await ctx.prisma.course.findUniqueOrThrow({
        where: { id: input.cursoId },
        select: {
          title: true,
          sections: { select: { lessons: { select: { id: true } } } },
          enrollments: {
            include: {
              student: { select: { id: true, name: true, email: true } },
              progress: { select: { lessonId: true, completedAt: true, updatedAt: true } },
            },
          },
        },
      })

      const leccionesTotales = curso.sections.reduce((n, s) => n + s.lessons.length, 0)

      const estudiantes = curso.enrollments.map((inscripcion) => {
        const completadas = inscripcion.progress.filter((p) => p.completedAt !== null).length
        const ultimoAcceso = inscripcion.progress.reduce<Date | null>(
          (max, p) => (max === null || p.updatedAt > max ? p.updatedAt : max),
          null,
        )
        return {
          studentId: inscripcion.student.id,
          nombre: inscripcion.student.name ?? inscripcion.student.email,
          email: inscripcion.student.email,
          progreso:
            leccionesTotales === 0 ? 0 : Math.round((completadas / leccionesTotales) * 100),
          leccionesCompletadas: completadas,
          ultimoAcceso,
        }
      })

      estudiantes.sort((a, b) => a.nombre.localeCompare(b.nombre))

      return {
        cursoTitulo: curso.title,
        leccionesTotales,
        estudiantes,
      }
    }),

  /**
   * Detalle de progreso de un estudiante en un curso propio: estado de cada
   * lección (completada / en progreso / pendiente) y, para las QUIZ, el
   * último intento si existe.
   */
  estudiante: instructorProcedure
    .input(z.object({ cursoId: z.string(), studentId: z.string() }))
    .output(
      z.object({
        estudiante: z.object({ nombre: z.string(), email: z.string() }),
        progreso: z.number().int().min(0).max(100),
        leccionesTotales: z.number().int(),
        leccionesCompletadas: z.number().int(),
        secciones: z.array(
          z.object({
            titulo: z.string(),
            lecciones: z.array(leccionDetalle),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId) // ownership (regla #7)

      const inscripcion = await ctx.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: input.studentId, courseId: input.cursoId } },
        include: { student: { select: { name: true, email: true } } },
      })
      if (!inscripcion) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Estudiante no inscrito.' })
      }

      const curso = await ctx.prisma.course.findUniqueOrThrow({
        where: { id: input.cursoId },
        select: {
          sections: {
            orderBy: { order: 'asc' },
            select: {
              title: true,
              lessons: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, type: true },
              },
            },
          },
        },
      })

      const progresoFilas = await ctx.prisma.progress.findMany({
        where: { enrollmentId: inscripcion.id },
        select: { lessonId: true, completedAt: true },
      })
      const porLeccion = new Map(progresoFilas.map((p) => [p.lessonId, p]))

      const intentos = await ctx.prisma.quizAttempt.findMany({
        where: { enrollmentId: inscripcion.id },
        select: { lessonId: true, score: true, passed: true, attemptedAt: true },
      })
      const intentoPorLeccion = new Map(intentos.map((i) => [i.lessonId, i]))

      let leccionesTotales = 0
      let leccionesCompletadas = 0

      const secciones = curso.sections.map((seccion) => ({
        titulo: seccion.title,
        lecciones: seccion.lessons.map((leccion) => {
          leccionesTotales += 1
          const progreso = porLeccion.get(leccion.id)
          const estado =
            progreso?.completedAt != null
              ? ('COMPLETADA' as const)
              : progreso !== undefined
                ? ('EN_PROGRESO' as const)
                : ('PENDIENTE' as const)
          if (estado === 'COMPLETADA') leccionesCompletadas += 1

          const intento = intentoPorLeccion.get(leccion.id)
          const intentoQuiz =
            leccion.type === 'QUIZ' && intento
              ? { score: intento.score, passed: intento.passed, fecha: intento.attemptedAt }
              : null

          return {
            id: leccion.id,
            titulo: leccion.title,
            tipo: leccion.type,
            estado,
            completadaEl: progreso?.completedAt ?? null,
            intentoQuiz,
          }
        }),
      }))

      return {
        estudiante: {
          nombre: inscripcion.student.name ?? inscripcion.student.email,
          email: inscripcion.student.email,
        },
        progreso:
          leccionesTotales === 0
            ? 0
            : Math.round((leccionesCompletadas / leccionesTotales) * 100),
        leccionesTotales,
        leccionesCompletadas,
        secciones,
      }
    }),
})
