// Tests del mock local de Cloudflare Stream: subida directa firmada,
// firmas de webhook (formato time=...,sig1=...) y parser de duración MP4.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  StreamLocal,
  duracionVideoMp4,
  firmarWebhookStream,
  verificarFirmaWebhookStream,
} from './stream.js'

let directorio: string
let stream: StreamLocal

beforeAll(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'amatla-stream-'))
  stream = new StreamLocal({
    directorio,
    urlBase: 'http://localhost:3000/api/stream-dev',
    secreto: 'secreto-test',
  })
})

afterAll(async () => {
  await rm(directorio, { recursive: true, force: true })
})

/** Construye una caja ISO BMFF: tamaño(4) tipo(4) contenido. */
function caja(tipo: string, contenido: Buffer): Buffer {
  const cabecera = Buffer.alloc(8)
  cabecera.writeUInt32BE(8 + contenido.length, 0)
  cabecera.write(tipo, 4, 'latin1')
  return Buffer.concat([cabecera, contenido])
}

/** MP4 mínimo: ftyp + moov>mvhd v0 con la duración dada. */
function mp4DePrueba(timescale: number, duracion: number): Buffer {
  const mvhd = Buffer.alloc(100)
  mvhd.writeUInt8(0, 0) // version 0
  mvhd.writeUInt32BE(timescale, 12)
  mvhd.writeUInt32BE(duracion, 16)
  return Buffer.concat([
    caja('ftyp', Buffer.from('isom\0\0\0\0isomiso2', 'latin1')),
    caja('moov', caja('mvhd', mvhd)),
  ])
}

describe('subida directa', () => {
  it('genera uid hex de 32 y URL con firma verificable', async () => {
    const subida = await stream.crearSubidaDirecta({ maxBytes: 1000 })
    expect(subida.uid).toMatch(/^[a-f0-9]{32}$/)
    expect(subida.expiraEn.getTime()).toBeGreaterThan(Date.now())

    const url = new URL(subida.uploadUrl)
    const exp = Number(url.searchParams.get('exp'))
    const max = Number(url.searchParams.get('max'))
    const firma = url.searchParams.get('firma')!
    expect(max).toBe(1000)
    expect(stream.verificarSubida(subida.uid, { exp, max }, firma)).toBe(true)
  })

  it('rechaza firma alterada, parámetros cambiados y expiración vencida', async () => {
    const subida = await stream.crearSubidaDirecta({ maxBytes: 1000 })
    const url = new URL(subida.uploadUrl)
    const exp = Number(url.searchParams.get('exp'))
    const firma = url.searchParams.get('firma')!

    expect(stream.verificarSubida(subida.uid, { exp, max: 1000 }, firma + '0')).toBe(false)
    expect(stream.verificarSubida(subida.uid, { exp, max: 999999 }, firma)).toBe(false)
    expect(
      stream.verificarSubida(subida.uid, { exp, max: 1000 }, firma, new Date((exp + 10) * 1000)),
    ).toBe(false)
  })

  it('guardar/leer/tamano/eliminar funcionan y rechazan uids inválidos', async () => {
    const { uid } = await stream.crearSubidaDirecta({ maxBytes: 1000 })
    await stream.guardar(uid, Buffer.from('video falso'))
    expect((await stream.leer(uid)).toString()).toBe('video falso')
    expect(await stream.tamano(uid)).toBe(11)
    await stream.eliminar(uid)
    expect(await stream.tamano(uid)).toBeNull()

    await expect(stream.guardar('../escape', Buffer.from('x'))).rejects.toThrow(/inválido/)
    await expect(stream.guardar('UID-NO-HEX-123456789012345678901', Buffer.from('x'))).rejects.toThrow()
  })
})

describe('firma de webhook (formato Cloudflare)', () => {
  const cuerpo = JSON.stringify({ uid: 'abc', status: { state: 'ready' } })

  it('firma y verifica un cuerpo íntegro', () => {
    const ahora = Math.floor(Date.now() / 1000)
    const header = firmarWebhookStream('secreto-wh', cuerpo, ahora)
    expect(header).toMatch(/^time=\d+,sig1=[a-f0-9]{64}$/)
    expect(verificarFirmaWebhookStream('secreto-wh', cuerpo, header)).toBe(true)
  })

  it('rechaza cuerpo alterado, secreto distinto y header ausente', () => {
    const ahora = Math.floor(Date.now() / 1000)
    const header = firmarWebhookStream('secreto-wh', cuerpo, ahora)
    expect(verificarFirmaWebhookStream('secreto-wh', cuerpo + 'x', header)).toBe(false)
    expect(verificarFirmaWebhookStream('otro-secreto', cuerpo, header)).toBe(false)
    expect(verificarFirmaWebhookStream('secreto-wh', cuerpo, null)).toBe(false)
  })

  it('rechaza firmas fuera de la ventana anti-replay', () => {
    const hace10Min = Math.floor(Date.now() / 1000) - 600
    const header = firmarWebhookStream('secreto-wh', cuerpo, hace10Min)
    expect(verificarFirmaWebhookStream('secreto-wh', cuerpo, header)).toBe(false)
    expect(
      verificarFirmaWebhookStream('secreto-wh', cuerpo, header, { toleranciaSegundos: 3600 }),
    ).toBe(true)
  })
})

describe('duracionVideoMp4', () => {
  it('lee la duración de un mvhd v0 (duration / timescale)', () => {
    expect(duracionVideoMp4(mp4DePrueba(1000, 754_000))).toBe(754)
    expect(duracionVideoMp4(mp4DePrueba(90_000, 90_000 * 83))).toBe(83)
  })

  it('lee la duración de un mvhd v1 (campos de 64 bits)', () => {
    const mvhd = Buffer.alloc(112)
    mvhd.writeUInt8(1, 0) // version 1
    mvhd.writeUInt32BE(600, 20)
    mvhd.writeBigUInt64BE(BigInt(600 * 42), 24)
    const datos = Buffer.concat([
      caja('ftyp', Buffer.from('qt  \0\0\0\0qt  ', 'latin1')),
      caja('moov', caja('mvhd', mvhd)),
    ])
    expect(duracionVideoMp4(datos)).toBe(42)
  })

  it('devuelve null para archivos que no son video', () => {
    expect(duracionVideoMp4(Buffer.from(''))).toBeNull()
    expect(duracionVideoMp4(Buffer.from('no soy un mp4, soy texto plano'))).toBeNull()
    expect(duracionVideoMp4(Buffer.from('%PDF-1.7 un pdf disfrazado'))).toBeNull()
    // ftyp válido pero sin moov/mvhd
    expect(duracionVideoMp4(caja('ftyp', Buffer.from('isom', 'latin1')))).toBeNull()
  })
})
