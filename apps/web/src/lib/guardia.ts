// Guardias de rol para páginas del instructor — usar en cada page.tsx del área.

import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export async function exigirInstructor() {
  const session = await auth()
  const rol = session?.user?.role
  if (rol !== 'INSTRUCTOR' && rol !== 'SUPER_ADMIN') redirect('/')
  return session!
}
