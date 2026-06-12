// Servidor Fastify con tRPC montado en /trpc.
// Requerimientos de seguridad #14-17: CORS explícito, headers endurecidos, rate limiting.

import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify'
import { loadServerEnv } from '@amatla/config'
import { appRouter, type AppRouter } from './root.js'
import { createContext } from './context.js'

export async function buildServer() {
  // Entorno validado con Zod — falla al arrancar si algo falta (regla #21)
  const env = loadServerEnv()

  // CORS: dominios explícitos — NUNCA wildcard en producción (regla #14)
  const corsOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim())

  const server = Fastify({
    logger: { level: env.LOG_LEVEL },
    // Detrás de Cloudflare/Railway el IP real viene en X-Forwarded-For
    trustProxy: true,
  })

  await server.register(helmet, {
    // API pura (sin HTML): CSP restrictiva por defecto
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"] } },
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: 'deny' },
  })

  await server.register(cors, { origin: corsOrigins, credentials: true })

  // Regla #16: 100 req/min por IP en endpoints públicos
  await server.register(rateLimit, { max: 100, timeWindow: '1 minute' })

  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        server.log.error({ path, code: error.code, message: error.message }, 'Error tRPC')
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  })

  return server
}
