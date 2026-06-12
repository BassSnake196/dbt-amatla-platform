// Punto de entrada del backend en desarrollo y producción (Railway/Fly.io).

import { loadServerEnv } from '@amatla/config'
import { buildServer } from './server.js'

const env = loadServerEnv()
const server = await buildServer()

try {
  await server.listen({ port: env.PORT, host: env.HOST })
} catch (err) {
  server.log.error(err)
  process.exit(1)
}
