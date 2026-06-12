// Mock local de R2 — SOLO DESARROLLO (en producción este endpoint no existe;
// los presigned URLs apuntan directo a Cloudflare R2).
// Acepta el PUT del navegador y sirve GETs, ambos con URL firmada HMAC
// emitida por @amatla/storage. Replica el contrato de una presigned URL:
// objeto exacto + content-type exacto + tamaño máximo + expiración.

import type { NextRequest } from 'next/server'
import { almacenLocalDesdeEnv } from '@amatla/storage'

const almacen = almacenLocalDesdeEnv()

// El MIME servido se infiere de la extensión — suficiente para el mock
const MIME_POR_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
}

function noDisponible() {
  return Response.json({ error: 'No disponible' }, { status: 404 })
}

type Params = { params: Promise<{ key: string[] }> }

export async function PUT(req: NextRequest, { params }: Params) {
  if (process.env.NODE_ENV === 'production') return noDisponible()

  const key = (await params).key.join('/')
  const q = req.nextUrl.searchParams
  const exp = Number(q.get('exp'))
  const max = Number(q.get('max'))
  const ct = q.get('ct') ?? ''
  const firma = q.get('firma') ?? ''

  if (!almacen.verificarSubida(key, { exp, max, ct }, firma)) {
    return Response.json({ error: 'Firma inválida o expirada' }, { status: 403 })
  }
  if ((req.headers.get('content-type') ?? '') !== ct) {
    return Response.json({ error: 'Content-Type no coincide con la firma' }, { status: 400 })
  }

  const cuerpo = Buffer.from(await req.arrayBuffer())
  if (cuerpo.length === 0 || cuerpo.length > max) {
    return Response.json({ error: 'Tamaño fuera del límite firmado' }, { status: 413 })
  }

  await almacen.guardar(key, cuerpo)
  return Response.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: Params) {
  if (process.env.NODE_ENV === 'production') return noDisponible()

  const key = (await params).key.join('/')
  const q = req.nextUrl.searchParams
  const exp = Number(q.get('exp'))
  const firma = q.get('firma') ?? ''

  if (!almacen.verificarLectura(key, { exp }, firma)) {
    return Response.json({ error: 'Firma inválida o expirada' }, { status: 403 })
  }

  let datos: Buffer
  try {
    datos = await almacen.leer(key)
  } catch {
    return Response.json({ error: 'No encontrado' }, { status: 404 })
  }

  const extension = key.slice(key.lastIndexOf('.') + 1).toLowerCase()
  return new Response(new Uint8Array(datos), {
    headers: {
      'Content-Type': MIME_POR_EXTENSION[extension] ?? 'application/octet-stream',
      'Content-Length': String(datos.length),
      // URL firmada de corta vida — nunca cachear en intermediarios
      'Cache-Control': 'private, max-age=0, no-store',
    },
  })
}
