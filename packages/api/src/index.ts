// @amatla/api — router tRPC + servidor Fastify.

export { appRouter, createCaller, type AppRouter, type ApiCaller } from './root.js'
export {
  createContext,
  createContextInner,
  type Context,
  type SessionUser,
  type RequestMeta,
} from './context.js'
export { buildServer } from './server.js'
export {
  router,
  publicProcedure,
  protectedProcedure,
  instructorProcedure,
  adminProcedure,
} from './trpc.js'
export { auditFromRequest, auditResource } from './audit.js'
