// Webhook de Cloudflare Stream — este endpoint SÍ existe en producción
// (es el que se registra en Cloudflare). Verifica la firma HMAC del header
// Webhook-Signature sobre el cuerpo CRUDO y encola el procesamiento en la
// cola media — el enlace de la lección lo hace el worker, nunca este handler.

import { z } from 'zod'
import { encolarProcesamientoVideo } from '@amatla/api'
import { verificarFirmaWebhookStream } from '@amatla/storage'

const payloadStream = z.object({
  uid: z.string().min(1),
  status: z.object({ state: z.string() }),
  duration: z.number().positive().optional(),
})

export async function POST(req: Request) {
  // La firma se calcula sobre el cuerpo crudo — leerlo ANTES de parsear
  const cuerpo = await req.text()
  const secreto = process.env.STREAM_WEBHOOK_SECRET ?? 'amatla-dev-stream-webhook-secreto'
  if (!verificarFirmaWebhookStream(secreto, cuerpo, req.headers.get('webhook-signature'))) {
    return Response.json({ error: 'Firma inválida' }, { status: 401 })
  }

  let payload: z.infer<typeof payloadStream>
  try {
    payload = payloadStream.parse(JSON.parse(cuerpo))
  } catch {
    return Response.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const listo = payload.status.state === 'ready' && payload.duration !== undefined
  await encolarProcesamientoVideo(
    listo
      ? { uid: payload.uid, estado: 'ready', duracionSegundos: Math.round(payload.duration!) }
      : { uid: payload.uid, estado: 'error', detalle: `ESTADO_STREAM:${payload.status.state}` },
  )

  return Response.json({ ok: true })
}
