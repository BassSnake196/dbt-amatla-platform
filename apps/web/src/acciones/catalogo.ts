'use server'

// Server actions del catálogo público "General" — delegan en el router
// tRPC. La validación/ownership/auditoría viven en el backend.

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

export async function inscribirmeAction(cursoId: string): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.catalogo.inscribirme({ cursoId })
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
  return { error: null }
}
