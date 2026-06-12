// @amatla/shared — types, utils y constantes compartidas entre apps, packages y workers.

/** Roles de la plataforma (espejo del enum Role en Prisma). */
export const ROLES = ['SUPER_ADMIN', 'INSTRUCTOR', 'MODERATOR', 'STUDENT'] as const
export type Role = (typeof ROLES)[number]

/** Zona horaria del cliente — las fechas se guardan en UTC y se convierten en UI. */
export const TIMEZONE = 'America/Mexico_City'

/** Paleta de marca DBT.Amatla. */
export const BRAND_COLORS = {
  primary: '#F5A623', // naranja cálido — CTAs, acentos, progreso
  secondary: '#2E7D6B', // verde teal — nav activa, estados completados
  dark: '#1A3A35', // verde noche — headers, textos importantes
  surface: '#F9EDD5', // crema suave — fondos de contenido
  danger: '#C0392B', // alertas de crisis — usar con cuidado
} as const
