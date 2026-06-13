// Router del estudiante — Fase 3: dashboard con cursos asignados,
// progreso general y próximas sesiones en vivo, y vista de curso con
// estado por lección (✓ / en progreso / 🔒).
// Reglas críticas de negocio: un STUDENT solo ve cursos asignados via
// Enrollment (y solo PUBLISHED — archivar lo saca de su vista); las
// lecciones de secciones sin acceso NO revelan contenido ni título completo.

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { obtenerStream } from '../stream.js'
import type { Context, SessionUser } from '../context.js'

const cursoAsignado = z.object({
  id: z.string(),
  titulo: z.string(),
  instructora: z.string(),
  categoria: z.string(),
  lecciones: z.number().int(),
  duracionSegundos: z.number().int(),
  progreso: z.number().int().min(0).max(100), // % de lecciones completadas
  nuevo: z.boolean(), // asignado hace menos de 14 días y sin comenzar
})

const enCurso = z.object({
  cursoId: z.string(),
  titulo: z.string(),
  leccionId: z.string(),
  leccionNumero: z.number().int(), // posición global en el curso (1-based)
  leccionTitulo: z.string(),
  progreso: z.number().int().min(0).max(100),
  restanteSegundos: z.number().int(), // duración de las lecciones aún no completadas
})

const sesionVivo = z.object({
  id: z.string(),
  titulo: z.string(),
  iniciaEn: z.date(), // UTC — la UI convierte a America/Mexico_City
  cursoTitulo: z.string().nullable(),
  meetUrl: z.string().nullable(),
})

const estadoLeccion = z.enum(['COMPLETADA', 'EN_PROGRESO', 'PENDIENTE', 'BLOQUEADA'])

const leccionVista = z.object({
  id: z.string(),
  titulo: z.string(), // enmascarado cuando estado = BLOQUEADA
  tipo: z.enum(['VIDEO', 'PDF', 'QUIZ', 'TEXT']),
  duracion: z.number().int().nullable(), // null cuando está bloqueada
  estado: estadoLeccion,
  esPreview: z.boolean(),
})

const cursoVista = z.object({
  id: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  categoria: z.string(),
  instructora: z.string(),
  progreso: z.number().int().min(0).max(100),
  leccionesTotales: z.number().int(),
  leccionesCompletadas: z.number().int(),
  secciones: z.array(
    z.object({
      id: z.string(),
      titulo: z.string(),
      descripcion: z.string().nullable(),
      accesible: z.boolean(),
      lecciones: z.array(leccionVista),
    }),
  ),
})

/**
 * Inscripción del estudiante de la sesión en un curso PUBLICADO.
 * NOT_FOUND tanto si el curso no existe como si no está asignado o no está
 * publicado — no revelar existencia de contenido no asignado.
 */
async function inscripcionEnCursoPublicado(
  ctx: Context & { user: SessionUser },
  cursoId: string,
) {
  const inscripcion = await ctx.prisma.enrollment.findFirst({
    where: { studentId: ctx.user.id, courseId: cursoId, course: { status: 'PUBLISHED' } },
    include: { moduleAccess: { select: { sectionId: true } } },
  })
  if (!inscripcion) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Curso no encontrado.' })
  }
  return inscripcion
}

/**
 * Acceso granular (tabla ModuleAccess): una inscripción SIN filas de
 * ModuleAccess da acceso al curso completo; con filas, solo a esas secciones.
 * (La UI de asignación granular llega en Fase 4 — la regla se respeta desde ya.)
 */
function seccionesAccesibles(inscripcion: { moduleAccess: { sectionId: string }[] }) {
  const ids = new Set(inscripcion.moduleAccess.map((a) => a.sectionId))
  return { accesoTotal: ids.size === 0, ids }
}

/** Título recortado para lecciones 🔒 — nunca se manda el título completo. */
function tituloBloqueado(titulo: string): string {
  const corte = Math.min(12, Math.ceil(titulo.length * 0.6))
  return `${titulo.slice(0, corte).trimEnd()}…`
}

/**
 * Lección a la que el estudiante de la sesión SÍ tiene acceso:
 * curso publicado + Enrollment + (sección accesible por ModuleAccess o
 * lección isPreview). Cualquier otro caso → NOT_FOUND idéntico al de
 * "no existe": una lección 🔒 no revela nada aunque se adivine el id.
 */
