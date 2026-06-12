// Router raíz — aquí se montan todos los sub-routers de la plataforma.

import { router, createCallerFactory } from './trpc.js'
import { healthRouter } from './routers/health.js'
import { authRouter } from './routers/auth.js'
import { cursosRouter } from './routers/cursos.js'
import { seccionesRouter } from './routers/secciones.js'
import { leccionesRouter } from './routers/lecciones.js'
import { archivosRouter } from './routers/archivos.js'
import { videosRouter } from './routers/videos.js'
import { estudianteRouter } from './routers/estudiante.js'

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  cursos: cursosRouter,
  secciones: seccionesRouter,
  lecciones: leccionesRouter,
  archivos: archivosRouter,
  videos: videosRouter,
  estudiante: estudianteRouter,
})

/** Tipo del router — lo consume el cliente tRPC en apps/web para type-safety extremo a extremo. */
export type AppRouter = typeof appRouter

/**
 * Caller server-side: los Server Components de Next.js llaman a los
 * procedures directamente (sin HTTP), pasando un contexto construido
 * con createContextInner desde la sesión NextAuth.
 */
export const createCaller = createCallerFactory(appRouter)

/** Tipo del caller server-side — para anotar retornos en los consumidores (evita TS2742). */
export type ApiCaller = ReturnType<typeof createCaller>
