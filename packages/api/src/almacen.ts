// Instancia única del almacén de archivos para los resolvers.
// Hoy: mock local de R2 (URLs firmadas HMAC + disco). Cuando lleguen las
// credenciales de Cloudflare, aquí se decide local vs R2 según el entorno.

import { loadServerEnv } from '@amatla/config'
import { almacenLocalDesdeEnv, type Almacen } from '@amatla/storage'

let cache: Almacen | null = null

export function obtenerAlmacen(): Almacen {
  if (!cache) {
    cache = almacenLocalDesdeEnv(loadServerEnv())
  }
  return cache
}

/** Solo para pruebas — permite inyectar un almacén con directorio temporal. */
export function __setAlmacen(almacen: Almacen | null): void {
  cache = almacen
}
