// Mock local de Cloudflare Stream — SOLO DESARROLLO (en producción los
// videos suben directo a Cloudflare y este endpoint no existe).
// Acepta el PUT del navegador con la URL de un solo uso emitida por
// @amatla/storage y simula el procesamiento de Stream: extrae la duración
// del MP4/MOV y dispara el webhook firmado contra /api/stream/webhook —
// exactamente el mismo ciclo que hará Cloudflare en producción.

import type { NextRequest } from 'next/server'
import { duracionVideoMp4, firmarWebhookStream, streamLocalDesdeEnv } from '@amatla/storage'

const stream = streamLocalDesdeEnv()

function noDisponible() {
  return Response.json({ error: 'No disponible' }, { status: 404 })
}

type Params = { params: Promise<{ uid: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  if (process.env.NODE_ENV === 'production') return noDisponible()

  const { uid } = await params
  const q = req.nextUrl.searchParams
  const exp = Number(q.get('exp'))
  const max = Number(q.get('max'))
  const firma = q.get('firma') ?? ''

  if (!stream.verificarSubida(uid, { exp, max }, firma)) {
    return Response.json({ error: 'Firma inválida o expirada' }, { status: 403 })
  }

  const cuerpo = Buffer.from(await req.arrayBuffer())
  if (cuerpo.length === 0 || cuerpo.length > max) {
    return Response.json({ error: 'Tamaño fuera del límite firmado' }, { status: 413 })
  }

  await stream.guardar(uid, cuerpo)

  // "Procesamiento" de Stream: si el archivo no es un MP4/MOV válido, el
  // webhook reporta error — igual que Cloudflare con un archivo corrupto
  const duracion = duracionVideoMp4(cuerpo)
  const payload = JSON.stringify(
    duracion === null
      ? { uid, status: { state: 'error' }, readyToStream: false }
      : { uid, status: { state: 'ready' }, duration: duracion, readyToStream: true },
  )

  const secreto = process.env.STREAM_WEBHOOK_SECRET ?? 'amatla-dev-stream-webhook-secreto'
  const header = firmarWebhookStream(secreto, payload, Math.floor(Date.now() / 1000))
  try {
    const respuesta = await fetch(new URL('/api/stream/webhook', req.nextUrl.origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Webhook-Signature': header },
      body: payload,
    })
    if (!respuesta.ok) {
      console.error(`[stream-dev] El webhook respondió ${respuesta.status} para uid ${uid}`)
    }
  } catch (error) {
    // Cloudflare reintentaría el webhook; en el mock basta con dejar rastro
    console.error(`[stream-dev] No se pudo entregar el webhook de ${uid}:`, error)
  }

  return Response.json({ ok: true })
}
