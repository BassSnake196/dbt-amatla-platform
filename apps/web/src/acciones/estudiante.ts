'use server'

// Server actions del portal del estudiante — delegan en los procedures tRPC.
// El reproductor las llama desde el cliente: guardar posición (cada ~15 s)
// y renovar la URL firmada del video antes de que expire (regla #10).

import { apiServer } from '@/lib/api-server'

export async function guardarProgresoVideoAction(
  leccionId: string,
  posicionSegundos: number,
): Promise<{ completadaAhora: boolean; error: string | null }> {
  const api = await apiServer()
  try {
    const r = await api.estudiante.progresoVideo({
      leccionId,
      posicionSegundos: Math.max(0, Math.round(posicionSegundos)),
    })
    return { completadaAhora: r.completadaAhora, error: null }
  } catch {
    // No interrumpir la reproducción por un fallo de guardado — se reintenta solo
    return { completadaAhora: false, error: 'No se pudo guardar el progreso.' }
  }
}

export async function marcarMaterialVistoAction(
  leccionId: string,
): Promise<{ completadaAhora: boolean; error: string | null }> {
  const api = await apiServer()
  try {
    const r = await api.estudiante.materialVisto({ leccionId })
    return { completadaAhora: r.completadaAhora, error: null }
  } catch {
    return { completadaAhora: false, error: 'No se pudo registrar el avance.' }
  }
}

export async function renovarUrlVideoAction(
  leccionId: string,
): Promise<{ url: string | null; expiraEpoch: number | null; error: string | null }> {
  const api = await apiServer()
  try {
    const r = await api.estudiante.videoLeccion({ id: leccionId })
    return { url: r.url, expiraEpoch: r.expiraEn.getTime(), error: null }
  } catch {
    return { url: null, expiraEpoch: null, error: 'No se pudo renovar el acceso al video.' }
  }
}
