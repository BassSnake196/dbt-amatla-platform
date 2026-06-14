// Router de inscripciones (Enrollment) — Fase 4: el instructor/admin asigna un
// curso COMPLETO a un estudiante. La asignación granular por secciones
// (ModuleAccess) es una tarea posterior — aquí "curso completo" = Enrollment
// SIN filas de ModuleAccess (regla: sin filas = acceso total).

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Prisma } from '@amatla/db'
import { router, instructorProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { cursoPropio } from './cursos.js'

const estudianteAsignado = z.object({
  studentId: z.string(),
  nombre: z.string(), // name ?? email — siempre algo legible
  email: z.string(),
  asignadoEl: z.date(),
})

const estudianteDisponible = z.object({
  studentId: z.string(),
  nombre: z.string(),
  email: z.string(),
})

export const inscripcionesRouter = router({
  /**
   * Estudiantes de un curso propio: los ya asignados y los disponibles para
   * asignar (rol STUDENT activos que aún no están inscritos). Una sola llamada
   * alimenta la página /instructor/cursos/[id]/estudiantes.
   */
  estudiantesCurso: instructorProcedure
    .input(z.object({ cursoId: z.string() }))
    .output(
      z.object({
        asignados: z.array(estudianteAsignado),
        disponibles: z.array(estudianteDisponible),
      }),
    )
    .query(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId) // ownership (regla #7)

      const inscripciones = await ctx.prisma.enrollment.findMany({
        where: { courseId: input.cursoId },
        orderBy: { enrolledAt: 'desc' },
        include: { student: { select: { id: true, name: true, email: true } } },
      })

      const disponibles = await ctx.prisma.user.findMany({
        where: {
          role: 'STUDENT',
          isActive: true,
          // que no estén ya inscritos en este curso
          NOT: { enrollments: { some: { courseId: input.cursoId } } },
        },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        select: { id: true, name: true, email: true },
      })

      return {
        asignados: inscripciones.map((i) => ({
          studentId: i.student.id,
          nombre: i.student.name ?? i.student.email,
          email: i.student.email,
          asignadoEl: i.enrolledAt,
        })),
        disponibles: disponibles.map((u) => ({
          studentId: u.id,
          nombre: u.name ?? u.email,
          email: u.email,
        })),
      }
    }),

  /**
   * Asignar el curso completo a un estudiante (crea Enrollment).
   * Enrollment + auditoría en una transacción (regla #4).
   */
  asignar: instructorProcedure
    .input(z.object({ cursoId: z.string(), studentId: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId)

      // El destinatario debe ser un STUDENT activo (no confiar en el cliente)
      const estudiante = await ctx.prisma.user.findFirst({
        where: { id: input.studentId, role: 'STUDENT', isActive: true },
        select: { id: true },
      })
      if (!estudiante) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Estudiante no encontrado.' })
      }

      try {
        await ctx.prisma.$transaction(async (tx) => {
          // Re-agregar a un estudiante limpia un bloqueo previo (decisión:
          // "bloqueo hasta re-asignar"): el instructor recupera el control.
          await tx.courseBlock.deleteMany({
            where: { studentId: input.studentId, courseId: input.cursoId },
          })
          await tx.enrollment.create({
            data: {
              studentId: input.studentId,
              courseId: input.cursoId,
              assignedBy: ctx.user.id,
            },
          })
          await auditFromRequest(
            ctx,
            'ASSIGN_COURSE',
            auditResource('Course', input.cursoId),
            { studentId: input.studentId },
            tx,
          )
        })
      } catch (error) {
        // El @@unique([studentId, courseId]) impide doble inscripción
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Este estudiante ya tiene el curso asignado.',
          })
        }
        throw error
      }
      return { ok: true as const }
    }),

  /**
   * Quitar la asignación (borra el Enrollment). OJO: el cascade del schema
   * elimina también el progreso, las notas y el acceso granular de ese
   * estudiante en el curso — quitar y reasignar empieza de cero.
   */
  revocar: instructorProcedure
    .input(z.object({ cursoId: z.string(), studentId: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId)

      const inscripcion = await ctx.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: input.studentId, courseId: input.cursoId } },
        select: { id: true },
      })
      if (!inscripcion) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Inscripción no encontrada.' })
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.enrollment.delete({ where: { id: inscripcion.id } })
        // Bloqueo autoritativo: aunque el curso sea público, el estudiante NO
        // podrá re-inscribirse solo. Re-asignarlo (asignar) limpia el bloqueo.
        await tx.courseBlock.upsert({
          where: { studentId_courseId: { studentId: input.studentId, courseId: input.cursoId } },
          create: { studentId: input.studentId, courseId: input.cursoId, blockedBy: ctx.user.id },
          update: { blockedBy: ctx.user.id },
        })
        await auditFromRequest(
          ctx,
          'REVOKE_ENROLLMENT',
          auditResource('Enrollment', inscripcion.id),
          { studentId: input.studentId, cursoId: input.cursoId },
          tx,
        )
      })
      return { ok: true as const }
    }),
})
