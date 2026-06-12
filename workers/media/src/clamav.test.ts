// Integración con el clamd real de docker-compose (puerto 3310).
// Usa EICAR: archivo de prueba estándar que todo antivirus debe detectar
// — no es malware real.

import { describe, expect, it } from 'vitest'
import { escanearBuffer } from './clamav.js'

const OPCIONES = {
  host: process.env.CLAMAV_HOST ?? 'localhost',
  port: Number(process.env.CLAMAV_PORT ?? 3310),
  timeoutMs: 120_000,
}

// Cadena EICAR partida para que este archivo de test no dispare antivirus locales
const EICAR =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR' + '-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

describe('escanearBuffer (clamd INSTREAM)', () => {
  it('da limpio para contenido inofensivo', async () => {
    const r = await escanearBuffer(Buffer.from('hola, soy un PDF muy normal'), OPCIONES)
    expect(r).toEqual({ limpio: true, firma: null })
  }, 130_000)

  it('detecta EICAR como infectado con nombre de firma', async () => {
    const r = await escanearBuffer(Buffer.from(EICAR), OPCIONES)
    expect(r.limpio).toBe(false)
    expect(r.firma).toMatch(/eicar/i)
  }, 130_000)

  it('falla con error claro si clamd no responde', async () => {
    await expect(
      escanearBuffer(Buffer.from('x'), { host: 'localhost', port: 1, timeoutMs: 3000 }),
    ).rejects.toThrow(/clamd/)
  })
})
