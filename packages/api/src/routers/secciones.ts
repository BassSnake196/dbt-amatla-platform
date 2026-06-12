// Router de secciones — estructura del curso (Fase 2).
// El ownership SIEMPRE se valida contra el curso padre (regla #7).

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, instructorProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { cursoPropio } from './cursos.js'
import type { Context, SessionUser } from '../context.js'

const leccionResumen = z.object({
  id: z.string(),
  titulo: z.string(),
  tipo: z.enum(['VIDEO', 'PDF', 'QUIZ', 'TEXT']),
  orden: z.number().int(),
  duracion: z.number().int().nullable(),
  esPreview: z.boolean(),
})

const seccionResumen = z.object({
  id: z.string(),
  titulo: z.string(),
  descripcion: z.string().nullable(),
  orden: z.number().int(),
  lecciones: z.array(leccionResumen),
})

const datosSeccion = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, 'El título necesita al menos 2 caracteres')
    .max(120, 'El título no puede pasar de 120 caracteres'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
})

/** Carga la sección verificando que el curso padre sea del instructor. */
export async function seccionPropia(ctx: Context & { user: SessionUser }, seccionId: string) {
  const seccion = await ctx.prisma.section.findUnique({
    where: { id: seccionId },
    include: { course: { select: { id: true, instructorId: true } } },
  })
  const esDuena =
    seccion &&
    (ctx.user.role === 'SUPER_ADMIN' || seccion.course.instructorId === ctx.user.id)
  if (!esDuena) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Sección no encontrada.' })
  }
  return seccion
}

export const seccionesRouter = router({
  /** Secciones de un curso propio, en orden, con conteo de lecciones. */
  listar: instructorProcedure
    .input(z.object({ cursoId: z.string() }))
    .output(z.array(seccionResumen))
    .query(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId)
      const secciones = await ctx.prisma.section.findMany({
        where: { courseId: input.cursoId },
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      })
      return secciones.map((s) => ({
        id: s.id,
        titulo: s.title,
        descripcion: s.description,
        orden: s.order,
        lecciones: s.lessons.map((l) => ({
          id: l.id,
          titulo: l.title,
          tipo: l.type,
          orden: l.order,
          duracion: l.duration,
          esPreview: l.isPreview,
        })),
      }))
    }),

  /** Crear sección al final del curso. */
  crear: instructorProcedure
    .input(datosSeccion.extend({ cursoId: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId)
      const seccion = await ctx.prisma.$transaction(async (tx) => {
        const ultima = await tx.section.aggregate({
          where: { courseId: input.cursoId },
          _max: { order: true },
        })
        const creada = await tx.section.create({
          data: {
            courseId: input.cursoId,
            title: input.titulo,
            description: input.descripcion || null,
            order: (ultima._max.order ?? 0) + 1,
          },
        })
        await auditFromRequest(
          ctx,
          'CREATE_SECTION',
          auditResource('Section', creada.id),
          { cursoId: input.cursoId, titulo: input.titulo },
          tx,
        )
        return creada
      })
      return { id: seccion.id }
    }),

  /** Renombrar / cambiar descripción de una sección propia. */
  actualizar: instructorProcedure
    .input(datosSeccion.partial().extend({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await seccionPropia(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.section.update({
          where: { id: input.id },
          data: {
            ...(input.titulo !== undefined && { title: input.titulo }),
            ...(input.descripcion !== undefined && { description: input.descripcion || null }),
          },
        })
        await auditFromRequest(ctx, 'UPDATE_SECTION', auditResource('Section', input.id), undefined, tx)
      })
      return { id: input.id }
    }),

  /** Eliminar sección (sus lecciones caen en cascada — confirmar en UI). */
  eliminar: instructorProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const seccion = await seccionPropia(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.section.delete({ where: { id: input.id } })
        await auditFromRequest(
          ctx,
          'DELETE_SECTION',
          auditResource('Section', input.id),
          { cursoId: seccion.course.id, titulo: seccion.title },
          tx,
        )
      })
      return { id: input.id }
    }),

  /**
   * Reordenar TODAS las secciones de un curso (drag & drop).
   * Recibe los ids en el nuevo orden — debe ser exactamente el conjunto actual.
   */
  reordenar: instructorProcedure
    .input(z.object({ cursoId: z.string(), ordenIds: z.array(z.string()).min(1) }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.cursoId)

      const actuales = await ctx.prisma.section.findMany({
        where: { courseId: input.cursoId },
        select: { id: true },
      })
      const idsActuales = new Set(actuales.map((s) => s.id))
      const idsRecibidos = new Set(input.ordenIds)
      const mismoConjunto =
        idsActuales.size === idsRecibidos.size &&
        [...idsActuales].every((id) => idsRecibidos.has(id))
      if (!mismoConjunto) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El nuevo orden no coincide con las secciones del curso.',
        })
      }

      await ctx.prisma.$transaction(async (tx) => {
        // Dos pasos para no chocar con valores intermedios duplicados
        for (const [indice, id] of input.ordenIds.entries()) {
          await tx.section.update({ where: { id }, data: { order: indice + 1 } })
        }
        await auditFromRequest(
          ctx,
          'REORDER_SECTIONS',
          auditResource('Course', input.cursoId),
          { orden: input.ordenIds },
          tx,
        )
      })
      return { ok: true as const }
    }),
})
