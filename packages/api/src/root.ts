// Router raíz — aquí se montan todos los sub-routers de la plataforma.

import { router } from './trpc.js'
import { healthRouter } from './routers/health.js'
import { authRouter } from './routers/auth.js'

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
})

/** Tipo del router — lo consume el cliente tRPC en apps/web para type-safety extremo a extremo. */
export type AppRouter = typeof appRouter
