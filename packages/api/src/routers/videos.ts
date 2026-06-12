// Router de videos — subida directa a Cloudflare Stream (Fase 2).
// Flujo (prompt maestro, "Upload de video directo a Cloudflare Stream"):
//   1. solicitarSubida → valida extensión/MIME/tamaño + ownership, pide a
//      Stream una URL de subida de un solo uso y registra VideoUpload PENDING
//   2. el navegador sube DIRECTO a Stream (mock local hoy) — sin backend
//   3. Stream procesa y manda webhook firmado → apps/web lo verifica y
//      encola `procesar-video`
//   4. workers/media → enlaza Lesson.videoId + duration SOLO si quedó listo
// En BD se guarda únicamente el uid — la URL firmada de reproducción se
// generará on-demand en Fase 3 (regla de seguridad #10).

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, instructorProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { obtenerStream } from '../stream.js'
import { leccionPropia } from './lecciones.js'

/** Reglas de video del prompt maestro: .mp4/.mov, máximo 500MB. */
export const REGLAS_VIDEO = {
  extensiones: ['mp4', 'mov'] as readonly string[],
  maxBytes: 500 * 1024 * 1024,
} as const

// Coherencia extensión ↔ MIME declarado por el navegador
const MIME_POR_EXTENSION: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

const solicitudVideo = z.object({
  leccionId: z.string().min(1),
  nombreArchivo: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  tamanoBytes: z.number().int().positive(),
})

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  return punto === -1 ? '' : nombre.slice(punto + 1).toLowerCase()
}

export const videosRouter = router({
  /**
   * Paso 1 — valida y pide la URL de subida directa a Stream. El video NO
   * pasa por el backend: el navegador sube directo con esa URL.
   */
  solicitarSubida: instructorProcedure
    .input(solicitudVideo)
    .output(z.object({ videoUploadId: z.string(), url: z.string(), expiraEn: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const extension = extensionDe(input.nombreArchivo)
      if (!REGLAS_VIDEO.extensiones.includes(extension)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Extensión no permitida. Acepta: ${REGLAS_VIDEO.extensiones.join(', ')}.`,
        })
      }
      if (MIME_POR_EXTENSION[extension] !== input.mimeType) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El tipo de archivo no coincide con la extensión.',
        })
      }
      if (input.tamanoBytes > REGLAS_VIDEO.maxBytes) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El video supera el límite de 500MB.',
        })
      }

      // Ownership de 3 niveles (regla #7) y que la lección sea de video
      const leccion = await leccionPropia(ctx, input.leccionId)
      if (leccion.type !== 'VIDEO') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Solo las lecciones de tipo VIDEO aceptan un video.',
        })
      }

      const subidaDirecta = await obtenerStream().crearSubidaDirecta({
        maxBytes: input.tamanoBytes,
      })

      const registro = await ctx.prisma.$transaction(async (tx) => {
        const creado = await tx.videoUpload.create({
          data: {
            uid: subidaDirecta.uid,
            lessonId: leccion.id,
            uploadedBy: ctx.user.id,
            fileName: input.nombreArchivo,
            sizeBytes: input.tamanoBytes,
          },
        })
        await auditFromRequest(
          ctx,
          'UPLOAD_VIDEO',
          auditResource('VideoUpload', creado.id),
          { leccionId: leccion.id, nombre: input.nombreArchivo, uid: subidaDirecta.uid },
          tx,
        )
        return creado
      })

      return {
        videoUploadId: registro.id,
        url: subidaDirecta.uploadUrl,
        expiraEn: subidaDirecta.expiraEn,
      }
    }),

  /** Polling del cliente mientras Stream procesa (el webhook cierra el ciclo). */
  estadoSubida: instructorProcedure
    .input(z.object({ videoUploadId: z.string() }))
    .output(
      z.object({
        estado: z.enum(['PENDING', 'READY', 'ERROR']),
        duracion: z.number().int().nullable(),
        detalle: z.string().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Solo quien subió el video puede consultarlo
      const subida = await ctx.prisma.videoUpload.findFirst({
        where: { id: input.videoUploadId, uploadedBy: ctx.user.id },
        select: { status: true, duration: true, detail: true },
      })
      if (!subida) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Subida no encontrada.' })
      }
      return {
        estado: subida.status as 'PENDING' | 'READY' | 'ERROR',
        duracion: subida.duration,
        detalle: subida.detail,
      }
    }),
})
