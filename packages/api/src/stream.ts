// Instancia única del servicio de video para los resolvers.
// Hoy: mock local de Cloudflare Stream (URLs de subida firmadas + disco).
// Cuando lleguen las credenciales, aquí se decide mock vs Cloudflare real.

import { loadServerEnv } from '@amatla/config'
import { streamLocalDesdeEnv, type StreamVideos } from '@amatla/storage'

let cache: StreamVideos | null = null

export function obtenerStream(): StreamVideos {
  if (!cache) {
    cache = streamLocalDesdeEnv(loadServerEnv())
  }
  return cache
}

/** Solo para pruebas — permite inyectar un stream con directorio temporal. */
export function __setStream(stream: StreamVideos | null): void {
  cache = stream
}
