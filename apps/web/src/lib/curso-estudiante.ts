// Carga de la vista de curso del estudiante, deduplicada por request con
// React cache(): el layout y la página la piden en el mismo render sin
// disparar dos queries. NOT_FOUND del resolver → null (la página hace 404).

import { cache } from 'react'
import { apiServer } from '@/lib/api-server'
import type { CursoEstudiante } from '@/lib/tipos-estudiante'

export const obtenerCursoEstudiante = cache(
  async (cursoId: string): Promise<CursoEstudiante | null> => {
    const api = await apiServer()
    return api.estudiante.curso({ id: cursoId }).catch(() => null)
  },
)
