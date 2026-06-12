// @amatla/worker-media — worker BullMQ de la cola `media`.
// Procesa `escanear-archivo` (pipeline ClamAV de subidas) y `procesar-video`
// (webhook de Stream → enlace de Lesson.videoId + duración).
// Arrancar con: npm run dev -w @amatla/worker-media (requiere docker compose up).

import { Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'
import { loadServerEnv } from '@amatla/config'
import { almacenLocalDesdeEnv, streamLocalDesdeEnv } from '@amatla/storage'
import { escanearBuffer } from './clamav.js'
import { procesarEscaneo } from './escaneo.js'
import { procesarVideo, type JobVideo } from './video.js'

interface JobEscaneo {
  uploadId: string
}

type JobMedia = JobEscaneo | JobVideo

const env = loadServerEnv()
const almacen = almacenLocalDesdeEnv(env)
const stream = streamLocalDesdeEnv(env)

const worker = new Worker<JobMedia>(
  'media',
  async (job: Job<JobMedia>) => {
    if (job.name === 'escanear-archivo') {
      await procesarEscaneo((job.data as JobEscaneo).uploadId, {
        almacen,
        escanear: (datos) =>
          escanearBuffer(datos, { host: env.CLAMAV_HOST, port: env.CLAMAV_PORT }),
      })
      return
    }
    if (job.name === 'procesar-video') {
      await procesarVideo(job.data as JobVideo, { stream })
      return
    }
    throw new Error(`Job desconocido en la cola media: ${job.name}`)
  },
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: 2,
  },
)

worker.on('completed', (job) => {
  console.log(`[media] ✓ ${job.name} ${job.id}`)
})
worker.on('failed', (job, error) => {
  console.error(`[media] ✗ ${job?.name} ${job?.id}: ${error.message}`)
})

console.log('[media] Worker escuchando la cola `media` (escaneo ClamAV + procesamiento de video)')

// Apagado limpio: terminar el job en curso antes de salir
for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    void worker.close().then(() => process.exit(0))
  })
}
