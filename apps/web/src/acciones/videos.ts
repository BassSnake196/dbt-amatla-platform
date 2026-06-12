'use server'

// Server actions de la subida de video — delegan en los procedures tRPC.
// El video en sí NUNCA pasa por aquí: el navegador hace PUT directo a la
// URL de un solo uso (mock local hoy, Cloudflare Stream en producción).

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

export async function solicitarSubidaVideoAction(datos: {
  leccionId: string
  nombreArchivo: string
  mimeType: string
  tamanoBytes: number
}): Promise<{ error: string } | { error: null; videoUploadId: string; url: string }> {
  const api = await apiServer()
  try {
    const r = await api.videos.solicitarSubida(datos)
    return { error: null, videoUploadId: r.videoUploadId, url: r.url }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function estadoVideoAction(
  videoUploadId: string,
): Promise<
  | { error: string }
  | { error: null; estado: 'PENDING' | 'READY' | 'ERROR'; duracion: number | null; detalle: string | null }
> {
  const api = await apiServer()
  try {
    const r = await api.videos.estadoSubida({ videoUploadId })
    return { error: null, estado: r.estado, duracion: r.duracion, detalle: r.detalle }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}
