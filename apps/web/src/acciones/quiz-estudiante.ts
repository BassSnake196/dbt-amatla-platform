'use server'

// Server action del quiz para el estudiante — Fase 4.7.
// El score y el feedback (incluida la respuesta correcta) los calcula
// SIEMPRE el servidor; aquí solo se traduce el error a algo legible.

import { apiServer } from '@/lib/api-server'

export type OpcionRespuesta = 'A' | 'B' | 'C' | 'D'

export interface ResultadoPregunta {
  preguntaId: string
  correcta: OpcionRespuesta
  elegida: OpcionRespuesta | null
  acerto: boolean
  explicacion: string | null
}

export interface FeedbackIntento {
  score: number
  passed: boolean
  passingScore: number
  resultados: ResultadoPregunta[]
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

export async function enviarIntentoAction(
  leccionId: string,
  respuestas: Array<{ preguntaId: string; opcion: OpcionRespuesta }>,
): Promise<{ feedback: FeedbackIntento | null; error: string | null }> {
  try {
    const api = await apiServer()
    const feedback = await api.quiz.enviarIntento({ leccionId, respuestas })
    return { feedback, error: null }
  } catch (error) {
    return { feedback: null, error: mensajeLegible(error) }
  }
}
