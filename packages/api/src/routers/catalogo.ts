// Router del catálogo público "General" — Fase 4: cursos PUBLISHED + isPublic
// visibles sin sesión, y autoinscripción del estudiante autenticado.

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Prisma } from '@amatla/db'
import { router, publicProcedure, protectedProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { obtenerAlmacen } from '../almacen.js'

const cursoPublico = z.object({
  id: z.string(),
  titulo: z.string(),
  categoria: z.string(),
  instructora: z.string(),
  // URL firmada on-demand del thumbnail (regla #10: nunca se guarda la URL)
  thumbnailUrl: z.string().nullable(),
  lecciones: z.number().int(),
  duracionSegundos: z.number().int(),
})

export const catalogoRouter = router({
  /**
   * Catálogo público "General": cursos PUBLISHED y marcados isPublic=true.
   * Sin sesión (publicProcedure) — visible para cualquier visitante.
   */
  publicos: publicProcedure.output(z.array(cursoPublico)).query(async ({ ctx }) => {
    const cursos = await ctx.prisma.course.findMany({
      where: { status: 'PUBLISHED', isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: {
        instructor: { select: { name: true } },
        sections: { select: { _count: { select: { lessons: true } } } },
      },
    })

    return cursos.map((curso) => ({
      id: curso.id,
      titulo: curso.title,
      categoria: curso.category,
      instructora: curso.instructor.name ?? 'Equipo DBT.Amatla',
      thumbnailUrl: curso.thumbnail ? obtenerAlmacen().urlLectura(curso.thumbnail).url : null,
      lecciones: curso.sections.reduce((total, seccion) => total + seccion._count.lessons, 0),
      duracionSegundos: curso.totalDuration,
    }))
  }),

  /**
   * Autoinscripción del estudiante de la sesión a un curso del catálogo
   * público (PUBLISHED + isPublic). Idempotente: si ya está inscrito, no
   * crea otro Enrollment. Enrollment + auditoría en una transacción (regla #4).
   */
  inscribirme: protectedProcedure
    .input(z.object({ cursoId: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const curso = await ctx.prisma.course.findFirst({
        where: { id: input.cursoId, status: 'PUBLISHED', isPublic: true },
        select: { id: true },
      })
      if (!curso) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Curso no disponible.' })
      }

      const inscripcionExistente = await ctx.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: ctx.user.id, courseId: input.cursoId } },
        select: { id: true },
      })
      if (inscripcionExistente) {
        return { ok: true as const }
      }

      try {
        await ctx.prisma.$transaction(async (tx) => {
          await tx.enrollment.create({
            data: {
              studentId: ctx.user.id,
              courseId: input.cursoId,
              assignedBy: ctx.user.id,
            },
          })
          await auditFromRequest(
            ctx,
            'ASSIGN_COURSE',
            auditResource('Course', input.cursoId),
            { autoinscripcion: true, studentId: ctx.user.id },
            tx,
          )
        })
      } catch (error) {
        // El @@unique([studentId, courseId]) impide doble inscripción (carrera)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return { ok: true as const }
        }
        throw error
      }
      return { ok: true as const }
    }),
})
