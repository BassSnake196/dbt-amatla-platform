// Datos mock del catálogo — se reemplazan por tRPC en Fase 2/3.

export type CategoriaCurso = 'Regulación emocional' | 'RO-DBT' | 'Mindfulness' | 'Habilidades TIP'

export interface CursoMock {
  id: string
  titulo: string
  instructora: string
  categoria: CategoriaCurso
  lecciones: number
  duracionHoras: number
  rating: number
  votos: number
  progreso: number // 0-100
  nuevo?: boolean
}

export const CATEGORIAS: CategoriaCurso[] = [
  'Regulación emocional',
  'RO-DBT',
  'Mindfulness',
  'Habilidades TIP',
]

export const CURSO_EN_CURSO = {
  titulo: 'Habilidades DBT: Regulación Emocional',
  leccionActual: 'Lección 7 · Verificar los hechos',
  progreso: 60,
  restante: '1 h 20 min restantes',
}

export const CURSOS_MOCK: CursoMock[] = [
  {
    id: 'c1',
    titulo: 'Habilidades DBT: Regulación Emocional',
    instructora: 'Dra. Mariana Cepeda',
    categoria: 'Regulación emocional',
    lecciones: 12,
    duracionHoras: 3.5,
    rating: 4.9,
    votos: 38,
    progreso: 60,
  },
  {
    id: 'c2',
    titulo: 'RO-DBT: Apertura Radical — Fundamentos',
    instructora: 'Mtra. Sofía Argüelles',
    categoria: 'RO-DBT',
    lecciones: 9,
    duracionHoras: 2.5,
    rating: 4.8,
    votos: 21,
    progreso: 25,
  },
  {
    id: 'c3',
    titulo: 'Mindfulness para terapeutas',
    instructora: 'Dra. Mariana Cepeda',
    categoria: 'Mindfulness',
    lecciones: 8,
    duracionHoras: 2,
    rating: 4.7,
    votos: 17,
    progreso: 0,
    nuevo: true,
  },
  {
    id: 'c4',
    titulo: 'Tolerancia al malestar: kit de supervivencia',
    instructora: 'Mtra. Sofía Argüelles',
    categoria: 'Regulación emocional',
    lecciones: 10,
    duracionHoras: 3,
    rating: 4.9,
    votos: 29,
    progreso: 100,
  },
  {
    id: 'c5',
    titulo: 'Señalización social y conexión (RO)',
    instructora: 'Dra. Itzel Romero',
    categoria: 'RO-DBT',
    lecciones: 11,
    duracionHoras: 3,
    rating: 4.6,
    votos: 12,
    progreso: 0,
    nuevo: true,
  },
  {
    id: 'c6',
    titulo: 'Efectividad interpersonal (TIP) en la práctica',
    instructora: 'Dra. Itzel Romero',
    categoria: 'Habilidades TIP',
    lecciones: 14,
    duracionHoras: 4,
    rating: 4.8,
    votos: 33,
    progreso: 40,
  },
]

export const SESIONES_VIVO = [
  {
    id: 's1',
    dia: 'MIÉ',
    fecha: 17,
    mes: 'jun',
    titulo: 'Práctica grupal: Verificar los hechos',
    hora: '18:00 · Ciudad de México',
    curso: 'Regulación Emocional',
  },
  {
    id: 's2',
    dia: 'MIÉ',
    fecha: 24,
    mes: 'jun',
    titulo: 'Círculo RO: señales sociales en consulta',
    hora: '18:00 · Ciudad de México',
    curso: 'RO-DBT Fundamentos',
  },
]
