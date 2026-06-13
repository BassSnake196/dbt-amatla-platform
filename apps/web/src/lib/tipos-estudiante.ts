// Tipos del dashboard del estudiante, inferidos del caller tRPC —
// type-safety de extremo a extremo sin duplicar interfaces a mano.

import type { ApiCaller } from '@amatla/api'

export type DashboardEstudiante = Awaited<ReturnType<ApiCaller['estudiante']['dashboard']>>
export type CursoAsignado = DashboardEstudiante['cursos'][number]
export type SesionVivo = DashboardEstudiante['sesiones'][number]
export type EnCurso = NonNullable<DashboardEstudiante['enCurso']>

export type CursoEstudiante = Awaited<ReturnType<ApiCaller['estudiante']['curso']>>
export type SeccionEstudiante = CursoEstudiante['secciones'][number]
export type LeccionIndice = SeccionEstudiante['lecciones'][number]
export type LeccionEstudiante = Awaited<ReturnType<ApiCaller['estudiante']['leccion']>>
