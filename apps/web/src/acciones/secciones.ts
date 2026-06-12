'use server'

// Server actions de secciones — el componente de drag & drop las invoca.
// Validación y auditoría viven en el backend (tRPC).

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

export interface ResultadoSeccion {
  error: string | null
}

function mensajeLegible(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : 'Algo salió mal. Intenta de nuevo.'
  try {
    const issues = JSON.parse(mensaje) as Array<{ message: string }>
    return issues.map((issue) => issue.message).join('. ')
  } catch {
    return mensaje
  }
}

export async function crearSeccionAction(
  cursoId: string,
  titulo: string,
): Promise<ResultadoSeccion> {
  try {
    const api = await apiServer()
    await api.secciones.crear({ cursoId, titulo })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}`)
  return { error: null }
}

export async function renombrarSeccionAction(
  cursoId: string,
  seccionId: string,
  titulo: string,
): Promise<ResultadoSeccion> {
  try {
    const api = await apiServer()
    await api.secciones.actualizar({ id: seccionId, titulo })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}`)
  return { error: null }
}

export async function eliminarSeccionAction(
  cursoId: string,
  seccionId: string,
): Promise<ResultadoSeccion> {
  try {
    const api = await apiServer()
    await api.secciones.eliminar({ id: seccionId })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}`)
  return { error: null }
}

export async function reordenarSeccionesAction(
  cursoId: string,
  ordenIds: string[],
): Promise<ResultadoSeccion> {
  try {
    const api = await apiServer()
    await api.secciones.reordenar({ cursoId, ordenIds })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}`)
  return { error: null }
}
