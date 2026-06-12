// Configuración central de NextAuth v5 (Auth.js).
// Estrategia de sesión: BASE DE DATOS — así "invalidar todos los tokens de un
// usuario al cambiar su rol o desactivar la cuenta" es borrar sus filas de Session.

import NextAuth, { type NextAuthResult } from 'next-auth'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@amatla/db'

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: {
    signIn: '/iniciar-sesion',
    verifyRequest: '/iniciar-sesion/enlace-enviado',
  },
  providers: [
    // Magic Link por correo (Resend) — requiere RESEND_API_KEY en el entorno
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? 'DBT.Amatla <acceso@dbtamatla.mx>',
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Solo solicitar lo mínimo: perfil básico y correo
      authorization: { params: { scope: 'openid email profile' } },
    }),
  ],
  callbacks: {
    // Cuentas desactivadas no inician sesión (regla crítica de negocio)
    async signIn({ user }) {
      if (!user.email) return false
      const existente = await prisma.user.findUnique({
        where: { email: user.email },
        select: { isActive: true },
      })
      return existente?.isActive ?? true // usuarios nuevos entran como STUDENT
    },
    // El rol y el id viajan en la sesión — siempre leídos de BD, nunca del cliente.
    // IMPORTANTE: devolver un objeto NUEVO con solo lo necesario. Devolver `session`
    // tal cual filtraba el sessionToken y la fila completa de User al cliente.
    session({ session, user }) {
      return {
        expires: session.expires,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
          role: user.role,
        },
      }
    },
  },
})

// Anotaciones explícitas — workaround del error TS2742 ("inferred type cannot
// be named") de next-auth v5 beta con monorepos.
export const handlers: NextAuthResult['handlers'] = nextAuth.handlers
export const auth: NextAuthResult['auth'] = nextAuth.auth
export const signIn: NextAuthResult['signIn'] = nextAuth.signIn
export const signOut: NextAuthResult['signOut'] = nextAuth.signOut
