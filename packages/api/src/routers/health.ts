// Router de salud — endpoints base para verificar plomería (API + BD).

import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'

export const healthRouter = router({
  /** Latido simple del servidor. */
  ping: publicProcedure
    .output(z.object({ ok: z.literal(true), timestamp: z.string() }))
    .query(() => ({ ok: true as const, timestamp: new Date().toISOString() })),

  /** Verifica conectividad con PostgreSQL. */
  check: publicProcedure
    .output(z.object({ api: z.literal('ok'), database: z.enum(['ok', 'error']) }))
    .query(async ({ ctx }) => {
      try {
        await ctx.prisma.$queryRaw`SELECT 1`
        return { api: 'ok' as const, database: 'ok' as const }
      } catch {
        return { api: 'ok' as const, database: 'error' as const }
      }
    }),
})
