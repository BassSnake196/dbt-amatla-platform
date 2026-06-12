'use server'

// Server actions del pipeline de subida — delegan en los procedures tRPC.
// El archivo en sí NUNCA pasa por aquí: el navegador hace PUT directo a la
// URL firmada (mock local hoy, R2 en producción).

import { apiServer } from '@/lib/api-server'

export type PropositoSubida = 'THUMBNAIL_CURSO' | 'PDF_LECCION'

function mensajeLegible(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : 'Algo salió mal. Intenta de nuevo.'
  try {
    const issues = JSON.parse(mensaje) as Array<{ message: string }>
    return issues.map((issue) => issue.message).join('. ')
  } catch {
    return mensaje
  }
}

export async function solicitarSubidaArchivoAction(datos: {
  proposito: PropositoSubida
  objetivoId: string
  nombreArchivo: string
  mimeType: string
  tamanoBytes: number
}): Promise<{ error: string } | { error: null; uploadId: string; url: string }> {
  const api = await apiServer()
  try {
    const r = await api.archivos.solicitarSubida(datos)
    return { error: null, uploadId: r.uploadId, url: r.url }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function confirmarSubidaArchivoAction(
  uploadId: string,
): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.archivos.confirmarSubida({ uploadId })
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function estadoSubidaArchivoAction(
  uploadId: string,
): Promise<
  { error: string } | { error: null; estado: 'PENDING' | 'CLEAN' | 'INFECTED' | 'ERROR'; detalle: string | null }
> {
  const api = await apiServer()
  try {
    const r = await api.archivos.estadoSubida({ uploadId })
    return { error: null, estado: r.estado, detalle: r.detalle }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}
