// Router de quiz (Fase 4, tarea 4.5) — backend de las lecciones tipo QUIZ.
//
// Dos audiencias con outputs DISTINTOS:
//  - Instructor (ownership 3 niveles via leccionPropia): gestiona las preguntas
//    y ve la respuesta correcta para editarlas.
//  - Estudiante (acceso via leccionAccesible: Enrollment + ModuleAccess +
//    progreso secuencial): ve las preguntas SIN la respuesta correcta y envía
//    su intento; el score se calcula SIEMPRE en el servidor (reglas #12 y #13).
//
// Regla de seguridad #13 (CRÍTICA): la respuesta correcta (correctOption)
// NUNCA viaja al cliente del estudiante antes del envío del intento. Solo se
// revela en el feedback DESPUÉS de enviarIntento (o en miIntento).

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, instructorProcedure, protectedProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { leccionPropia } from './lecciones.js'
import { leccionAccesible } from './estudiante.js'
import type { Context, SessionUser } from '../context.js'

const opcion = z.enum(['A', 'B', 'C', 'D'])

const datosPregunta = z.object({
  enunciado: z
    .string()
    .trim()
    .min(2, 'El enunciado necesita al menos 2 caracteres')
    .max(2000, 'El enunciado no puede pasar de 2000 caracteres'),
  opcionA: z.string().trim().min(1, 'La opción A no puede estar vacía').max(500),
  opcionB: z.string().trim().min(1, 'La opción B no puede estar vacía').max(500),
  opcionC: z.string().trim().min(1, 'La opción C no puede estar vacía').max(500),
  opcionD: z.string().trim().min(1, 'La opción D no puede estar vacía').max(500),
  correcta: opcion,
  explicacion: z.string().trim().max(2000, 'Máximo 2000 caracteres').optional(),
})

// ---- Helpers de ownership / acceso ----

/** Lección QUIZ propia del instructor (ownership 3 niveles + tipo correcto). */
async function leccionQuizPropia(ctx: Context & { user: SessionUser }, leccionId: string) {
  const leccion = await leccionPropia(ctx, leccionId)
  if (leccion.type !== 'QUIZ') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta lección no es de tipo quiz.' })
  }
  return leccion
}

/** Pregunta cuya lección/curso pertenece al instructor (regla #7). */
async function preguntaPropia(ctx: Context & { user: SessionUser }, preguntaId: string) {
  const pregunta = await ctx.prisma.quizQuestion.findUnique({
    where: { id: preguntaId },
    include: {
      lesson: { include: { section: { include: { course: { select: { instructorId: true } } } } } },
    },
  })
  const esDuena =
    pregunta &&
    (ctx.user.role === 'SUPER_ADMIN' || pregunta.lesson.section.course.instructorId === ctx.user.id)
  if (!esDuena) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Pregunta no encontrada.' })
  }
  return pregunta
}

// ---- Outputs ----

// Vista del instructor: INCLUYE la respuesta correcta (para editar).
const preguntaInstructor = z.object({
  id: z.string(),
  orden: z.number().int(),
  enunciado: z.string(),
  opcionA: z.string(),
  opcionB: z.string(),
  opcionC: z.string(),
  opcionD: z.string(),
  correcta: opcion,
  explicacion: z.string().nullable(),
})

// Vista del estudiante: SIN la respuesta correcta ni la explicación (regla #13).
const preguntaEstudiante = z.object({
  id: z.string(),
  orden: z.number().int(),
  enunciado: z.string(),
  opcionA: z.string(),
  opcionB: z.string(),
  opcionC: z.string(),
  opcionD: z.string(),
})

// Feedback por pregunta — solo DESPUÉS de enviar (revela correcta + explicación).
const resultadoPregunta = z.object({
  preguntaId: z.string(),
  correcta: opcion,
  elegida: opcion.nullable(),
  acerto: z.boolean(),
  explicacion: z.string().nullable(),
})

const feedbackIntento = z.object({
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  passingScore: z.number().int(),
  resultados: z.array(resultadoPregunta),
})

