// Productor de la cola `media` (BullMQ sobre Redis): aquí solo se ENCOLAN
// trabajos — el procesamiento (ClamAV, magic bytes, enlace del archivo)
// vive en workers/media. Conexión perezosa: ni Redis ni BullMQ se tocan
// hasta el primer encolado.

import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { loadServerEnv } from '@amatla/config'

/** Datos del job de escaneo — el worker carga el resto desde FileUpload. */
export interface JobEscaneo {
  uploadId: string
}

let cola: Queue<JobEscaneo> | null = null

function obtenerCola(): Queue<JobEscaneo> {
  if (!cola) {
    const env = loadServerEnv()
    cola = new Queue<JobEscaneo>('media', {
      connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    })
  }
  return cola
}

/** Encola el escaneo de un archivo recién subido (pipeline ClamAV). */
export async function encolarEscaneo(datos: JobEscaneo): Promise<void> {
  await obtenerCola().add('escanear-archivo', datos, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  })
}
