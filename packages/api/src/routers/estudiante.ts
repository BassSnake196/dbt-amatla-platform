// Router del estudiante — Fase 3: dashboard con cursos asignados,
// progreso general y próximas sesiones en vivo.
// Regla crítica de negocio: un STUDENT solo ve cursos asignados via
// Enrollment (y solo PUBLISHED — archivar lo saca de su vista).

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc.js'

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
})
