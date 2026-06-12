// Login de DESARROLLO — crea/renueva una sesión de BD y pone la cookie.
// Bloqueado en producción. Uso desde el navegador:
//   http://localhost:3000/api/dev-login            → entra como instructora
//   http://localhost:3000/api/dev-login?como=estudiante → entra como estudiante

import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@amatla/db'

const USUARIOS_DEV = {
  instructora: { token: 'dev-session-instructor', userId: 'dev-instructor-1' },
  estudiante: { token: 'dev-session-student', userId: 'dev-student-1' },
  admin: { token: 'dev-session-admin', userId: 'dev-admin-1' },
} as const

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('No disponible', { status: 404 })
  }

  const como = req.nextUrl.searchParams.get('como') ?? 'instructora'
  const usuario = USUARIOS_DEV[como as keyof typeof USUARIOS_DEV]
  if (!usuario) {
    return new NextResponse(`Usuario desconocido. Opciones: ${Object.keys(USUARIOS_DEV).join(', ')}`, {
      status: 400,
    })
  }

  const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.session.upsert({
    where: { sessionToken: usuario.token },
    update: { expires: expira },
    create: { sessionToken: usuario.token, userId: usuario.userId, expires: expira },
  })

  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set('authjs.session-token', usuario.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  return res
}
