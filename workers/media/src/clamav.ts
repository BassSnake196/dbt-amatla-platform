// Cliente mínimo de clamd por TCP (protocolo INSTREAM) — sin dependencias.
// El contenedor de docker-compose expone clamd en localhost:3310; en
// producción será un host interno. Nunca exponer clamd a internet.

import { Socket } from 'node:net'

export interface ResultadoEscaneo {
  limpio: boolean
  /** Nombre de la firma detectada (ej. Win.Test.EICAR_HDB-1) o null si está limpio. */
  firma: string | null
}

export interface OpcionesClamd {
  host: string
  port: number
  timeoutMs?: number
}

const TROZO = 64 * 1024 // tamaño de chunk recomendado para INSTREAM

/**
 * Escanea un buffer con clamd via INSTREAM:
 * "zINSTREAM\0" + [len(4 bytes BE) + datos]* + len 0 → respuesta "stream: OK"
 * o "stream: <firma> FOUND". Cualquier otra respuesta es un error operativo.
 */
export function escanearBuffer(datos: Buffer, opciones: OpcionesClamd): Promise<ResultadoEscaneo> {
  return new Promise((resolve, reject) => {
    const socket = new Socket()
    const recibido: Buffer[] = []
    let terminado = false

    function fallar(error: Error) {
      if (terminado) return
      terminado = true
      socket.destroy()
      reject(error)
    }

    socket.setTimeout(opciones.timeoutMs ?? 60_000)
    socket.on('timeout', () => fallar(new Error('clamd: tiempo de espera agotado')))
    socket.on('error', (error) => fallar(new Error(`clamd: ${error.message}`)))
    socket.on('data', (trozo) => recibido.push(trozo))
    socket.on('close', () => {
      if (terminado) return
      terminado = true
      const respuesta = Buffer.concat(recibido).toString('utf8').replace(/\0/g, '').trim()
      if (/\bOK$/.test(respuesta)) {
        resolve({ limpio: true, firma: null })
        return
      }
      const detectado = respuesta.match(/stream: (.+) FOUND$/)
      if (detectado) {
        resolve({ limpio: false, firma: detectado[1] ?? 'desconocida' })
        return
      }
      reject(new Error(`clamd: respuesta inesperada: "${respuesta || '(vacía)'}"`))
    })

    socket.connect(opciones.port, opciones.host, () => {
      socket.write('zINSTREAM\0')
      for (let i = 0; i < datos.length; i += TROZO) {
        const parte = datos.subarray(i, Math.min(i + TROZO, datos.length))
        const cabecera = Buffer.alloc(4)
        cabecera.writeUInt32BE(parte.length, 0)
        socket.write(cabecera)
        socket.write(parte)
      }
      socket.write(Buffer.alloc(4)) // longitud 0 = fin del stream
    })
  })
}