async function leccionAccesible(ctx: Context & { user: SessionUser }, leccionId: string) {
  const leccion = await ctx.prisma.lesson.findUnique({
    where: { id: leccionId },
    include: { section: { select: { id: true, title: true, courseId: true } } },
  })
  if (!leccion) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
  }

  const inscripcion = await inscripcionEnCursoPublicado(ctx, leccion.section.courseId)
  const { accesoTotal, ids: idsAccesibles } = seccionesAccesibles(inscripcion)
  const accesible = accesoTotal || idsAccesibles.has(leccion.section.id) || leccion.isPreview
  if (!accesible) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
  }
  return { leccion, inscripcion }
}

export const estudianteRouter = router({
  /**
   * Todo lo que necesita la página de inicio del estudiante en una llamada:
   * cursos asignados con progreso, el curso con actividad más reciente
   * (hero "Continuar") y las próximas sesiones en vivo de sus cursos.
   */
  dashboard: protectedProcedure
    .output(
      z.object({
        enCurso: enCurso.nullable(),
        cursos: z.array(cursoAsignado),
        sesiones: z.array(sesionVivo),
      }),
    )
    .query(async ({ ctx }) => {
      const inscripciones = await ctx.prisma.enrollment.findMany({
        where: { studentId: ctx.user.id, course: { status: 'PUBLISHED' } },
        orderBy: { enrolledAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              totalDuration: true,
              instructor: { select: { name: true } },
              sections: {
                orderBy: { order: 'asc' },
                select: {
                  lessons: {
                    orderBy: { order: 'asc' },
                    select: { id: true, title: true, duration: true },
                  },
                },
              },
            },
          },
          progress: {
            select: { lessonId: true, completedAt: true, updatedAt: true },
          },
        },
      })

      // ---- Cursos asignados con progreso ----
      const haceCatorceDias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

      const porCurso = inscripciones.map((inscripcion) => {
        // Lecciones aplanadas en orden de lectura (sección → lección)
        const lecciones = inscripcion.course.sections.flatMap((seccion) => seccion.lessons)
        const completadas = new Set(
          inscripcion.progress.filter((p) => p.completedAt !== null).map((p) => p.lessonId),
        )
        const progreso =
          lecciones.length === 0
            ? 0
            : Math.round(
                (lecciones.filter((l) => completadas.has(l.id)).length / lecciones.length) * 100,
              )
        return { inscripcion, lecciones, completadas, progreso }
      })

      const cursos = porCurso.map(({ inscripcion, lecciones, progreso }) => ({
        id: inscripcion.course.id,
        titulo: inscripcion.course.title,
        instructora: inscripcion.course.instructor.name ?? 'Equipo DBT.Amatla',
        categoria: inscripcion.course.category,
        lecciones: lecciones.length,
        duracionSegundos: inscripcion.course.totalDuration,
        progreso,
        nuevo: inscripcion.progress.length === 0 && inscripcion.enrolledAt > haceCatorceDias,
      }))

      // ---- Hero "Continuar": curso no terminado con actividad más reciente ----
      let mejor: { actividad: Date; datos: z.infer<typeof enCurso> } | null = null
      for (const { inscripcion, lecciones, completadas, progreso } of porCurso) {
        if (progreso >= 100 || inscripcion.progress.length === 0) continue

        const actividad = inscripcion.progress
          .map((p) => p.updatedAt)
          .reduce((max, fecha) => (fecha > max ? fecha : max))
        if (mejor && actividad <= mejor.actividad) continue

        // Lección a retomar: la última tocada si sigue pendiente; si no, la
        // primera no completada en el orden del curso.
        const ultimaTocada = [...inscripcion.progress].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        )[0]
        const indiceUltima = lecciones.findIndex(
          (l) => l.id === ultimaTocada?.lessonId && !completadas.has(l.id),
        )
        const indice =
          indiceUltima >= 0 ? indiceUltima : lecciones.findIndex((l) => !completadas.has(l.id))
        const leccionActual = indice >= 0 ? lecciones[indice] : undefined
        if (!leccionActual) continue

        mejor = {
          actividad,
          datos: {
            cursoId: inscripcion.course.id,
            titulo: inscripcion.course.title,
            leccionId: leccionActual.id,
            leccionNumero: indice + 1,
            leccionTitulo: leccionActual.title,
            progreso,
            restanteSegundos: lecciones
              .filter((l) => !completadas.has(l.id))
              .reduce((total, l) => total + (l.duration ?? 0), 0),
          },
        }
      }

      // ---- Próximas sesiones en vivo de SUS cursos ----
      const cursoIds = inscripciones.map((i) => i.course.id)
      const eventos =
        cursoIds.length === 0
          ? []
          : await ctx.prisma.calendarEvent.findMany({
              where: { courseId: { in: cursoIds }, startAt: { gte: new Date() } },
              orderBy: { startAt: 'asc' },
              take: 4,
              include: { course: { select: { title: true } } },
            })

      return {
        enCurso: mejor?.datos ?? null,
        cursos,
        sesiones: eventos.map((evento) => ({
          id: evento.id,
          titulo: evento.title,
          iniciaEn: evento.startAt,
          cursoTitulo: evento.course?.title ?? null,
          meetUrl: evento.meetUrl,
        })),
      }
    }),

  /**
   * Vista de curso para el estudiante: estructura completa con estado por
   * lección (✓ / en progreso / pendiente / 🔒). Las lecciones de secciones
   * sin acceso van enmascaradas: título recortado, sin duración.
   * Excepción: las lecciones marcadas isPreview son visibles siempre.
   */
  curso: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(cursoVista)
    .query(async ({ ctx, input }) => {
      const inscripcion = await inscripcionEnCursoPublicado(ctx, input.id)
      const { accesoTotal, ids: idsAccesibles } = seccionesAccesibles(inscripcion)

      const curso = await ctx.prisma.course.findUniqueOrThrow({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          instructor: { select: { name: true } },
          sections: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              lessons: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, type: true, duration: true, isPreview: true },
              },
            },
          },
        },
      })

      const progresoFilas = await ctx.prisma.progress.findMany({
        where: { enrollmentId: inscripcion.id },
        select: { lessonId: true, completedAt: true },
      })
      const completadas = new Set(
        progresoFilas.filter((p) => p.completedAt !== null).map((p) => p.lessonId),
      )
      const tocadas = new Set(progresoFilas.map((p) => p.lessonId))

      const secciones = curso.sections.map((seccion) => {
        const accesible = accesoTotal || idsAccesibles.has(seccion.id)
        return {
          id: seccion.id,
          titulo: seccion.title,
          descripcion: seccion.description,
          accesible,
          lecciones: seccion.lessons.map((leccion) => {
            const visible = accesible || leccion.isPreview
            if (!visible) {
              return {
                id: leccion.id,
                titulo: tituloBloqueado(leccion.title),
                tipo: leccion.type,
                duracion: null,
                estado: 'BLOQUEADA' as const,
                esPreview: false,
              }
            }
            return {
              id: leccion.id,
              titulo: leccion.title,
              tipo: leccion.type,
              duracion: leccion.duration,
              estado: completadas.has(leccion.id)
                ? ('COMPLETADA' as const)
                : tocadas.has(leccion.id)
                  ? ('EN_PROGRESO' as const)
                  : ('PENDIENTE' as const),
              esPreview: leccion.isPreview,
            }
          }),
        }
      })

      // Progreso sobre TODAS las lecciones del curso (consistente con el
      // dashboard; recalibrar a "solo accesibles" cuando Fase 4 traiga la
      // asignación granular desde la UI).
      const totales = curso.sections.reduce((n, s) => n + s.lessons.length, 0)
      const nCompletadas = completadas.size

      return {
        id: curso.id,
        titulo: curso.title,
        descripcion: curso.description,
        categoria: curso.category,
        instructora: curso.instructor.name ?? 'Equipo DBT.Amatla',
        progreso: totales === 0 ? 0 : Math.round((nCompletadas / totales) * 100),
        leccionesTotales: totales,
        leccionesCompletadas: nCompletadas,
        secciones,
      }
    }),

  /**
   * Metadata de una lección accesible para el estudiante (la página de
   * lección; el contenido firmado — video HLS / PDF — llega con el
   * reproductor). NOT_FOUND si la sección está bloqueada: una lección 🔒
   * no revela su contenido aunque se adivine el id.
   */
  leccion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(
      z.object({
        id: z.string(),
        titulo: z.string(),
        tipo: z.enum(['VIDEO', 'PDF', 'QUIZ', 'TEXT']),
        duracion: z.number().int().nullable(),
        estado: estadoLeccion,
        tieneVideo: z.boolean(), // VIDEO con video ya procesado por el worker
        ultimaPosicion: z.number().int(), // segundos — para reanudar reproducción
        curso: z.object({ id: z.string(), titulo: z.string() }),
        seccionTitulo: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.id)

      const progreso = await ctx.prisma.progress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id } },
        select: { completedAt: true, lastPosition: true },
      })
      const curso = await ctx.prisma.course.findUniqueOrThrow({
        where: { id: leccion.section.courseId },
        select: { id: true, title: true },
      })

      return {
        id: leccion.id,
        titulo: leccion.title,
        tipo: leccion.type,
        duracion: leccion.duration,
        estado: progreso
          ? progreso.completedAt
            ? ('COMPLETADA' as const)
            : ('EN_PROGRESO' as const)
          : ('PENDIENTE' as const),
        tieneVideo: leccion.videoId !== null,
        ultimaPosicion: progreso?.lastPosition ?? 0,
        curso: { id: curso.id, titulo: curso.title },
        seccionTitulo: leccion.section.title,
      }
    }),

  /**
   * URL de reproducción de una lección VIDEO accesible — firmada ON-DEMAND
   * con TTL 30 min (regla de seguridad #10: nunca se guarda en BD ni se
   * entrega sin verificar acceso). El cliente la renueva antes de expirar.
   */
  videoLeccion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(
      z.object({
        url: z.string(),
        // El mock local sirve el archivo crudo; con Cloudflare Stream real
        // será el manifest HLS (application/x-mpegurl) — ajustar entonces.
        tipo: z.literal('video/mp4'),
        expiraEn: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { leccion } = await leccionAccesible(ctx, input.id)
      if (leccion.type !== 'VIDEO' || !leccion.videoId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }
      const firmada = await obtenerStream().urlReproduccion(leccion.videoId)
      return { url: firmada.url, tipo: 'video/mp4' as const, expiraEn: firmada.expiraEn }
    }),

  /**
   * Guardar posición de reproducción (el cliente la manda cada ~15 s).
   * La completitud al 80% se decide AQUÍ con la duración de BD — nunca se
   * confía en lo que declare el cliente — y es pegajosa (no se des-completa).
   */
  progresoVideo: protectedProcedure
    .input(
      z.object({
        leccionId: z.string(),
        posicionSegundos: z
          .number()
          .int()
          .min(0)
          .max(60 * 60 * 24), // sanidad: nadie reproduce más de 24 h
      }),
    )
    .output(z.object({ estado: estadoLeccion, completadaAhora: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.leccionId)
      if (leccion.type !== 'VIDEO' || !leccion.videoId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }

      // La posición nunca rebasa la duración conocida (datos de BD, no del cliente)
      const posicion =
        leccion.duration !== null ? Math.min(input.posicionSegundos, leccion.duration) : input.posicionSegundos

      const previo = await ctx.prisma.progress.findUnique({
        where: {
          enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
        },
      })

      const yaCompletada = previo?.completedAt != null
      const superaUmbral =
        leccion.duration !== null && leccion.duration > 0 && posicion >= leccion.duration * 0.8
      const completadaAhora = !yaCompletada && superaUmbral

      await ctx.prisma.progress.upsert({
        where: {
          enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
        },
        create: {
          enrollmentId: inscripcion.id,
          lessonId: leccion.id,
          lastPosition: posicion,
          watchedSeconds: posicion,
          completedAt: completadaAhora ? new Date() : null,
        },
        update: {
          lastPosition: posicion,
          // watchedSeconds = posición máxima alcanzada — nunca retrocede
          watchedSeconds: Math.max(previo?.watchedSeconds ?? 0, posicion),
          ...(completadaAhora && { completedAt: new Date() }),
        },
      })

      return {
        estado: yaCompletada || completadaAhora ? ('COMPLETADA' as const) : ('EN_PROGRESO' as const),
        completadaAhora,
      }
    }),
})
