// @amatla/api — router tRPC + servidor Fastify.

export { appRouter, createCaller, type AppRouter, type ApiCaller } from './root.js'
export {
  createContext,
  createContextInner,
  type Context,
  type SessionUser,
  type RequestMeta,
} from './context.js'
// NOTA: buildServer NO se re-exporta aquí a propósito — el entry raíz lo consume
// Next.js (apps/web) y no debe arrastrar Fastify. El servidor arranca via start.ts.
export {
  router,
  publicProcedure,
  protectedProcedure,
  instructorProcedure,
  adminProcedure,
} from './trpc.js'
export { auditFromRequest, auditResource } from './audit.js'
