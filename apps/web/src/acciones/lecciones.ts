'use server'

// Server actions de lecciones — el componente de la estructura las invoca.

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

export interface ResultadoLeccion {
  error: string | null
  id?: string
}

export type TipoLeccion = 'VIDEO' | 'PDF' | 'TEXT' | 'QUIZ'

function mensajeLegible(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : 'Algo salió mal. Intenta de nuevo.'
  try {
    const issues = JSON.parse(mensaje) as Array<{ message: string }>
    return issues.map((issue) => issue.message).join('. ')
  } catch {
    return mensaje
  }
}

export async function crearLeccionAction(
  cursoId: string,
  seccionId: string,
  titulo: string,
  tipo: TipoLeccion,
): Promise<ResultadoLeccion> {
  try {
    const api = await apiServer()
    const { id } = await api.lecciones.crear({ seccionId, titulo, tipo })
    revalidatePath(`/instructor/cursos/${cursoId}`)
    return { error: null, id }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function renombrarLeccionAction(
  cursoId: string,
  leccionId: string,
  titulo: string,
): Promise<ResultadoLeccion> {
  try {
    const api = await apiServer()
    await api.lecciones.actualizar({ id: leccionId, titulo })
    revalidatePath(`/instructor/cursos/${cursoId}`)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function eliminarLeccionAction(
  cursoId: string,
  leccionId: string,
): Promise<ResultadoLeccion> {
  try {
    const api = await apiServer()
    await api.lecciones.eliminar({ id: leccionId })
    revalidatePath(`/instructor/cursos/${cursoId}`)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function guardarContenidoLeccionAction(
  cursoId: string,
  leccionId: string,
  contenido: string,
): Promise<ResultadoLeccion> {
  try {
    const api = await apiServer()
    await api.lecciones.guardarContenido({ id: leccionId, contenido })
    revalidatePath(`/instructor/cursos/${cursoId}`)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function alternarDescargaLeccionAction(
  cursoId: string,
  leccionId: string,
  permitir: boolean,
): Promise<ResultadoLeccion> {
  try {
    const api = await apiServer()
    await api.lecciones.actualizar({ id: leccionId, permitirDescarga: permitir })
    revalidatePath(`/instructor/cursos/${cursoId}`)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function reordenarLeccionesAction(
  cursoId: string,
  seccionId: string,
  ordenIds: string[],
): Promise<ResultadoLeccion> {
  try {
    const api = await apiServer()
    await api.lecciones.reordenar({ seccionId, ordenIds })
    revalidatePath(`/instructor/cursos/${cursoId}`)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}
