// Caller tRPC server-side: los Server Components llaman a los procedures
// directamente (sin salto HTTP), con el usuario de la sesión NextAuth.
// Type-safety de extremo a extremo: el tipo AppRouter viene de @amatla/api.

import { headers } from 'next/headers'
import { createCaller, createContextInner, type ApiCaller, type SessionUser } from '@amatla/api'
import { auth } from '@/auth'

export async function apiServer(): Promise<ApiCaller> {
  const session = await auth()

  let user: SessionUser | null = null
  if (session?.user) {
    user = {
      id: session.user.id,
      email: session.user.email ?? '',
      name: session.user.name ?? null,
      role: session.user.role,
    }
  }

  const cabeceras = await headers()
  return createCaller(
    createContextInner({
      user,
      requestMeta: { ip: null, userAgent: cabeceras.get('user-agent') },
    }),
  )
}
