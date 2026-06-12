// Procesamiento del webhook de Stream (prompt maestro, tarea de video):
//   webhook video.ready → enlazar Lesson.videoId + duration, recalcular la
//   duración total del curso y notificar al instructor
//   webhook de error   → marcar ERROR, eliminar el video y notificar
// El enlace lo hace SOLO este worker — nunca el cliente ni el resolver.

import { auditLog, auditResource, prisma } from '@amatla/db'

export interface JobVideo {
  uid: string
  estado: 'ready' | 'error'
  duracionSegundos?: number
  detalle?: string
}

export interface DepsVideo {
  /** Servicio de video — para eliminar objetos rechazados o reemplazados. */
  stream: { eliminar(uid: string): Promise<void> }
}

async function notificar(userId: string, type: string, title: string, body: string) {
  await prisma.notification.create({ data: { userId, type, title, body } })
}

/** Marca la subida como fallida, elimina el video del stream y avisa. */
async function rechazar(
  subida: { id: string; uid: string; uploadedBy: string; fileName: string },
  stream: DepsVideo['stream'],
  detalle: string,
  mensaje: string,
) {
  await stream.eliminar(subida.uid)
  await prisma.$transaction(async (tx) => {
    await tx.videoUpload.update({
      where: { id: subida.id },
      data: { status: 'ERROR', detail: detalle },
    })
    await auditLog(
      {
        userId: subida.uploadedBy,
        action: 'DELETE_FILE',
        resource: auditResource('VideoUpload', subida.id),
        metadata: { automatico: true, motivo: detalle, archivo: subida.fileName },
      },
      tx,
    )
  })
  await notificar(subida.uploadedBy, 'VIDEO_RECHAZADO', 'Video rechazado', mensaje)
}

/**
 * Procesa el job `procesar-video`. Idempotente: si la subida ya no está
 * PENDING (reintento de BullMQ tras un fallo parcial), no hace nada.
 */
export async function procesarVideo(job: JobVideo, deps: DepsVideo): Promise<void> {
  const { stream } = deps

  const subida = await prisma.videoUpload.findUnique({ where: { uid: job.uid } })
  if (!subida) {
    throw new Error(`VideoUpload con uid ${job.uid} no existe`)
  }
  if (subida.status !== 'PENDING') return

  // Stream no pudo procesar el archivo (no era un video válido, se cortó
  // la subida, etc.) — no hay nada que enlazar
  if (job.estado === 'error' || !job.duracionSegundos || job.duracionSegundos <= 0) {
    await rechazar(
      subida,
      stream,
      job.detalle ?? 'PROCESAMIENTO_FALLIDO',
      `"${subida.fileName}" no pudo procesarse como video. Verifica el archivo e intenta de nuevo.`,
    )
    return
  }

  // Si la lección fue eliminada (o cambió de tipo) mientras se procesaba,
  // el video queda huérfano: se rechaza en vez de enlazarse
  const leccion = await prisma.lesson.findUnique({
    where: { id: subida.lessonId },
    include: { section: { select: { courseId: true } } },
  })
  if (!leccion || leccion.type !== 'VIDEO') {
    await rechazar(
      subida,
      stream,
      'OBJETIVO_INEXISTENTE',
      `El destino de "${subida.fileName}" ya no existe. El video fue eliminado.`,
    )
    return
  }

  const uidAnterior = leccion.videoId
  await prisma.$transaction(async (tx) => {
    await tx.videoUpload.update({
      where: { id: subida.id },
      data: { status: 'READY', duration: job.duracionSegundos, detail: null },
    })
    await tx.lesson.update({
      where: { id: leccion.id },
      data: { videoId: subida.uid, duration: job.duracionSegundos },
    })

    // Duración total del curso: agregado recalculado desde cero — se
    // auto-corrige en cada video nuevo aunque hayan cambiado otras lecciones
    const lecciones = await tx.lesson.findMany({
      where: { section: { courseId: leccion.section.courseId } },
      select: { duration: true },
    })
    const total = lecciones.reduce((suma, l) => suma + (l.duration ?? 0), 0)
    await tx.course.update({
      where: { id: leccion.section.courseId },
      data: { totalDuration: total },
    })
  })

  await notificar(
    subida.uploadedBy,
    'VIDEO_LISTO',
    'Video disponible',
    `"${subida.fileName}" terminó de procesarse y ya está disponible en la lección.`,
  )

  // Limpieza del video reemplazado — best-effort, fuera de la transacción
  if (uidAnterior && uidAnterior !== subida.uid) {
    try {
      await stream.eliminar(uidAnterior)
    } catch {
      // El video huérfano se podrá limpiar después; no es motivo de fallo
    }
  }
}
