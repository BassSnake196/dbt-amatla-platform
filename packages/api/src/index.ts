// @amatla/api — router tRPC + servidor Fastify.

export { appRouter, type AppRouter } from './root.js'
export { createContext, type Context, type SessionUser } from './context.js'
export { buildServer } from './server.js'
export {
  router,
  publicProcedure,
  protectedProcedure,
  instructorProcedure,
  adminProcedure,
} from './trpc.js'
export { auditFromRequest, auditResource } from './audit.js'
