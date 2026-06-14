// Router de cursos — Fase 2: gestión de cursos del instructor.

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Prisma } from '@amatla/db'
import { router, instructorProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { obtenerAlmacen } from '../almacen.js'
import { sanitizarPresentacion } from '../sanitize.js'
import { resolverImagenesContenido } from '../contenido.js'
import type { Context, SessionUser } from '../context.js'

const cursoResumen = z.object({
  id: z.string(),
  titulo: z.string(),
  categoria: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  // URL firmada on-demand del thumbnail (regla #10: nunca se guarda la URL)
  thumbnailUrl: z.string().nullable(),
  estudiantes: z.number().int(),
  secciones: z.number().int(),
  lecciones: z.number().int(),
  duracionSegundos: z.number().int(),
  actualizadoEl: z.date(),
  // visible en el catálogo público "General" (solo cuenta si status = PUBLISHED)
  esPublico: z.boolean(),
})

const cursoEditable = z.object({
  id: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  // HTML enriquecido con imágenes ya resueltas (src re-firmado). null si vacío.
  presentacion: z.string().nullable(),
  categoria: z.string(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  // URL firmada on-demand (regla #10: nunca se guarda la URL, solo la key)
  thumbnailUrl: z.string().nullable(),
  // visible en el catálogo público "General" (solo cuenta si status = PUBLISHED)
  esPublico: z.boolean(),
})

// Validaciones de entrada — mensajes en español para mostrarse en el formulario
const datosCurso = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, 'El título necesita al menos 3 caracteres')
    .max(120, 'El título no puede pasar de 120 caracteres'),
  descripcion: z
    .string()
    .trim()
    .min(10, 'Describe el curso con al menos 10 caracteres')
    .max(5000, 'La descripción no puede pasar de 5000 caracteres'),
  categoria: z
    .string()
    .trim()
    .min(2, 'Indica una categoría')
    .max(60, 'La categoría no puede pasar de 60 caracteres'),
})

/**
 * Ownership (regla #7): un instructor solo toca SUS cursos.
 * SUPER_ADMIN puede operar sobre cualquiera.
 */
