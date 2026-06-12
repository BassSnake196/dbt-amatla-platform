// Mock local de Cloudflare Stream — SOLO DESARROLLO.
// Replica el contrato de "Direct Creator Uploads": el backend pide una URL
// de subida de un solo uso (uid + uploadUrl con expiración), el navegador
// sube el video DIRECTO (nunca pasa por nuestro backend) y, al terminar el
// "procesamiento", Stream notifica por webhook firmado. Cuando lleguen las
// credenciales de Cloudflare se agrega StreamCloudflare con esta misma
// interfaz sin tocar consumidores.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

export interface SubidaDirectaVideo {
  /** ID del video en Stream — esto es lo único que se guarda en BD. */
  uid: string
  /** URL de un solo uso para que el navegador suba el archivo. */
  uploadUrl: string
  expiraEn: Date
}

/** Interfaz común — StreamCloudflare (futuro) debe cumplirla también. */
export interface StreamVideos {
  crearSubidaDirecta(opciones: { maxBytes: number; ttlSegundos?: number }): Promise<SubidaDirectaVideo>
  eliminar(uid: string): Promise<void>
}

export interface ConfigStreamLocal {
  /** Directorio raíz donde se guardan los videos del mock. */
  directorio: string
  /** Base de las URLs de subida, ej. http://localhost:3000/api/stream-dev */
  urlBase: string
  /** Secreto HMAC — solo para desarrollo, nunca el de producción. */
  secreto: string
}

const TTL_SUBIDA_DEFAULT = 30 * 60 // 30 min para completar la subida del video

// uids estilo Cloudflare Stream: 32 caracteres hex
const UID_VALIDO = /^[a-f0-9]{32}$/

function hmacHex(secreto: string, payload: string): string {
  return createHmac('sha256', secreto).update(payload).digest('hex')
}

