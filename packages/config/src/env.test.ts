// Unit tests del entorno tipado — válido, defaults, errores legibles y refinamiento de producción.

import { beforeEach, describe, expect, it } from 'vitest'
import { loadServerEnv, __resetEnvCache } from './env.js'

const ENV_MINIMO = {
  DATABASE_URL: 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev',
}

beforeEach(() => {
  __resetEnvCache()
})

describe('loadServerEnv', () => {
  it('acepta el entorno mínimo de desarrollo y aplica defaults', () => {
    const env = loadServerEnv(ENV_MINIMO)
    expect(env.NODE_ENV).toBe('development')
    expect(env.PORT).toBe(4000)
    expect(env.HOST).toBe('0.0.0.0')
    expect(env.CORS_ORIGINS).toBe('http://localhost:3000')
    expect(env.REDIS_URL).toBe('redis://localhost:6379')
    expect(env.R2_BUCKET).toBe('amatla-files')
  })

  it('convierte PORT de string a número (coerce)', () => {
    const env = loadServerEnv({ ...ENV_MINIMO, PORT: '8080' })
    expect(env.PORT).toBe(8080)
  })

  it('falla con mensaje legible si falta DATABASE_URL', () => {
    expect(() => loadServerEnv({})).toThrow(/DATABASE_URL/)
  })

  it('falla si DATABASE_URL no es una URL', () => {
    expect(() => loadServerEnv({ DATABASE_URL: 'no-es-url' })).toThrow(/DATABASE_URL/)
  })

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => loadServerEnv({ ...ENV_MINIMO, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/)
  })

  it('en desarrollo los secretos de cifrado son opcionales', () => {
    const env = loadServerEnv(ENV_MINIMO)
    expect(env.ENCRYPTION_MASTER_KEY).toBeUndefined()
  })

  it('en producción exige ENCRYPTION_MASTER_KEY, ENCRYPTION_SALT y AUTH_SECRET', () => {
    expect(() => loadServerEnv({ ...ENV_MINIMO, NODE_ENV: 'production' })).toThrow(
      /ENCRYPTION_MASTER_KEY[\s\S]*ENCRYPTION_SALT[\s\S]*AUTH_SECRET/,
    )
  })

  it('en producción pasa cuando los secretos están presentes', () => {
    const env = loadServerEnv({
      ...ENV_MINIMO,
      NODE_ENV: 'production',
      ENCRYPTION_MASTER_KEY: 'a'.repeat(64),
      ENCRYPTION_SALT: 'salt-prod-123',
      AUTH_SECRET: 'b'.repeat(48),
    })
    expect(env.NODE_ENV).toBe('production')
  })

  it('valida longitud mínima de ENCRYPTION_MASTER_KEY', () => {
    expect(() =>
      loadServerEnv({ ...ENV_MINIMO, ENCRYPTION_MASTER_KEY: 'corta' }),
    ).toThrow(/32 caracteres/)
  })

  it('cachea el resultado entre llamadas', () => {
    const primera = loadServerEnv(ENV_MINIMO)
    const segunda = loadServerEnv({ DATABASE_URL: 'postgresql://otro@localhost:5432/otro' })
    expect(segunda).toBe(primera)
  })
})
