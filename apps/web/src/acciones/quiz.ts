'use server'

// Server actions del gestor de quiz (instructor) — Fase 4.6.
// Toda la autorización (ownership 3 niveles + que la lección sea QUIZ) vive en
// el router `quiz` de @amatla/api; aquí solo se traduce el error a algo legible
// y se revalida la página del gestor.

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/api-server'

export interface ResultadoQuiz {
  error: string | null
  id?: string
}

export type OpcionQuiz = 'A' | 'B' | 'C' | 'D'

export interface DatosPregunta {
  enunciado: string
  opcionA: string
  opcionB: string
  opcionC: string
  opcionD: string
  correcta: OpcionQuiz
  explicacion: string
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

function revalidarGestor(cursoId: string, leccionId: string) {
  revalidatePath(`/instructor/cursos/${cursoId}/lecciones/${leccionId}/quiz`)
}

export async function crearPreguntaAction(
  cursoId: string,
  leccionId: string,
  datos: DatosPregunta,
): Promise<ResultadoQuiz> {
  try {
    const api = await apiServer()
    const { id } = await api.quiz.crearPregunta({ leccionId, ...datos })
    revalidarGestor(cursoId, leccionId)
    return { error: null, id }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function actualizarPreguntaAction(
  cursoId: string,
  leccionId: string,
  preguntaId: string,
  datos: DatosPregunta,
): Promise<ResultadoQuiz> {
  try {
    const api = await apiServer()
    await api.quiz.actualizarPregunta({ id: preguntaId, ...datos })
    revalidarGestor(cursoId, leccionId)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function eliminarPreguntaAction(
  cursoId: string,
  leccionId: string,
  preguntaId: string,
): Promise<ResultadoQuiz> {
  try {
    const api = await apiServer()
    await api.quiz.eliminarPregunta({ id: preguntaId })
    revalidarGestor(cursoId, leccionId)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function reordenarPreguntasAction(
  cursoId: string,
  leccionId: string,
  ordenIds: string[],
): Promise<ResultadoQuiz> {
  try {
    const api = await apiServer()
    await api.quiz.reordenarPreguntas({ leccionId, ordenIds })
    revalidarGestor(cursoId, leccionId)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}

export async function configurarPassingScoreAction(
  cursoId: string,
  leccionId: string,
  passingScore: number,
): Promise<ResultadoQuiz> {
  try {
    const api = await apiServer()
    await api.quiz.configurarPassingScore({ leccionId, passingScore })
    revalidarGestor(cursoId, leccionId)
    return { error: null }
  } catch (error) {
    return { error: mensajeLegible(error) }
  }
}
