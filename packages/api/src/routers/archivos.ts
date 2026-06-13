// Router de archivos — pipeline de subida con presigned URL (Fase 2).
// Flujo (prompt maestro, sección "Pipeline de subida"):
//   1. solicitarSubida  → valida extensión/MIME/tamaño + ownership,
//                          registra FileUpload (PENDING) y firma la URL de PUT
//   2. el navegador sube DIRECTO al almacén (mock local hoy, R2 en prod)
//   3. confirmarSubida  → verifica que el objeto exista y encola el escaneo
//   4. workers/media    → magic bytes + ClamAV; solo si CLEAN se enlaza el
//                          archivo (Course.thumbnail / Lesson.fileKey)
// El recurso NUNCA queda visible antes de scanStatus = CLEAN.

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, instructorProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'
import { obtenerAlmacen } from '../almacen.js'
// `cola-media` arrastra BullMQ + ioredis (pesado). Se importa de forma
// DIFERIDA dentro del resolver para que no entre al grafo síncrono del
// appRouter — así las páginas de Next que solo consultan datos no lo compilan.
import { cursoPropio } from './cursos.js'
import { leccionPropia } from './lecciones.js'

/** Reglas por propósito: extensiones, MIME y tamaño máximo (prompt maestro). */
export const REGLAS_SUBIDA = {
  THUMBNAIL_CURSO: {
    extensiones: ['jpg', 'jpeg', 'png'] as readonly string[],
    mimes: ['image/jpeg', 'image/png'] as readonly string[],
    maxBytes: 10 * 1024 * 1024, // 10MB imágenes
  },
  PDF_LECCION: {
    extensiones: ['pdf'] as readonly string[],
    mimes: ['application/pdf'] as readonly string[],
    maxBytes: 50 * 1024 * 1024, // 50MB documentos
  },
} as const

export type PropositoSubida = keyof typeof REGLAS_SUBIDA

// Coherencia extensión ↔ MIME: no basta que ambos estén en la lista
const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
}

const solicitudSubida = z.object({
  proposito: z.enum(['THUMBNAIL_CURSO', 'PDF_LECCION']),
  /** Course.id para THUMBNAIL_CURSO, Lesson.id para PDF_LECCION. */
  objetivoId: z.string().min(1),
  nombreArchivo: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  tamanoBytes: z.number().int().positive(),
})

const estadoSubida = z.object({
  estado: z.enum(['PENDING', 'CLEAN', 'INFECTED', 'ERROR']),
  detalle: z.string().nullable(),
})

function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  return punto === -1 ? '' : nombre.slice(punto + 1).toLowerCase()
}

export const archivosRouter = router({
  /**
   * Paso 1 — valida y firma la URL de subida. El archivo NO pasa por el
   * backend: el navegador hace PUT directo con la URL firmada.
   */
  solicitarSubida: instructorProcedure
    .input(solicitudSubida)
    .output(z.object({ uploadId: z.string(), url: z.string(), expiraEn: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const reglas = REGLAS_SUBIDA[input.proposito]

      const extension = extensionDe(input.nombreArchivo)
      if (!reglas.extensiones.includes(extension)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Extensión no permitida. Acepta: ${reglas.extensiones.join(', ')}.`,
        })
      }
      if (!reglas.mimes.includes(input.mimeType) || MIME_POR_EXTENSION[extension] !== input.mimeType) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El tipo de archivo no coincide con la extensión.',
        })
      }
      if (input.tamanoBytes > reglas.maxBytes) {
        const maxMb = Math.floor(reglas.maxBytes / (1024 * 1024))
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `El archivo supera el límite de ${maxMb}MB.`,
        })
      }

      // Ownership (regla #7) — y para PDFs, que la lección sea del tipo correcto
      let key: string
      if (input.proposito === 'THUMBNAIL_CURSO') {
        const curso = await cursoPropio(ctx, input.objetivoId)
        key = `cursos/${curso.id}/thumbnail/${randomUUID()}.${extension}`
      } else {
        const leccion = await leccionPropia(ctx, input.objetivoId)
        if (leccion.type !== 'PDF') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Solo las lecciones de tipo PDF aceptan un archivo PDF.',
          })
        }
        key = `lecciones/${leccion.id}/${randomUUID()}.pdf`
      }

      const subida = await ctx.prisma.$transaction(async (tx) => {
        const registro = await tx.fileUpload.create({
          data: {
            uploadedBy: ctx.user.id,
            r2Key: key,
            fileName: input.nombreArchivo,
            mimeType: input.mimeType,
            sizeBytes: input.tamanoBytes,
            purpose: input.proposito,
            targetId: input.objetivoId,
          },
        })
        await auditFromRequest(
          ctx,
          'UPLOAD_FILE',
          auditResource('FileUpload', registro.id),
          { proposito: input.proposito, objetivoId: input.objetivoId, nombre: input.nombreArchivo },
          tx,
        )
        return registro
      })

      // La URL firmada amarra key + tamaño exacto + content-type declarados
      const { url, expiraEn } = obtenerAlmacen().urlSubida(key, {
        mimeType: input.mimeType,
        maxBytes: input.tamanoBytes,
      })
      return { uploadId: subida.id, url, expiraEn }
    }),

  /**
   * Paso 3 — el cliente avisa que terminó el PUT. Verificamos que el objeto
   * exista con el tamaño declarado y encolamos el escaneo ClamAV.
   */
  confirmarSubida: instructorProcedure
    .input(z.object({ uploadId: z.string() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      // Solo quien subió el archivo puede confirmarlo
      const subida = await ctx.prisma.fileUpload.findFirst({
        where: { id: input.uploadId, uploadedBy: ctx.user.id },
      })
      if (!subida) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Subida no encontrada.' })
      }
      if (subida.scanStatus !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta subida ya fue procesada.' })
      }

      const tamano = await obtenerAlmacen().tamano(subida.r2Key)
      if (tamano === null || tamano !== subida.sizeBytes) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'El archivo no se subió completo. Intenta de nuevo.',
        })
      }

      const { encolarEscaneo } = await import('../cola-media.js')
      await encolarEscaneo({ uploadId: subida.id })
      return { ok: true as const }
    }),

  /** Polling del cliente mientras el worker escanea. */
  estadoSubida: instructorProcedure
    .input(z.object({ uploadId: z.string() }))
    .output(estadoSubida)
    .query(async ({ ctx, input }) => {
      const subida = await ctx.prisma.fileUpload.findFirst({
        where: { id: input.uploadId, uploadedBy: ctx.user.id },
        select: { scanStatus: true, scanResult: true },
      })
      if (!subida) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Subida no encontrada.' })
      }
      return {
        estado: subida.scanStatus as 'PENDING' | 'CLEAN' | 'INFECTED' | 'ERROR',
        detalle: subida.scanResult,
      }
    }),
})
