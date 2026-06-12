// Tipos del dashboard del estudiante, inferidos del caller tRPC —
// type-safety de extremo a extremo sin duplicar interfaces a mano.

import type { ApiCaller } from '@amatla/api'

export type DashboardEstudiante = Awaited<ReturnType<ApiCaller['estudiante']['dashboard']>>
export type CursoAsignado = DashboardEstudiante['cursos'][number]
export type SesionVivo = DashboardEstudiante['sesiones'][number]
export type EnCurso = NonNullable<DashboardEstudiante['enCurso']>
