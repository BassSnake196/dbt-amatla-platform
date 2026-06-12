// @amatla/worker-media — worker BullMQ de la cola `media`.
// Hoy procesa `escanear-archivo` (pipeline ClamAV de subidas); en la tarea
// de video se agregan thumbnails (Sharp/FFmpeg) y duración de lecciones.
// Arrancar con: npm run dev -w @amatla/worker-media (requiere docker compose up).

import { Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'
import { loadServerEnv } from '@amatla/config'
import { almacenLocalDesdeEnv } from '@amatla/storage'
import { escanearBuffer } from './clamav.js'
import { procesarEscaneo } from './escaneo.js'

interface JobEscaneo {
  uploadId: string
}

const env = loadServerEnv()
const almacen = almacenLocalDesdeEnv(env)

const worker = new Worker<JobEscaneo>(
  'media',
  async (job: Job<JobEscaneo>) => {
    if (job.name === 'escanear-archivo') {
      await procesarEscaneo(job.data.uploadId, {
        almacen,
        escanear: (datos) =>
          escanearBuffer(datos, { host: env.CLAMAV_HOST, port: env.CLAMAV_PORT }),
      })
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
  console.log(`[media] ✓ ${job.name} ${job.id} (upload ${job.data.uploadId})`)
})
worker.on('failed', (job, error) => {
  console.error(`[media] ✗ ${job?.name} ${job?.id}: ${error.message}`)
})

console.log('[media] Worker escuchando la cola `media` (escaneo ClamAV activo)')

// Apagado limpio: terminar el job en curso antes de salir
for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    void worker.close().then(() => process.exit(0))
  })
}
