'use server'

// Server actions de asignación de cursos (Enrollment) — delegan en el router
// tRPC. La validación/ownership/auditoría viven en el backend.

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

function mensajeLegible(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : 'Algo salió mal. Intenta de nuevo.'
  try {
    const issues = JSON.parse(mensaje) as Array<{ message: string }>
    return issues.map((issue) => issue.message).join('. ')
  } catch {
    return mensaje
  }
}

export async function asignarCursoAction(
  cursoId: string,
  studentId: string,
): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.inscripciones.asignar({ cursoId, studentId })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}/estudiantes`)
  return { error: null }
}

export async function revocarCursoAction(
  cursoId: string,
  studentId: string,
): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.inscripciones.revocar({ cursoId, studentId })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}/estudiantes`)
  return { error: null }
}
