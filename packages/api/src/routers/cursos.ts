// Router de cursos — Fase 2: gestión de cursos del instructor.

import { z } from 'zod'
import { router, instructorProcedure } from '../trpc.js'

const cursoResumen = z.object({
  id: z.string(),
  titulo: z.string(),
  categoria: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  estudiantes: z.number().int(),
  secciones: z.number().int(),
  lecciones: z.number().int(),
  duracionSegundos: z.number().int(),
  actualizadoEl: z.date(),
})

export const cursosRouter = router({
  /** Mis cursos con métricas — SOLO los del instructor de la sesión (ownership, regla #7). */
  misCursos: instructorProcedure.output(z.array(cursoResumen)).query(async ({ ctx }) => {
    const cursos = await ctx.prisma.course.findMany({
      where: { instructorId: ctx.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { enrollments: true, sections: true } },
        sections: { select: { _count: { select: { lessons: true } } } },
      },
    })

    return cursos.map((curso) => ({
      id: curso.id,
      titulo: curso.title,
      categoria: curso.category,
      status: curso.status,
      estudiantes: curso._count.enrollments,
      secciones: curso._count.sections,
      lecciones: curso.sections.reduce((total, seccion) => total + seccion._count.lessons, 0),
      duracionSegundos: curso.totalDuration,
      actualizadoEl: curso.updatedAt,
    }))
  }),
})
