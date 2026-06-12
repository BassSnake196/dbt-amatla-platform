// Firmas HMAC para las URLs "prefirmadas" del mock local de R2.
// Mismo contrato que una presigned URL real: quien tiene la URL puede
// subir/leer UN objeto concreto hasta que expira — nada más.

import { createHmac, timingSafeEqual } from 'node:crypto'

/** Parámetros que viajan en la query string de una URL de subida. */
export interface ParametrosSubida {
  /** Expiración en epoch segundos. */
  exp: number
  /** Tamaño máximo permitido del cuerpo en bytes. */
  max: number
  /** Content-Type exacto que debe traer el PUT. */
  ct: string
}

/** Parámetros de una URL de lectura. */
export interface ParametrosLectura {
  exp: number
}

function hmac(secreto: string, payload: string): string {
  return createHmac('sha256', secreto).update(payload).digest('hex')
}

export function firmarSubida(secreto: string, key: string, p: ParametrosSubida): string {
  return hmac(secreto, `PUT\n${key}\n${p.exp}\n${p.max}\n${p.ct}`)
}

export function firmarLectura(secreto: string, key: string, p: ParametrosLectura): string {
  return hmac(secreto, `GET\n${key}\n${p.exp}`)
}

/** Comparación en tiempo constante — nunca === sobre firmas. */
function firmasCoinciden(esperada: string, recibida: string): boolean {
  const a = Buffer.from(esperada, 'utf8')
  const b = Buffer.from(recibida, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function verificarFirmaSubida(
  secreto: string,
  key: string,
  p: ParametrosSubida,
  firma: string,
  ahora: Date = new Date(),
): boolean {
  if (p.exp * 1000 < ahora.getTime()) return false
  return firmasCoinciden(firmarSubida(secreto, key, p), firma)
}

export function verificarFirmaLectura(
  secreto: string,
  key: string,
  p: ParametrosLectura,
  firma: string,
  ahora: Date = new Date(),
): boolean {
  if (p.exp * 1000 < ahora.getTime()) return false
  return firmasCoinciden(firmarLectura(secreto, key, p), firma)
}
