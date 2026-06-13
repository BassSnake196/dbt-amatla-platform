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

export async function marcarTextoVistoAction(
  leccionId: string,
): Promise<{ completadaAhora: boolean; error: string | null }> {
  const api = await apiServer()
  try {
    const r = await api.estudiante.marcarTextoVisto({ leccionId })
    return { completadaAhora: r.completadaAhora, error: null }
  } catch {
    return { completadaAhora: false, error: 'No se pudo registrar el avance.' }
  }
}

// Finalizar manualmente una lección VIDEO/PDF/TEXT (botón "Finalizar lección")
// para poder avanzar en el curso. El QUIZ no entra aquí (se aprueba).
export async function completarLeccionAction(
  leccionId: string,
): Promise<{ completadaAhora: boolean; error: string | null }> {
  const api = await apiServer()
  try {
    const r = await api.estudiante.completarLeccion({ leccionId })
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

// ---- Notas personales por timestamp (texto cifrado en BD) ----

export interface NotaVideo {
  id: string
  posicionSegundos: number
  texto: string
  actualizadaEl: string // ISO — la fecha viaja serializada
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

export async function listarNotasAction(leccionId: string): Promise<NotaVideo[]> {
  const api = await apiServer()
  try {
    const notas = await api.estudiante.notasLeccion({ leccionId })
    return notas.map((n) => ({
      id: n.id,
      posicionSegundos: n.posicionSegundos,
      texto: n.texto,
      actualizadaEl: n.actualizadaEl.toISOString(),
    }))
  } catch {
    return []
  }
}

export async function crearNotaAction(
  leccionId: string,
  posicionSegundos: number,
  texto: string,
): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.estudiante.crearNota({
      leccionId,
      posicionSegundos: Math.max(0, Math.round(posicionSegundos)),
      texto,
    })
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function actualizarNotaAction(
  id: string,
  texto: string,
): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.estudiante.actualizarNota({ id, texto })
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function eliminarNotaAction(id: string): Promise<{ error: string | null }> {
  const api = await apiServer()
  try {
    await api.estudiante.eliminarNota({ id })
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}
