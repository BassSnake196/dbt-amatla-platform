// Pipeline de escaneo de un archivo subido (prompt maestro, paso 5):
//   leer del almacén → verificar magic bytes (file-type) → escanear con ClamAV
//   → CLEAN: enlazar el recurso (Course.thumbnail / Lesson.fileKey) y avisar
//   → INFECTED/ERROR: eliminar el objeto del almacén y avisar
// El recurso NUNCA se enlaza antes de que el escaneo dé CLEAN.

import { fileTypeFromBuffer } from 'file-type'
import { auditLog, auditResource, prisma } from '@amatla/db'
import type { Almacen } from '@amatla/storage'
import type { ResultadoEscaneo } from './clamav.js'

export interface DepsEscaneo {
  almacen: Almacen
  /** Escáner antivirus — en producción es escanearBuffer contra clamd. */
  escanear: (datos: Buffer) => Promise<ResultadoEscaneo>
}

async function notificar(userId: string, type: string, title: string, body: string) {
  await prisma.notification.create({ data: { userId, type, title, body } })
}

/** Marca la subida como fallida, elimina el objeto y avisa a quien subió. */
async function rechazar(
  upload: { id: string; r2Key: string; uploadedBy: string; fileName: string },
  almacen: Almacen,
  estado: 'INFECTED' | 'ERROR',
  detalle: string,
  mensaje: string,
) {
  await almacen.eliminar(upload.r2Key)
  await prisma.$transaction(async (tx) => {
    await tx.fileUpload.update({
      where: { id: upload.id },
      data: { scanStatus: estado, scanResult: detalle },
    })
    await auditLog(
      {
        userId: upload.uploadedBy,
        action: 'DELETE_FILE',
        resource: auditResource('FileUpload', upload.id),
        metadata: { automatico: true, motivo: detalle, archivo: upload.fileName },
      },
      tx,
    )
  })
  await notificar(upload.uploadedBy, 'ARCHIVO_RECHAZADO', 'Archivo rechazado', mensaje)
}

/**
 * Procesa el job `escanear-archivo`. Idempotente: si la subida ya no está
 * PENDING (reintento de BullMQ tras un fallo parcial), no hace nada.
 */
export async function procesarEscaneo(uploadId: string, deps: DepsEscaneo): Promise<void> {
  const { almacen, escanear } = deps

  const upload = await prisma.fileUpload.findUnique({ where: { id: uploadId } })
  if (!upload) {
    throw new Error(`FileUpload ${uploadId} no existe`)
  }
  if (upload.scanStatus !== 'PENDING') return

  let datos: Buffer
  try {
    datos = await almacen.leer(upload.r2Key)
  } catch {
    await prisma.fileUpload.update({
      where: { id: upload.id },
      data: { scanStatus: 'ERROR', scanResult: 'ARCHIVO_FALTANTE' },
    })
    return
  }

  // Magic bytes: el MIME real debe coincidir con el declarado (no confiar
  // en la extensión ni en el header del cliente — requerimiento del pipeline)
  const tipoReal = await fileTypeFromBuffer(datos)
  if (tipoReal?.mime !== upload.mimeType) {
    await rechazar(
      upload,
      almacen,
      'ERROR',
      `MIME_NO_COINCIDE:${tipoReal?.mime ?? 'desconocido'}`,
      `El contenido de "${upload.fileName}" no corresponde a su tipo declarado. El archivo fue eliminado.`,
    )
    return
  }

  const resultado = await escanear(datos)
  if (!resultado.limpio) {
    await rechazar(
      upload,
      almacen,
      'INFECTED',
      resultado.firma ?? 'desconocida',
      `El antivirus detectó una amenaza en "${upload.fileName}" (${resultado.firma}). El archivo fue eliminado.`,
    )
    // Aviso adicional a administración — archivo infectado es incidente de seguridad
    const admins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', isActive: true },
      select: { id: true },
    })
    for (const admin of admins) {
      await notificar(
        admin.id,
        'ARCHIVO_INFECTADO',
        'Archivo infectado detectado',
        `Subida ${upload.id} ("${upload.fileName}") infectada con ${resultado.firma}. Ya fue eliminada.`,
      )
    }
    return
  }

  // CLEAN — enlazar el recurso. Si el curso/lección fue eliminado mientras
  // se escaneaba, el archivo queda huérfano: se rechaza en vez de enlazarse.
  const objetivoExiste =
    (upload.purpose === 'THUMBNAIL_CURSO' || upload.purpose === 'IMAGEN_CONTENIDO') && upload.targetId
      ? (await prisma.course.findUnique({ where: { id: upload.targetId }, select: { id: true } })) !== null
      : upload.purpose === 'PDF_LECCION' && upload.targetId
        ? (await prisma.lesson.findUnique({ where: { id: upload.targetId }, select: { id: true } })) !== null
        : false
  if (!objetivoExiste) {
    await rechazar(
      upload,
      almacen,
      'ERROR',
      'OBJETIVO_INEXISTENTE',
      `El destino de "${upload.fileName}" ya no existe. El archivo fue eliminado.`,
    )
    return
  }

  let keyAnterior: string | null = null
  await prisma.$transaction(async (tx) => {
    await tx.fileUpload.update({
      where: { id: upload.id },
      data: { scanStatus: 'CLEAN', scanResult: null },
    })

    if (upload.purpose === 'THUMBNAIL_CURSO') {
      const curso = await tx.course.findUniqueOrThrow({ where: { id: upload.targetId! } })
      keyAnterior = curso.thumbnail
      await tx.course.update({ where: { id: curso.id }, data: { thumbnail: upload.r2Key } })
    } else if (upload.purpose === 'PDF_LECCION') {
      const leccion = await tx.lesson.findUniqueOrThrow({ where: { id: upload.targetId! } })
      keyAnterior = leccion.fileKey
      await tx.lesson.update({ where: { id: leccion.id }, data: { fileKey: upload.r2Key } })
    }
    // IMAGEN_CONTENIDO no enlaza ninguna columna: la imagen se referencia por
    // `data-key` en el HTML enriquecido. Basta con marcarla CLEAN (arriba).
  })

  await notificar(
    upload.uploadedBy,
    'ARCHIVO_LISTO',
    'Archivo disponible',
    `"${upload.fileName}" pasó el escaneo de seguridad y ya está disponible.`,
  )

  // Limpieza del archivo reemplazado — best-effort, fuera de la transacción
  if (keyAnterior && keyAnterior !== upload.r2Key) {
    try {
      await almacen.eliminar(keyAnterior)
    } catch {
      // El objeto huérfano se podrá limpiar después; no es motivo de fallo
    }
  }
}
