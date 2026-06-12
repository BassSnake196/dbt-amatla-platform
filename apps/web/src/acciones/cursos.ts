'use server'

// Server actions del CRUD de cursos — delegan en los procedures tRPC
// (la validación y la auditoría viven en el backend, no aquí).

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { apiServer } from '@/lib/api-server'

export interface EstadoFormCurso {
  error: string | null
}

function extraerDatos(formData: FormData) {
  return {
    titulo: String(formData.get('titulo') ?? ''),
    descripcion: String(formData.get('descripcion') ?? ''),
    categoria: String(formData.get('categoria') ?? ''),
  }
}

/** Los TRPCError de validación Zod traen un JSON de issues — volverlo legible. */
function mensajeLegible(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : 'Algo salió mal. Intenta de nuevo.'
  try {
    const issues = JSON.parse(mensaje) as Array<{ message: string }>
    return issues.map((issue) => issue.message).join('. ')
  } catch {
    return mensaje
  }
}

export async function crearCursoAction(
  _estadoPrevio: EstadoFormCurso,
  formData: FormData,
): Promise<EstadoFormCurso> {
  const api = await apiServer()
  try {
    await api.cursos.crear(extraerDatos(formData))
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath('/instructor')
  redirect('/instructor')
}

export async function publicarCursoAction(cursoId: string): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.cursos.publicar({ id: cursoId })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}`)
  revalidatePath('/instructor')
  return { error: null }
}

export async function archivarCursoAction(cursoId: string): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.cursos.archivar({ id: cursoId })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath(`/instructor/cursos/${cursoId}`)
  revalidatePath('/instructor')
  return { error: null }
}

export async function actualizarCursoAction(
  cursoId: string,
  _estadoPrevio: EstadoFormCurso,
  formData: FormData,
): Promise<EstadoFormCurso> {
  const api = await apiServer()
  try {
    await api.cursos.actualizar({ id: cursoId, ...extraerDatos(formData) })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  revalidatePath('/instructor')
  redirect('/instructor')
}