/**
 * Reconstruye el feedback por pregunta a partir de las respuestas guardadas
 * y las preguntas ACTUALES de la lección. Si una pregunta no fue respondida
 * (p. ej. se añadió después del intento) → elegida = null, acerto = false.
 */
function construirResultados(
  preguntas: { id: string; correctOption: string; explanation: string | null }[],
  respuestas: Record<string, string>,
): z.infer<typeof resultadoPregunta>[] {
  return preguntas.map((p) => {
    const elegida = respuestas[p.id]
    const elegidaValida = elegida === 'A' || elegida === 'B' || elegida === 'C' || elegida === 'D'
    return {
      preguntaId: p.id,
      correcta: p.correctOption as z.infer<typeof opcion>,
      elegida: elegidaValida ? (elegida as z.infer<typeof opcion>) : null,
      acerto: elegidaValida && elegida === p.correctOption,
      explicacion: p.explanation,
    }
  })
}

export const quizRouter = router({
  // ===================== INSTRUCTOR =====================

  /** Preguntas de un quiz propio, en orden, CON la respuesta correcta (editor). */
  preguntas: instructorProcedure
    .input(z.object({ leccionId: z.string() }))
    .output(z.object({ passingScore: z.number().int(), preguntas: z.array(preguntaInstructor) }))
    .query(async ({ ctx, input }) => {
      const leccion = await leccionQuizPropia(ctx, input.leccionId)
      const preguntas = await ctx.prisma.quizQuestion.findMany({
        where: { lessonId: leccion.id },
        orderBy: { order: 'asc' },
      })
      return {
        passingScore: leccion.passingScore,
        preguntas: preguntas.map((p) => ({
          id: p.id,
          orden: p.order,
          enunciado: p.stem,
          opcionA: p.optionA,
          opcionB: p.optionB,
          opcionC: p.optionC,
          opcionD: p.optionD,
          correcta: p.correctOption as z.infer<typeof opcion>,
          explicacion: p.explanation,
        })),
      }
    }),

  /** Crear una pregunta al final del quiz. */
  crearPregunta: instructorProcedure
    .input(datosPregunta.extend({ leccionId: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const leccion = await leccionQuizPropia(ctx, input.leccionId)
      const pregunta = await ctx.prisma.$transaction(async (tx) => {
        const ultima = await tx.quizQuestion.aggregate({
          where: { lessonId: leccion.id },
          _max: { order: true },
        })
        const creada = await tx.quizQuestion.create({
          data: {
            lessonId: leccion.id,
            order: (ultima._max.order ?? 0) + 1,
            stem: input.enunciado,
            optionA: input.opcionA,
            optionB: input.opcionB,
            optionC: input.opcionC,
            optionD: input.opcionD,
            correctOption: input.correcta,
            explanation: input.explicacion || null,
          },
        })
        await auditFromRequest(
          ctx,
          'CREATE_QUIZ_QUESTION',
          auditResource('QuizQuestion', creada.id),
          { leccionId: leccion.id },
          tx,
        )
        return creada
      })
      return { id: pregunta.id }
    }),

  /** Editar una pregunta propia (cualquier campo). */
  actualizarPregunta: instructorProcedure
    .input(datosPregunta.partial().extend({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await preguntaPropia(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.quizQuestion.update({
          where: { id: input.id },
          data: {
            ...(input.enunciado !== undefined && { stem: input.enunciado }),
            ...(input.opcionA !== undefined && { optionA: input.opcionA }),
            ...(input.opcionB !== undefined && { optionB: input.opcionB }),
            ...(input.opcionC !== undefined && { optionC: input.opcionC }),
            ...(input.opcionD !== undefined && { optionD: input.opcionD }),
            ...(input.correcta !== undefined && { correctOption: input.correcta }),
            ...(input.explicacion !== undefined && { explanation: input.explicacion || null }),
          },
        })
        await auditFromRequest(
          ctx,
          'UPDATE_QUIZ_QUESTION',
          auditResource('QuizQuestion', input.id),
          { campos: Object.keys(input).filter((k) => k !== 'id') },
          tx,
        )
      })
      return { id: input.id }
    }),

  /** Eliminar una pregunta propia. */
  eliminarPregunta: instructorProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pregunta = await preguntaPropia(ctx, input.id)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.quizQuestion.delete({ where: { id: input.id } })
        await auditFromRequest(
          ctx,
          'DELETE_QUIZ_QUESTION',
          auditResource('QuizQuestion', input.id),
          { leccionId: pregunta.lessonId },
          tx,
        )
      })
      return { id: input.id }
    }),

  /** Reordenar TODAS las preguntas del quiz (drag & drop). */
  reordenarPreguntas: instructorProcedure
    .input(z.object({ leccionId: z.string(), ordenIds: z.array(z.string()).min(1) }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const leccion = await leccionQuizPropia(ctx, input.leccionId)

      const actuales = await ctx.prisma.quizQuestion.findMany({
        where: { lessonId: leccion.id },
        select: { id: true },
      })
      const idsActuales = new Set(actuales.map((p) => p.id))
      const idsRecibidos = new Set(input.ordenIds)
      const mismoConjunto =
        idsActuales.size === idsRecibidos.size &&
        [...idsActuales].every((id) => idsRecibidos.has(id))
      if (!mismoConjunto) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El nuevo orden no coincide con las preguntas del quiz.',
        })
      }

      await ctx.prisma.$transaction(async (tx) => {
        for (const [indice, id] of input.ordenIds.entries()) {
          await tx.quizQuestion.update({ where: { id }, data: { order: indice + 1 } })
        }
        await auditFromRequest(
          ctx,
          'REORDER_QUIZ_QUESTIONS',
          auditResource('Lesson', leccion.id),
          { orden: input.ordenIds },
          tx,
        )
      })
      return { ok: true as const }
    }),

  /** Configurar el % mínimo de aprobación del quiz (1-100). */
  configurarPassingScore: instructorProcedure
    .input(z.object({ leccionId: z.string(), passingScore: z.number().int().min(1).max(100) }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const leccion = await leccionQuizPropia(ctx, input.leccionId)
      await ctx.prisma.$transaction(async (tx) => {
        await tx.lesson.update({
          where: { id: leccion.id },
          data: { passingScore: input.passingScore },
        })
        await auditFromRequest(
          ctx,
          'UPDATE_LESSON',
          auditResource('Lesson', leccion.id),
          { campo: 'passingScore', valor: input.passingScore },
          tx,
        )
      })
      return { id: leccion.id }
    }),

  // ===================== ESTUDIANTE =====================

  /**
   * Preguntas del quiz para el estudiante — SIN la respuesta correcta ni la
   * explicación (regla #13). El acceso respeta el progreso secuencial
   * (leccionAccesible). NOT_FOUND si la lección está bloqueada o no asignada.
   */
  preguntasEstudiante: protectedProcedure
    .input(z.object({ leccionId: z.string() }))
    .output(z.object({ passingScore: z.number().int(), preguntas: z.array(preguntaEstudiante) }))
    .query(async ({ ctx, input }) => {
      const { leccion } = await leccionAccesible(ctx, input.leccionId)
      if (leccion.type !== 'QUIZ') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }
      const preguntas = await ctx.prisma.quizQuestion.findMany({
        where: { lessonId: leccion.id },
        orderBy: { order: 'asc' },
        // Solo los campos que el estudiante puede ver — correctOption/explanation NUNCA
        select: {
          id: true,
          order: true,
          stem: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
        },
      })
      return {
        passingScore: leccion.passingScore,
        preguntas: preguntas.map((p) => ({
          id: p.id,
          orden: p.order,
          enunciado: p.stem,
          opcionA: p.optionA,
          opcionB: p.optionB,
          opcionC: p.optionC,
          opcionD: p.optionD,
        })),
      }
    }),

  /**
   * Enviar un intento de quiz. Recibe las respuestas, CALCULA el score en el
   * servidor con los datos de BD (regla #12), guarda/sobrescribe el QuizAttempt
   * y, si aprueba, marca la lección como completada (Progress.completedAt) para
   * que cuente en el progreso secuencial. Devuelve el feedback por pregunta
   * (ya es lícito revelar las respuestas correctas DESPUÉS del envío).
   */
  enviarIntento: protectedProcedure
    .input(
      z.object({
        leccionId: z.string(),
        respuestas: z
          .array(z.object({ preguntaId: z.string(), opcion }))
          .min(1, 'Debes responder al menos una pregunta'),
      }),
    )
    .output(feedbackIntento)
    .mutation(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.leccionId)
      if (leccion.type !== 'QUIZ') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }

      const preguntas = await ctx.prisma.quizQuestion.findMany({
        where: { lessonId: leccion.id },
        orderBy: { order: 'asc' },
        select: { id: true, correctOption: true, explanation: true },
      })
      if (preguntas.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este quiz no tiene preguntas.' })
      }

      // Mapa de respuestas recibidas, ignorando ids que no son del quiz
      const idsValidos = new Set(preguntas.map((p) => p.id))
      const respuestas: Record<string, string> = {}
      for (const r of input.respuestas) {
        if (idsValidos.has(r.preguntaId)) respuestas[r.preguntaId] = r.opcion
      }

      // Obligatorio: una opción por cada pregunta (no se acepta enviar incompleto)
      const todasRespondidas = preguntas.every((p) => respuestas[p.id] !== undefined)
      if (!todasRespondidas) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Debes responder todas las preguntas antes de enviar.',
        })
      }

      // Score SIEMPRE en el servidor — nunca se confía en lo que mande el cliente
      const aciertos = preguntas.filter((p) => respuestas[p.id] === p.correctOption).length
      const score = Math.round((aciertos / preguntas.length) * 100)
      const passed = score >= leccion.passingScore

      await ctx.prisma.$transaction(async (tx) => {
        // Último intento: sobrescribe el anterior del mismo enrollment+lesson
        await tx.quizAttempt.upsert({
          where: {
            enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
          },
          create: {
            enrollmentId: inscripcion.id,
            lessonId: leccion.id,
            answers: respuestas,
            score,
            passed,
          },
          update: { answers: respuestas, score, passed, attemptedAt: new Date() },
        })

        // Aprobar marca la lección completada (pegajoso: nunca se des-completa,
        // ni siquiera si un intento posterior reprueba)
        if (passed) {
          const previo = await tx.progress.findUnique({
            where: {
              enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
            },
            select: { completedAt: true },
          })
          if (!previo?.completedAt) {
            await tx.progress.upsert({
              where: {
                enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
              },
              create: {
                enrollmentId: inscripcion.id,
                lessonId: leccion.id,
                completedAt: new Date(),
              },
              update: { completedAt: new Date() },
            })
          }
        }

        await auditFromRequest(
          ctx,
          'SUBMIT_QUIZ',
          auditResource('Lesson', leccion.id),
          { score, passed },
          tx,
        )
      })

      return {
        score,
        passed,
        passingScore: leccion.passingScore,
        resultados: construirResultados(preguntas, respuestas),
      }
    }),

  /**
   * Último intento del estudiante en este quiz (para mostrar el feedback al
   * reabrir la lección). null si aún no ha enviado ninguno.
   */
  miIntento: protectedProcedure
    .input(z.object({ leccionId: z.string() }))
    .output(
      feedbackIntento
        .extend({ attemptedAt: z.date() })
        .nullable(),
    )
    .query(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.leccionId)
      if (leccion.type !== 'QUIZ') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }

      const intento = await ctx.prisma.quizAttempt.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id } },
      })
      if (!intento) return null

      const preguntas = await ctx.prisma.quizQuestion.findMany({
        where: { lessonId: leccion.id },
        orderBy: { order: 'asc' },
        select: { id: true, correctOption: true, explanation: true },
      })
      const respuestas = (intento.answers ?? {}) as Record<string, string>

      return {
        score: intento.score,
        passed: intento.passed,
        passingScore: leccion.passingScore,
        attemptedAt: intento.attemptedAt,
        resultados: construirResultados(preguntas, respuestas),
      }
    }),
})
