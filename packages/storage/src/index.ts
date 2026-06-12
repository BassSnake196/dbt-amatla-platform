// @amatla/storage — abstracción de almacenamiento de archivos (R2 en prod,
// mock local firmado con HMAC en desarrollo). Los consumidores (api, workers,
// endpoint mock de apps/web) construyen la instancia con almacenLocalDesdeEnv.

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { AlmacenLocal } from './local.js'
import { StreamLocal } from './stream.js'

export {
  AlmacenLocal,
  type Almacen,
  type ConfigAlmacenLocal,
  type OpcionesSubida,
  type UrlFirmada,
} from './local.js'
export {
  firmarSubida,
  firmarLectura,
  verificarFirmaSubida,
  verificarFirmaLectura,
  type ParametrosSubida,
  type ParametrosLectura,
} from './firmas.js'
export {
  StreamLocal,
  firmarWebhookStream,
  verificarFirmaWebhookStream,
  duracionVideoMp4,
  type StreamVideos,
  type SubidaDirectaVideo,
  type ConfigStreamLocal,
} from './stream.js'

/**
 * Busca la raíz del monorepo (donde vive turbo.json) subiendo desde cwd.
 * Next (apps/web), la api y los workers corren con cwd distintos — todos
 * deben compartir el MISMO directorio de objetos del mock.
 */
function encontrarRaizMonorepo(desde: string = process.cwd()): string {
  let actual = resolve(desde)
  for (;;) {
    if (existsSync(join(actual, 'turbo.json'))) return actual
    const padre = dirname(actual)
    if (padre === actual) return resolve(desde) // fallback: cwd
    actual = padre
  }
}

interface EnvAlmacen {
  STORAGE_LOCAL_DIR?: string | undefined
  STORAGE_PUBLIC_URL?: string | undefined
  STORAGE_SIGNING_SECRET?: string | undefined
}

interface EnvStream {
  STREAM_LOCAL_DIR?: string | undefined
  STREAM_PUBLIC_URL?: string | undefined
  STREAM_SIGNING_SECRET?: string | undefined
}

/**
 * Construye el almacén local desde variables de entorno (todas opcionales
 * en desarrollo — los defaults apuntan al mock servido por apps/web).
 * NUNCA usar este mock en producción: ahí va AlmacenR2 con credenciales reales.
 */
export function almacenLocalDesdeEnv(env: EnvAlmacen = process.env): AlmacenLocal {
  return new AlmacenLocal({
    directorio: env.STORAGE_LOCAL_DIR ?? join(encontrarRaizMonorepo(), '.almacen-dev'),
    urlBase: env.STORAGE_PUBLIC_URL ?? 'http://localhost:3000/api/almacen-dev',
    secreto: env.STORAGE_SIGNING_SECRET ?? 'amatla-dev-almacen-secreto',
  })
}

/**
 * Construye el mock local de Cloudflare Stream desde variables de entorno
 * (todas opcionales en desarrollo). NUNCA usar este mock en producción:
 * ahí va StreamCloudflare con las credenciales reales.
 */
export function streamLocalDesdeEnv(env: EnvStream = process.env): StreamLocal {
  return new StreamLocal({
    directorio: env.STREAM_LOCAL_DIR ?? join(encontrarRaizMonorepo(), '.stream-dev'),
    urlBase: env.STREAM_PUBLIC_URL ?? 'http://localhost:3000/api/stream-dev',
    secreto: env.STREAM_SIGNING_SECRET ?? 'amatla-dev-stream-secreto',
  })
}
