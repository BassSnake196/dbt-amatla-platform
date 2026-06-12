'use server'

// Server actions de autenticación — los componentes cliente las importan directo.

import { signIn, signOut } from '@/auth'

export async function enviarEnlaceMagico(formData: FormData) {
  const email = formData.get('email')
  if (typeof email !== 'string' || email === '') return
  await signIn('resend', { email, redirectTo: '/' })
}

export async function iniciarConGoogle() {
  await signIn('google', { redirectTo: '/' })
}

export async function cerrarSesion() {
  await signOut({ redirectTo: '/iniciar-sesion' })
}
