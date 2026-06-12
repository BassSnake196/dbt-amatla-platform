// Router de lecciones — contenido de cada sección (Fase 2).
// Ownership de tres niveles: lección → sección → curso.instructorId (regla #7).
// El contenido real (videoId de Stream / fileKey de R2 / texto) se conecta
// en las tareas de upload — aquí se gestiona la metadata y el orden.

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, instructorProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { seccionPropia } from './secciones.js'
import type { Context, SessionUser } from '../context.js'

const datosLeccion = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, 'El título necesita al menos 2 caracteres')
    .max(120, 'El título no puede pasar de 120 caracteres'),
  tipo: z.enum(['VIDEO', 'PDF', 'TEXT'], {
    errorMap: () => ({ message: 'El tipo debe ser VIDEO, PDF o TEXT' }),
  }),
})

/** Carga la lección verificando la cadena de ownership completa. */
export async function leccionPropia(ctx: Context & { user: SessionUser }, leccionId: string) {
  const leccion = await ctx.prisma.lesson.findUnique({
    where: { id: leccionId },
    include: { section: { include: { course: { select: { id: true, instructorId: true } } } } },
  })
  const esDuena =
    leccion &&
    (ctx.user.role === 'SUPER_ADMIN' || leccion.section.course.instructorId === ctx.user.id)
  if (!esDuena) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
  }
  return leccion
}

export const leccionesRouter = router({
  /** Crear lección al final de una sección propia. */
  crear: instructorProcedure
    .input(datosLeccion.extend({ seccionId: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await seccionPropia(ctx, input.seccionId)
      const leccion = await ctx.prisma.$transaction(async (tx) => {
        const ultima = await tx.lesson.aggregate({
          where: { sectionId: input.seccionId },
          _max: { order: true },
        })
        const creada = await tx.lesson.create({
          data: {
            sectionId: input.seccionId,
            title: input.titulo,
            type: input.tipo,
            order: (ultima._max.order ?? 0) + 1,
          },
        })
        await auditFromRequest(
          ctx,
          'CREATE_LESSON',
          auditResource('Lesson', creada.id),
          { seccionId: input.seccionId, titulo: input.titulo, tipo: input.tipo },
          tx,
        )
        return creada
      })
      return { id: leccion.id }
    }),

  /** Renombrar / cambiar tipo / marcar como preview una lección propia. */
  actualizar: instructorProcedure
    .input(
      datosLeccion.partial().extend({
        id: z.string(),
        esPreview: z.boolean().optional(),
      }),
    )
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await leccionPropia(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.lesson.update({
          where: { id: input.id },
          data: {
            ...(input.titulo !== undefined && { title: input.titulo }),
            ...(input.tipo !== undefined && { type: input.tipo }),
            ...(input.esPreview !== undefined && { isPreview: input.esPreview }),
          },
        })
        await auditFromRequest(
          ctx,
          'UPDATE_LESSON',
          auditResource('Lesson', input.id),
          { campos: Object.keys(input).filter((k) => k !== 'id') },
          tx,
        )
      })
      return { id: input.id }
    }),

  /** Eliminar lección propia (su progreso y comentarios caen en cascada). */
  eliminar: instructorProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const leccion = await leccionPropia(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.lesson.delete({ where: { id: input.id } })
        await auditFromRequest(
          ctx,
          'DELETE_LESSON',
          auditResource('Lesson', input.id),
          { seccionId: leccion.sectionId, titulo: leccion.title },
          tx,
        )
      })
      return { id: input.id }
    }),

  /** Reordenar TODAS las lecciones de una sección (drag & drop). */
  reordenar: instructorProcedure
    .input(z.object({ seccionId: z.string(), ordenIds: z.array(z.string()).min(1) }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await seccionPropia(ctx, input.seccionId)

      const actuales = await ctx.prisma.lesson.findMany({
        where: { sectionId: input.seccionId },
        select: { id: true },
      })
      const idsActuales = new Set(actuales.map((l) => l.id))
      const idsRecibidos = new Set(input.ordenIds)
      const mismoConjunto =
        idsActuales.size === idsRecibidos.size &&
        [...idsActuales].every((id) => idsRecibidos.has(id))
      if (!mismoConjunto) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El nuevo orden no coincide con las lecciones de la sección.',
        })
      }

      await ctx.prisma.$transaction(async (tx) => {
        for (const [indice, id] of input.ordenIds.entries()) {
          await tx.lesson.update({ where: { id }, data: { order: indice + 1 } })
        }
        await auditFromRequest(
          ctx,
          'REORDER_LESSONS',
          auditResource('Section', input.seccionId),
          { orden: input.ordenIds },
          tx,
        )
      })
      return { ok: true as const }
    }),
})
