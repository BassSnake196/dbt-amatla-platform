// @amatla/crypto — cifrado AES-256-GCM a nivel de campo.
// ÚNICA forma permitida de cifrar/descifrar datos sensibles (regla de desarrollo #6).
// Campos que DEBEN pasar por aquí: ClinicalNote.content, ClinicalNote.score,
// AiSession.messages y cualquier texto libre sobre el estado emocional del estudiante.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

// La clave se deriva una sola vez (scrypt es costoso a propósito) pero de forma
// perezosa: así el módulo puede importarse antes de que el entorno esté cargado
// y la rotación de ENCRYPTION_MASTER_KEY puede resetear el caché en pruebas.
let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey
  const masterKey = process.env.ENCRYPTION_MASTER_KEY
  const salt = process.env.ENCRYPTION_SALT
  if (!masterKey || !salt) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY y ENCRYPTION_SALT son obligatorias para cifrar datos sensibles. ' +
        'Genera la clave con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  cachedKey = scryptSync(masterKey, salt, 32)
  return cachedKey
}

/** Solo para pruebas y rotación de secretos — fuerza re-derivar la clave. */
export function __resetKeyCache(): void {
  cachedKey = null
}

/**
 * Cifra un texto plano. Cada llamada genera un IV aleatorio, por lo que
 * el mismo texto produce ciphertexts distintos.
 * Formato de salida: iv(hex):authTag(hex):ciphertext(hex)
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Descifra un valor producido por encrypt().
 * Lanza si el formato es inválido o el authTag no coincide (dato alterado).
 */
export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !authTagHex || encryptedHex === undefined) {
    throw new Error('Formato de ciphertext inválido — se espera iv:authTag:ciphertext en hex.')
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return decipher.update(Buffer.from(encryptedHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
}

/** Helper para campos de Prisma — cifrar antes de guardar. */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(value)
}

/**
 * Helper para campos de Prisma — descifrar al leer.
 * Devuelve null si el valor está vacío o corrupto (nunca propaga el error al usuario).
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decrypt(value)
  } catch {
    return null
  }
}
