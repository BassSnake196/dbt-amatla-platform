// Variables de entorno tipadas con Zod (requerimiento de seguridad #21:
// NUNCA secretos en el código — solo process.env validado aquí).
// Todo consumo de process.env en backend/workers debe pasar por loadServerEnv().

import { z } from 'zod'

const serverSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // ===== Servidor =====
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .describe('Dominios permitidos separados por coma — nunca wildcard en producción'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // ===== Base de datos y cache =====
    DATABASE_URL: z.string().url({ message: 'DATABASE_URL debe ser una URL de PostgreSQL válida' }),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    // ===== Cifrado field-level (obligatorio en producción) =====
    ENCRYPTION_MASTER_KEY: z.string().min(32, 'Mínimo 32 caracteres — generar con randomBytes(32)').optional(),
    ENCRYPTION_SALT: z.string().min(8).optional(),

    // ===== Auth (obligatorio en producción) =====
    AUTH_SECRET: z.string().min(32).optional(),
    AUTH_URL: z.string().url().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // ===== Servicios externos (se vuelven obligatorios en sus fases) =====
    RESEND_API_KEY: z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
    CLOUDFLARE_STREAM_TOKEN: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().default('amatla-files'),
    ANTHROPIC_API_KEY: z.string().optional(),

    // ===== Almacenamiento mock local (SOLO desarrollo — R2 lo reemplaza en prod) =====
    STORAGE_LOCAL_DIR: z.string().optional(),
    STORAGE_PUBLIC_URL: z.string().url().default('http://localhost:3000/api/almacen-dev'),
    STORAGE_SIGNING_SECRET: z.string().default('amatla-dev-almacen-secreto'),

    // ===== Stream mock local (SOLO desarrollo — Cloudflare Stream en prod) =====
    STREAM_LOCAL_DIR: z.string().optional(),
    STREAM_PUBLIC_URL: z.string().url().default('http://localhost:3000/api/stream-dev'),
    STREAM_SIGNING_SECRET: z.string().default('amatla-dev-stream-secreto'),
    // Secreto del webhook de Stream — en prod es el que se registra en Cloudflare
    STREAM_WEBHOOK_SECRET: z.string().default('amatla-dev-stream-webhook-secreto'),

    // ===== ClamAV (clamd por TCP — contenedor de docker-compose) =====
    CLAMAV_HOST: z.string().default('localhost'),
    CLAMAV_PORT: z.coerce.number().int().positive().default(3310),

    // ===== Monitoreo =====
    SENTRY_DSN: z.string().url().optional(),
    AXIOM_TOKEN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // En producción, los secretos de cifrado y auth dejan de ser opcionales:
    // sin ellos los datos clínicos quedarían en claro o las sesiones sin firmar.
    if (env.NODE_ENV === 'production') {
      const obligatoriasEnProd = [
        'ENCRYPTION_MASTER_KEY',
        'ENCRYPTION_SALT',
        'AUTH_SECRET',
      ] as const
      for (const variable of obligatoriasEnProd) {
        if (!env[variable]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [variable],
            message: `${variable} es obligatoria en producción`,
          })
        }
      }
    }
  })

export type ServerEnv = z.infer<typeof serverSchema>

let cache: ServerEnv | null = null

/**
 * Valida y devuelve el entorno tipado. Cachea el resultado tras la primera llamada.
 * Lanza con un mensaje legible (variable + motivo) si algo falta o es inválido —
 * mejor fallar al arrancar que descubrirlo en runtime.
 */
export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cache) return cache
  const resultado = serverSchema.safeParse(source)
  if (!resultado.success) {
    const detalles = resultado.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`❌ Variables de entorno inválidas:\n${detalles}\n(Revisa .env.example)`)
  }
  cache = resultado.data
  return cache
}

/** Solo para pruebas — limpia el caché para re-validar con otro entorno. */
export function __resetEnvCache(): void {
  cache = null
}
