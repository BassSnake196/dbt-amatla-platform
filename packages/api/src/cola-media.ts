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

/** Datos del job de video — lo que reportó el webhook de Stream. */
export interface JobVideo {
  /** uid del video en Stream (VideoUpload.uid). */
  uid: string
  estado: 'ready' | 'error'
  duracionSegundos?: number
  detalle?: string
}

type JobMedia = JobEscaneo | JobVideo

let cola: Queue<JobMedia> | null = null

function obtenerCola(): Queue<JobMedia> {
  if (!cola) {
    const env = loadServerEnv()
    cola = new Queue<JobMedia>('media', {
      connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    })
  }
  return cola
}

const OPCIONES_JOB = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
} as const

/** Encola el escaneo de un archivo recién subido (pipeline ClamAV). */
export async function encolarEscaneo(datos: JobEscaneo): Promise<void> {
  await obtenerCola().add('escanear-archivo', datos, OPCIONES_JOB)
}

/** Encola el procesamiento de un video reportado por el webhook de Stream. */
export async function encolarProcesamientoVideo(datos: JobVideo): Promise<void> {
  await obtenerCola().add('procesar-video', datos, OPCIONES_JOB)
}
