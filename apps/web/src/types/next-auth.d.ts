// Augmentación de tipos de Auth.js: la sesión incluye id y rol del usuario.

import type { Role } from '@amatla/db'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
    } & DefaultSession['user']
  }

  interface User {
    role: Role
  }
}