export async function cursoPropio(ctx: Context & { user: SessionUser }, cursoId: string) {
  const where: Prisma.CourseWhereInput =
    ctx.user.role === 'SUPER_ADMIN'
      ? { id: cursoId }
      : { id: cursoId, instructorId: ctx.user.id }
  const curso = await ctx.prisma.course.findFirst({ where })
  if (!curso) {
    // NOT_FOUND también cuando existe pero es de otro instructor — no revelar existencia
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Curso no encontrado.' })
  }
  return curso
}

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
      thumbnailUrl: curso.thumbnail ? obtenerAlmacen().urlLectura(curso.thumbnail).url : null,
      estudiantes: curso._count.enrollments,
      secciones: curso._count.sections,
      lecciones: curso.sections.reduce((total, seccion) => total + seccion._count.lessons, 0),
      duracionSegundos: curso.totalDuration,
      actualizadoEl: curso.updatedAt,
      esPublico: curso.isPublic,
    }))
  }),

  /** Datos editables de un curso propio — para el formulario de edición. */
  obtener: instructorProcedure
    .input(z.object({ id: z.string() }))
    .output(cursoEditable)
    .query(async ({ ctx, input }) => {
      const curso = await cursoPropio(ctx, input.id)
      return {
        id: curso.id,
        titulo: curso.title,
        descripcion: curso.description,
        presentacion: curso.presentacion ? resolverImagenesContenido(curso.presentacion) : null,
        categoria: curso.category,
        status: curso.status,
        thumbnailUrl: curso.thumbnail ? obtenerAlmacen().urlLectura(curso.thumbnail).url : null,
        esPublico: curso.isPublic,
      }
    }),

  /** Crear curso (queda en DRAFT). Curso + auditoría en una sola transacción (regla #4). */
  crear: instructorProcedure
    .input(datosCurso)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const curso = await ctx.prisma.$transaction(async (tx) => {
        const creado = await tx.course.create({
          data: {
            title: input.titulo,
            description: input.descripcion,
            category: input.categoria,
            instructorId: ctx.user.id,
          },
        })
        await auditFromRequest(
          ctx,
          'CREATE_COURSE',
          auditResource('Course', creado.id),
          { titulo: input.titulo, categoria: input.categoria },
          tx,
        )
        return creado
      })
      return { id: curso.id }
    }),

  /**
   * Publicar un curso propio (DRAFT o ARCHIVED → PUBLISHED).
   * Validación del prompt maestro: debe tener al menos 1 lección con
   * contenido listo — VIDEO con video procesado o PDF con archivo escaneado.
   * (Las lecciones TEXT aún no cuentan: no tienen campo de contenido — ver ADR.)
   */
  publicar: instructorProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ status: z.literal('PUBLISHED') }))
    .mutation(async ({ ctx, input }) => {
      const curso = await cursoPropio(ctx, input.id)
      if (curso.status === 'PUBLISHED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'El curso ya está publicado.' })
      }

      const leccionesListas = await ctx.prisma.lesson.count({
        where: {
          section: { courseId: curso.id },
          OR: [
            { type: 'VIDEO', videoId: { not: null } },
            { type: 'PDF', fileKey: { not: null } },
          ],
        },
      })
      if (leccionesListas === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Para publicar, el curso necesita al menos una lección con contenido listo (video procesado o PDF cargado).',
        })
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.course.update({ where: { id: curso.id }, data: { status: 'PUBLISHED' } })
        await auditFromRequest(
          ctx,
          'PUBLISH_COURSE',
          auditResource('Course', curso.id),
          { desde: curso.status, leccionesListas },
          tx,
        )
      })
      return { status: 'PUBLISHED' as const }
    }),

  /** Archivar un curso propio — deja de ser visible para estudiantes. */
  archivar: instructorProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ status: z.literal('ARCHIVED') }))
    .mutation(async ({ ctx, input }) => {
      const curso = await cursoPropio(ctx, input.id)
      if (curso.status === 'ARCHIVED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'El curso ya está archivado.' })
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.course.update({ where: { id: curso.id }, data: { status: 'ARCHIVED' } })
        await auditFromRequest(
          ctx,
          'ARCHIVE_COURSE',
          auditResource('Course', curso.id),
          { desde: curso.status },
          tx,
        )
      })
      return { status: 'ARCHIVED' as const }
    }),

  /** Actualizar título/descripcion/categoría de un curso propio. */
  actualizar: instructorProcedure
    .input(datosCurso.partial().extend({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.course.update({
          where: { id: input.id },
          data: {
            ...(input.titulo !== undefined && { title: input.titulo }),
            ...(input.descripcion !== undefined && { description: input.descripcion }),
            ...(input.categoria !== undefined && { category: input.categoria }),
          },
        })
        await auditFromRequest(
          ctx,
          'UPDATE_COURSE',
          auditResource('Course', input.id),
          { campos: Object.keys(input).filter((k) => k !== 'id') },
          tx,
        )
      })
      return { id: input.id }
    }),

  /**
   * Guardar la presentación enriquecida del curso. El HTML se sanitiza
   * server-side (regla #13) ANTES de persistir — imágenes con data-key y
   * video embebido solo de hosts permitidos.
   */
  actualizarPresentacion: instructorProcedure
    .input(
      z.object({
        id: z.string(),
        presentacionHtml: z.string().max(200_000, 'La presentación es demasiado larga'),
      }),
    )
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.id)
      const limpio = sanitizarPresentacion(input.presentacionHtml)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.course.update({ where: { id: input.id }, data: { presentacion: limpio } })
        await auditFromRequest(
          ctx,
          'UPDATE_COURSE',
          auditResource('Course', input.id),
          { campo: 'presentacion' },
          tx,
        )
      })
      return { id: input.id }
    }),

  /**
   * Mostrar/ocultar un curso propio en el catálogo público "General"
   * (isPublic). Solo cuenta cuando el curso está PUBLISHED.
   */
  cambiarVisibilidad: instructorProcedure
    .input(z.object({ id: z.string(), esPublico: z.boolean() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await cursoPropio(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.course.update({
          where: { id: input.id },
          data: { isPublic: input.esPublico },
        })
        await auditFromRequest(
          ctx,
          'UPDATE_COURSE',
          auditResource('Course', input.id),
          { isPublic: input.esPublico },
          tx,
        )
      })
      return { id: input.id }
    }),
})
