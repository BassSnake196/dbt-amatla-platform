// Router de sesión — endpoints base que ejercitan los niveles RBAC.
// La autenticación real (NextAuth v5 + refresh tokens) se implementa en la tarea de Auth.

import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc.js'

const sessionUserOutput = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(['SUPER_ADMIN', 'INSTRUCTOR', 'MODERATOR', 'STUDENT']),
})

export const authRouter = router({
  /** Usuario de la sesión actual — requiere autenticación (nivel 2). */
  me: protectedProcedure.output(sessionUserOutput).query(({ ctx }) => ctx.user),

  /** Conteo de usuarios — solo SUPER_ADMIN (nivel 4), valida la cadena RBAC completa. */
  userCount: adminProcedure
    .output(z.object({ total: z.number().int() }))
    .query(async ({ ctx }) => ({ total: await ctx.prisma.user.count() })),
})