/** Comparación en tiempo constante — nunca === sobre firmas. */
function firmasCoinciden(esperada: string, recibida: string): boolean {
  const a = Buffer.from(esperada, 'utf8')
  const b = Buffer.from(recibida, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export class StreamLocal implements StreamVideos {
  constructor(private readonly config: ConfigStreamLocal) {}

  /** Ruta en disco del video — el uid hex ya impide path traversal. */
  private rutaDe(uid: string): string {
    if (!UID_VALIDO.test(uid)) {
      throw new Error(`uid de video inválido: ${uid}`)
    }
    const raiz = resolve(this.config.directorio)
    const ruta = resolve(raiz, `${uid}.bin`)
    if (!ruta.startsWith(raiz + sep)) {
      throw new Error(`uid fuera del directorio raíz: ${uid}`)
    }
    return ruta
  }

  async crearSubidaDirecta(opciones: {
    maxBytes: number
    ttlSegundos?: number
  }): Promise<SubidaDirectaVideo> {
    const uid = randomBytes(16).toString('hex')
    const exp = Math.floor(Date.now() / 1000) + (opciones.ttlSegundos ?? TTL_SUBIDA_DEFAULT)
    const firma = hmacHex(this.config.secreto, `STREAM-PUT\n${uid}\n${exp}\n${opciones.maxBytes}`)
    const query = new URLSearchParams({ exp: String(exp), max: String(opciones.maxBytes), firma })
    return {
      uid,
      uploadUrl: `${this.config.urlBase}/${uid}?${query}`,
      expiraEn: new Date(exp * 1000),
    }
  }

  /** Verificación del PUT — la usa el endpoint mock antes de escribir. */
  verificarSubida(uid: string, p: { exp: number; max: number }, firma: string, ahora: Date = new Date()): boolean {
    if (!UID_VALIDO.test(uid)) return false
    if (p.exp * 1000 < ahora.getTime()) return false
    const esperada = hmacHex(this.config.secreto, `STREAM-PUT\n${uid}\n${p.exp}\n${p.max}`)
    return firmasCoinciden(esperada, firma)
  }

  async guardar(uid: string, datos: Buffer): Promise<void> {
    const ruta = this.rutaDe(uid)
    await mkdir(dirname(ruta), { recursive: true })
    await writeFile(ruta, datos)
  }

  async leer(uid: string): Promise<Buffer> {
    return readFile(this.rutaDe(uid))
  }

  /** Tamaño en bytes, o null si el video no existe. */
  async tamano(uid: string): Promise<number | null> {
    try {
      const info = await stat(this.rutaDe(uid))
      return info.isFile() ? info.size : null
    } catch {
      return null
    }
  }

  async eliminar(uid: string): Promise<void> {
    await rm(this.rutaDe(uid), { force: true })
  }
}

// ===== Webhook firmado (mismo formato que Cloudflare Stream) =====
// Cloudflare manda el header `Webhook-Signature: time=<epoch>,sig1=<hex>`
// donde sig1 = HMAC-SHA256(secreto, `${time}.${cuerpo}`). El mock firma
// igual, así el handler del webhook es EL MISMO en desarrollo y producción.

export function firmarWebhookStream(secreto: string, cuerpo: string, tiempoEpoch: number): string {
  const sig1 = hmacHex(secreto, `${tiempoEpoch}.${cuerpo}`)
  return `time=${tiempoEpoch},sig1=${sig1}`
}

export function verificarFirmaWebhookStream(
  secreto: string,
  cuerpo: string,
  header: string | null,
  opciones: { ahora?: Date; toleranciaSegundos?: number } = {},
): boolean {
  if (!header) return false
  const partes = new Map(
    header.split(',').map((parte) => {
      const igual = parte.indexOf('=')
      return [parte.slice(0, igual).trim(), parte.slice(igual + 1).trim()] as const
    }),
  )
  const tiempo = Number(partes.get('time'))
  const sig1 = partes.get('sig1')
  if (!Number.isInteger(tiempo) || !sig1) return false

  // Ventana anti-replay: rechazar firmas demasiado viejas (o del futuro)
  const ahora = (opciones.ahora ?? new Date()).getTime() / 1000
  const tolerancia = opciones.toleranciaSegundos ?? 5 * 60
  if (Math.abs(ahora - tiempo) > tolerancia) return false

  return firmasCoinciden(hmacHex(secreto, `${tiempo}.${cuerpo}`), sig1)
}

// ===== Duración del video (simula el procesamiento de Cloudflare) =====
// MP4 y MOV comparten el formato ISO BMFF: cajas [tamaño(4) tipo(4) datos].
// La duración vive en moov > mvhd (duration / timescale). Si el archivo no
// es un ISO BMFF válido, el "procesamiento" falla — igual que Stream
// rechazaría un archivo que no es video.

function leerUInt64(datos: Buffer, offset: number): number {
  return Number(datos.readBigUInt64BE(offset))
}

function buscarCaja(
  datos: Buffer,
  tipo: string,
  desde: number,
  hasta: number,
): { inicio: number; fin: number } | null {
  let offset = desde
  while (offset + 8 <= hasta) {
    let tamano = datos.readUInt32BE(offset)
    const nombre = datos.toString('latin1', offset + 4, offset + 8)
    let cabecera = 8
    if (tamano === 1) {
      if (offset + 16 > hasta) return null
      tamano = leerUInt64(datos, offset + 8)
      cabecera = 16
    } else if (tamano === 0) {
      tamano = hasta - offset // la caja llega hasta el final
    }
    if (tamano < cabecera || offset + tamano > hasta) return null
    if (nombre === tipo) return { inicio: offset + cabecera, fin: offset + tamano }
    offset += tamano
  }
  return null
}

/** Duración en segundos de un MP4/MOV, o null si no es un video válido. */
export function duracionVideoMp4(datos: Buffer): number | null {
  try {
    if (datos.length < 12) return null
    // Un ISO BMFF real empieza con la caja ftyp
    if (datos.toString('latin1', 4, 8) !== 'ftyp') return null

    const moov = buscarCaja(datos, 'moov', 0, datos.length)
    if (!moov) return null
    const mvhd = buscarCaja(datos, 'mvhd', moov.inicio, moov.fin)
    if (!mvhd) return null

    const version = datos.readUInt8(mvhd.inicio)
    let timescale: number
    let duracion: number
    if (version === 1) {
      // version(1) flags(3) creation(8) modification(8) timescale(4) duration(8)
      timescale = datos.readUInt32BE(mvhd.inicio + 20)
      duracion = leerUInt64(datos, mvhd.inicio + 24)
    } else {
      // version(1) flags(3) creation(4) modification(4) timescale(4) duration(4)
      timescale = datos.readUInt32BE(mvhd.inicio + 12)
      duracion = datos.readUInt32BE(mvhd.inicio + 16)
    }
    if (timescale <= 0 || duracion <= 0) return null
    return Math.round(duracion / timescale)
  } catch {
    return null
  }
}
