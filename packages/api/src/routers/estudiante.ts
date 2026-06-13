// Router del estudiante — Fase 3: dashboard con cursos asignados,
// progreso general y próximas sesiones en vivo, y vista de curso con
// estado por lección (✓ / en progreso / 🔒).
// Reglas críticas de negocio: un STUDENT solo ve cursos asignados via
// Enrollment (y solo PUBLISHED — archivar lo saca de su vista); las
// lecciones de secciones sin acceso NO revelan contenido ni título completo.

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { encrypt, decryptField } from '@amatla/crypto'
import { router, protectedProcedure } from '../trpc.js'
import { obtenerStream } from '../stream.js'
import { obtenerAlmacen } from '../almacen.js'
import type { Context, SessionUser } from '../context.js'

const cursoAsignado = z.object({
  id: z.string(),
  titulo: z.string(),
  instructora: z.string(),
  categoria: z.string(),
  // URL firmada on-demand del thumbnail (regla #10: nunca se guarda la URL);
  // null cuando el instructor no subió uno — la UI cae al arte generativo
  thumbnailUrl: z.string().nullable(),
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
  // Progreso secuencial: false si está bloqueada por ModuleAccess O porque
  // una lección anterior no está completada. La UI no la deja abrir.
  navegable: z.boolean(),
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
 * Progreso secuencial (regla MVP): sobre la secuencia de lecciones ACCESIBLES
 * en orden de lectura, una lección es navegable si es preview, ya está
 * completada, o es la PRIMERA no completada (la "frontera" = lección actual).
 * Todo lo posterior a la frontera queda bloqueado hasta completar la actual.
 */
function idsNavegables(
  secuenciaAccesible: { id: string; isPreview: boolean }[],
  completadas: Set<string>,
): Set<string> {
  const navegables = new Set<string>()
  let fronteraPasada = false
  for (const lec of secuenciaAccesible) {
    if (lec.isPreview || completadas.has(lec.id)) {
      navegables.add(lec.id)
      continue
    }
    if (!fronteraPasada) {
      navegables.add(lec.id) // primera no completada = lección actual, desbloqueada
      fronteraPasada = true
    }
    // las siguientes no completadas quedan bloqueadas (no se agregan)
  }
  return navegables
}

/**
 * ¿La lección está bloqueada por el progreso secuencial? Carga las lecciones
 * accesibles del curso en orden y verifica que la lección objetivo sea
 * navegable. Las preview nunca se bloquean.
 */
async function bloqueadaPorSecuencia(
  ctx: Context & { user: SessionUser },
  leccion: { id: string; isPreview: boolean; section: { courseId: string } },
  inscripcionId: string,
  accesoTotal: boolean,
  idsAccesibles: Set<string>,
): Promise<boolean> {
  if (leccion.isPreview) return false

  const secciones = await ctx.prisma.section.findMany({
    where: { courseId: leccion.section.courseId },
    orderBy: { order: 'asc' },
    select: { id: true, lessons: { orderBy: { order: 'asc' }, select: { id: true, isPreview: true } } },
  })
  const secuencia = secciones.flatMap((s) => {
    const accesible = accesoTotal || idsAccesibles.has(s.id)
    return s.lessons.filter((l) => accesible || l.isPreview)
  })

  const completadas = new Set(
    (
      await ctx.prisma.progress.findMany({
        where: { enrollmentId: inscripcionId, completedAt: { not: null } },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId),
  )

  return !idsNavegables(secuencia, completadas).has(leccion.id)
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

  // Progreso secuencial: no se puede abrir una lección si la anterior no está
  // completada (mismo NOT_FOUND que una lección sin acceso — no se distingue).
  if (await bloqueadaPorSecuencia(ctx, leccion, inscripcion.id, accesoTotal, idsAccesibles)) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
  }

  return { leccion, inscripcion }
}

/**
 * Nota que pertenece al estudiante de la sesión (vía enrollment.studentId).
 * NOT_FOUND si no existe o es de otra persona — nunca revelar que existe
 * una nota ajena.
 */
async function notaPropia(ctx: Context & { user: SessionUser }, notaId: string) {
  const nota = await ctx.prisma.lessonNote.findUnique({
    where: { id: notaId },
    include: { enrollment: { select: { studentId: true } } },
  })
  if (!nota || nota.enrollment.studentId !== ctx.user.id) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Nota no encontrada.' })
  }
  return nota
}

const notaVista = z.object({
  id: z.string(),
  posicionSegundos: z.number().int(),
  texto: z.string(),
  actualizadaEl: z.date(),
})

const textoNota = z
  .string()
  .trim()
  .min(1, 'La nota no puede estar vacía')
  .max(2000, 'La nota no puede pasar de 2000 caracteres')

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
              thumbnail: true,
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
        thumbnailUrl: inscripcion.course.thumbnail
          ? obtenerAlmacen().urlLectura(inscripcion.course.thumbnail).url
          : null,
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

      // Navegabilidad por progreso secuencial sobre las lecciones accesibles en orden
      const secuenciaAccesible = curso.sections.flatMap((seccion) => {
        const accesible = accesoTotal || idsAccesibles.has(seccion.id)
        return seccion.lessons
          .filter((l) => accesible || l.isPreview)
          .map((l) => ({ id: l.id, isPreview: l.isPreview }))
      })
      const navegables = idsNavegables(secuenciaAccesible, completadas)

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
                navegable: false,
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
              // bloqueada por secuencia: visible y con título, pero no abrible
              navegable: navegables.has(leccion.id),
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
        tieneArchivo: z.boolean(), // PDF con archivo escaneado y enlazado
        ultimaPosicion: z.number().int(), // segundos — para reanudar reproducción
        // posición máxima vista — el reproductor limita el avance a este valor
        maxVisto: z.number().int(),
        // HTML sanitizado de las lecciones TEXT (vacío en otros tipos)
        contenido: z.string(),
        curso: z.object({ id: z.string(), titulo: z.string() }),
        seccionTitulo: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.id)

      const progreso = await ctx.prisma.progress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id } },
        select: { completedAt: true, lastPosition: true, watchedSeconds: true },
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
        tieneArchivo: leccion.fileKey !== null,
        ultimaPosicion: progreso?.lastPosition ?? 0,
        // si ya está completada, no se limita el avance (repaso libre)
        maxVisto: progreso?.completedAt ? (leccion.duration ?? Number.MAX_SAFE_INTEGER) : (progreso?.watchedSeconds ?? 0),
        // El content ya está sanitizado en BD (se sanitiza al guardar)
        contenido: leccion.type === 'TEXT' ? (leccion.content ?? '') : '',
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
   * URL de lectura de un PDF de lección accesible — firmada ON-DEMAND con
   * TTL 30 min (regla #10). `permitirDescarga` controla si la UI ofrece
   * descarga directa o solo el visor inline (lo configura el instructor).
   */
  pdfLeccion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(
      z.object({
        url: z.string(),
        permitirDescarga: z.boolean(),
        expiraEn: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { leccion } = await leccionAccesible(ctx, input.id)
      if (leccion.type !== 'PDF' || !leccion.fileKey) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }
      const firmada = obtenerAlmacen().urlLectura(leccion.fileKey)
      return {
        url: firmada.url,
        permitirDescarga: leccion.allowDownload,
        expiraEn: firmada.expiraEn,
      }
    }),

  /**
   * Marcar un material (PDF) como visto = lección completada. El cliente lo
   * llama cuando el documento terminó de cargar en el visor. Pegajoso: una
   * lección completada no se des-completa.
   */
  materialVisto: protectedProcedure
    .input(z.object({ leccionId: z.string() }))
    .output(z.object({ completadaAhora: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.leccionId)
      if (leccion.type !== 'PDF' || !leccion.fileKey) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }

      const previo = await ctx.prisma.progress.findUnique({
        where: {
          enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
        },
        select: { completedAt: true },
      })
      if (previo?.completedAt) return { completadaAhora: false }

      await ctx.prisma.progress.upsert({
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
      return { completadaAhora: true }
    }),

  /**
   * Marcar una lección TEXT como terminada (botón del estudiante). Necesario
   * para el progreso secuencial: sin esto, una lección TEXT bloquearía las
   * siguientes. Pegajoso e idempotente.
   */
  marcarTextoVisto: protectedProcedure
    .input(z.object({ leccionId: z.string() }))
    .output(z.object({ completadaAhora: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.leccionId)
      if (leccion.type !== 'TEXT') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Lección no encontrada.' })
      }

      const previo = await ctx.prisma.progress.findUnique({
        where: {
          enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
        },
        select: { completedAt: true },
      })
      if (previo?.completedAt) return { completadaAhora: false }

      await ctx.prisma.progress.upsert({
        where: {
          enrollmentId_lessonId: { enrollmentId: inscripcion.id, lessonId: leccion.id },
        },
        create: { enrollmentId: inscripcion.id, lessonId: leccion.id, completedAt: new Date() },
        update: { completedAt: new Date() },
      })
      return { completadaAhora: true }
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

  /**
   * Notas personales del estudiante en una lección, ordenadas por su
   * timestamp en el video. El texto va CIFRADO en BD (AES-256-GCM) y se
   * descifra aquí — datos sensibles (regla #9). Solo notas propias.
   */
  notasLeccion: protectedProcedure
    .input(z.object({ leccionId: z.string() }))
    .output(z.array(notaVista))
    .query(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.leccionId)

      const notas = await ctx.prisma.lessonNote.findMany({
        where: { enrollmentId: inscripcion.id, lessonId: leccion.id },
        orderBy: [{ positionSeconds: 'asc' }, { createdAt: 'asc' }],
      })

      return notas.map((nota) => ({
        id: nota.id,
        posicionSegundos: nota.positionSeconds,
        // decryptField devuelve null si el dato está corrupto — no romper la lista
        texto: decryptField(nota.body) ?? '',
        actualizadaEl: nota.updatedAt,
      }))
    }),

  /** Crear una nota en un punto del video. El texto se cifra antes de persistir. */
  crearNota: protectedProcedure
    .input(
      z.object({
        leccionId: z.string(),
        posicionSegundos: z.number().int().min(0).max(60 * 60 * 24),
        texto: textoNota,
      }),
    )
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { leccion, inscripcion } = await leccionAccesible(ctx, input.leccionId)

      // La posición nunca rebasa la duración conocida (datos de BD)
      const posicion =
        leccion.duration !== null
          ? Math.min(input.posicionSegundos, leccion.duration)
          : input.posicionSegundos

      const nota = await ctx.prisma.lessonNote.create({
        data: {
          enrollmentId: inscripcion.id,
          lessonId: leccion.id,
          positionSeconds: posicion,
          body: encrypt(input.texto),
        },
      })
      return { id: nota.id }
    }),

  /** Editar el texto de una nota propia (se re-cifra). */
  actualizarNota: protectedProcedure
    .input(z.object({ id: z.string(), texto: textoNota }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const nota = await notaPropia(ctx, input.id)
      await ctx.prisma.lessonNote.update({
        where: { id: nota.id },
        data: { body: encrypt(input.texto) },
      })
      return { id: nota.id }
    }),

  /** Eliminar una nota propia. */
  eliminarNota: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const nota = await notaPropia(ctx, input.id)
      await ctx.prisma.lessonNote.delete({ where: { id: nota.id } })
      return { id: nota.id }
    }),
})
