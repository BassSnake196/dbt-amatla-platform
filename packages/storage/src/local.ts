// Implementación local (mock de R2): archivos en disco + URLs firmadas con HMAC.
// El endpoint HTTP que atiende los PUT/GET vive en apps/web (/api/almacen-dev)
// y SOLO existe fuera de producción. Cuando lleguen las credenciales de
// Cloudflare se agrega AlmacenR2 con la misma interfaz sin tocar consumidores.

import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import {
  firmarLectura,
  firmarSubida,
  verificarFirmaLectura,
  verificarFirmaSubida,
  type ParametrosLectura,
  type ParametrosSubida,
} from './firmas.js'

export interface OpcionesSubida {
  mimeType: string
  maxBytes: number
  ttlSegundos?: number
}

export interface UrlFirmada {
  url: string
  expiraEn: Date
}

/** Interfaz común — AlmacenR2 (futuro) debe cumplirla también. */
export interface Almacen {
  urlSubida(key: string, opciones: OpcionesSubida): UrlFirmada
  urlLectura(key: string, ttlSegundos?: number): UrlFirmada
  leer(key: string): Promise<Buffer>
  /** Tamaño en bytes, o null si el objeto no existe. */
  tamano(key: string): Promise<number | null>
  eliminar(key: string): Promise<void>
}

export interface ConfigAlmacenLocal {
  /** Directorio raíz donde se guardan los objetos. */
  directorio: string
  /** Base de las URLs firmadas, ej. http://localhost:3000/api/almacen-dev */
  urlBase: string
  /** Secreto HMAC — solo para desarrollo, nunca el de producción. */
  secreto: string
}

const TTL_SUBIDA_DEFAULT = 15 * 60 // 15 min para completar el PUT
const TTL_LECTURA_DEFAULT = 30 * 60 // regla de seguridad #10: máximo 30 min

// Solo keys planas tipo "cursos/abc/thumbnail/x.png" — sin '..', sin absolutos
const KEY_VALIDA = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/

export class AlmacenLocal implements Almacen {
  constructor(private readonly config: ConfigAlmacenLocal) {}

  /** Resuelve la ruta en disco verificando que no escape del directorio raíz. */
  private rutaDe(key: string): string {
    if (!KEY_VALIDA.test(key) || key.includes('..')) {
      throw new Error(`Key de almacenamiento inválida: ${key}`)
    }
    const raiz = resolve(this.config.directorio)
    const ruta = resolve(raiz, key)
    if (ruta !== raiz && !ruta.startsWith(raiz + sep)) {
      throw new Error(`Key fuera del directorio raíz: ${key}`)
    }
    return ruta
  }

  urlSubida(key: string, opciones: OpcionesSubida): UrlFirmada {
    this.rutaDe(key) // valida la key aunque aún no exista en disco
    const exp = Math.floor(Date.now() / 1000) + (opciones.ttlSegundos ?? TTL_SUBIDA_DEFAULT)
    const parametros: ParametrosSubida = { exp, max: opciones.maxBytes, ct: opciones.mimeType }
    const firma = firmarSubida(this.config.secreto, key, parametros)
    const query = new URLSearchParams({
      exp: String(exp),
      max: String(opciones.maxBytes),
      ct: opciones.mimeType,
      firma,
    })
    return { url: `${this.config.urlBase}/${key}?${query}`, expiraEn: new Date(exp * 1000) }
  }

  urlLectura(key: string, ttlSegundos = TTL_LECTURA_DEFAULT): UrlFirmada {
    this.rutaDe(key)
    const exp = Math.floor(Date.now() / 1000) + ttlSegundos
    const firma = firmarLectura(this.config.secreto, key, { exp })
    const query = new URLSearchParams({ exp: String(exp), firma })
    return { url: `${this.config.urlBase}/${key}?${query}`, expiraEn: new Date(exp * 1000) }
  }

  /** Verificación del PUT — la usa el endpoint mock antes de escribir. */
  verificarSubida(key: string, p: ParametrosSubida, firma: string): boolean {
    return verificarFirmaSubida(this.config.secreto, key, p, firma)
  }

  /** Verificación del GET — la usa el endpoint mock antes de servir. */
  verificarLectura(key: string, p: ParametrosLectura, firma: string): boolean {
    return verificarFirmaLectura(this.config.secreto, key, p, firma)
  }

  async guardar(key: string, datos: Buffer): Promise<void> {
    const ruta = this.rutaDe(key)
    await mkdir(dirname(ruta), { recursive: true })
    await writeFile(ruta, datos)
  }

  async leer(key: string): Promise<Buffer> {
    return readFile(this.rutaDe(key))
  }

  async tamano(key: string): Promise<number | null> {
    try {
      const info = await stat(this.rutaDe(key))
      return info.isFile() ? info.size : null
    } catch {
      return null
    }
  }

  async eliminar(key: string): Promise<void> {
    await rm(this.rutaDe(key), { force: true })
  }
}
