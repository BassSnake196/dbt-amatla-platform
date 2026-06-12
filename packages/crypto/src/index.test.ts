// Unit tests de @amatla/crypto — cobertura exigida por la estrategia ISO/IEC 25010:
// roundtrip, casos borde (string vacío, caracteres especiales, unicode) y manipulación.

import { beforeAll, describe, expect, it } from 'vitest'
import { encrypt, decrypt, encryptField, decryptField, __resetKeyCache } from './index.js'

beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = 'clave-de-prueba-solo-para-tests-0123456789abcdef'
  process.env.ENCRYPTION_SALT = 'salt-de-prueba'
  __resetKeyCache()
})

describe('encrypt / decrypt', () => {
  it('descifra exactamente lo que cifró (roundtrip)', () => {
    const original = 'Respuesta GHQ-12: puntaje 24, requiere seguimiento'
    expect(decrypt(encrypt(original))).toBe(original)
  })

  it('soporta caracteres especiales y acentos del español', () => {
    const original = 'Niño con ansiedad — evaluación: ¿cómo te sentiste? ¡Bien! (80%)'
    expect(decrypt(encrypt(original))).toBe(original)
  })

  it('soporta unicode completo (emojis, CJK)', () => {
    const original = '😀🧠💚 中文テスト عربى'
    expect(decrypt(encrypt(original))).toBe(original)
  })

  it('soporta textos largos (notas clínicas extensas)', () => {
    const original = 'Lorem psicología clínica. '.repeat(5000)
    expect(decrypt(encrypt(original))).toBe(original)
  })

  it('soporta el string vacío', () => {
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('genera ciphertext distinto para el mismo texto (IV aleatorio)', () => {
    const texto = 'misma nota clínica'
    expect(encrypt(texto)).not.toBe(encrypt(texto))
  })

  it('produce el formato iv:authTag:ciphertext en hex', () => {
    const parts = encrypt('abc').split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/) // IV de 16 bytes
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/) // authTag de 16 bytes
  })

  it('rechaza datos alterados (authTag GCM no coincide)', () => {
    const cifrado = encrypt('dato sensible')
    const [iv, tag, datos] = cifrado.split(':') as [string, string, string]
    const alterado = datos.startsWith('0') ? `1${datos.slice(1)}` : `0${datos.slice(1)}`
    expect(() => decrypt(`${iv}:${tag}:${alterado}`)).toThrow()
  })

  it('rechaza formatos inválidos', () => {
    expect(() => decrypt('no-es-un-ciphertext')).toThrow()
    expect(() => decrypt('')).toThrow()
  })
})

describe('encryptField / decryptField (helpers para Prisma)', () => {
  it('roundtrip de un campo con valor', () => {
    const cifrado = encryptField('puntaje DASS-21: 15')
    expect(cifrado).not.toBeNull()
    expect(cifrado).not.toContain('DASS-21') // nunca se persiste en claro
    expect(decryptField(cifrado)).toBe('puntaje DASS-21: 15')
  })

  it('null y undefined pasan como null sin cifrar', () => {
    expect(encryptField(null)).toBeNull()
    expect(encryptField(undefined)).toBeNull()
    expect(decryptField(null)).toBeNull()
    expect(decryptField(undefined)).toBeNull()
  })

  it('decryptField devuelve null ante datos corruptos en vez de lanzar', () => {
    expect(decryptField('basura:corrupta:zz')).toBeNull()
    expect(decryptField('sin-formato')).toBeNull()
  })
})

describe('manejo de la clave', () => {
  it('falla con mensaje claro si faltan las variables de entorno', () => {
    const key = process.env.ENCRYPTION_MASTER_KEY
    delete process.env.ENCRYPTION_MASTER_KEY
    __resetKeyCache()
    expect(() => encrypt('x')).toThrow(/ENCRYPTION_MASTER_KEY/)
    process.env.ENCRYPTION_MASTER_KEY = key
    __resetKeyCache()
  })
})
