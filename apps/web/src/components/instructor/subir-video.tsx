'use client'

// Subida de video con el flujo de Cloudflare Stream:
// elegir archivo → PUT directo a la URL de un solo uso → polling mientras
// Stream procesa (el webhook + worker enlazan la lección) → al quedar READY
// se refresca la página. Pensado para las filas compactas de lecciones.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MonitorUp, ShieldAlert, ShieldCheck } from 'lucide-react'
import { estadoVideoAction, solicitarSubidaVideoAction } from '@/acciones/videos'

type Fase = 'inactivo' | 'subiendo' | 'procesando' | 'listo' | 'rechazado'

const INTERVALO_POLL_MS = 2000
const MAX_INTENTOS_POLL = 90 // ~3 min — los videos tardan más que un PDF

interface SubirVideoProps {
  leccionId: string
  etiqueta: string
}

export function SubirVideo({ leccionId, etiqueta }: SubirVideoProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>('inactivo')
  const [mensaje, setMensaje] = useState<string | null>(null)

  function fallar(texto: string) {
    setFase('rechazado')
    setMensaje(texto)
  }

  async function procesar(archivo: File) {
    setFase('subiendo')
    setMensaje(null)

    const solicitud = await solicitarSubidaVideoAction({
      leccionId,
      nombreArchivo: archivo.name,
      mimeType: archivo.type,
      tamanoBytes: archivo.size,
    })
    if (solicitud.error !== null) return fallar(solicitud.error)

    // PUT directo a Stream — el video no pasa por el backend
    let subida: Response
    try {
      subida = await fetch(solicitud.url, { method: 'PUT', body: archivo })
    } catch {
      return fallar('No se pudo subir el video. Revisa tu conexión.')
    }
    if (!subida.ok) return fallar('La subida fue rechazada. Intenta de nuevo.')

    setFase('procesando')
    for (let intento = 0; intento < MAX_INTENTOS_POLL; intento++) {
      await new Promise((listo) => setTimeout(listo, INTERVALO_POLL_MS))
      const estado = await estadoVideoAction(solicitud.videoUploadId)
      if (estado.error !== null) return fallar(estado.error)

      if (estado.estado === 'READY') {
        setFase('listo')
        setMensaje('Video procesado y disponible.')
        router.refresh()
        return
      }
      if (estado.estado === 'ERROR') {
        return fallar('El archivo no pudo procesarse como video. Verifica el formato.')
      }
    }
    fallar('El procesamiento está tardando demasiado. Verifica que el worker de media esté corriendo.')
  }

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo archivo
    if (archivo) void procesar(archivo)
  }

  const ocupado = fase === 'subiendo' || fase === 'procesando'

  return (
    <span className="inline-flex items-center gap-1">
      <input ref={inputRef} type="file" accept=".mp4,.mov" onChange={alElegir} className="hidden" />
      <button
        type="button"
        disabled={ocupado}
        onClick={() => inputRef.current?.click()}
        title={ocupado ? 'Procesando…' : etiqueta}
        aria-label={etiqueta}
        className="rounded p-1 text-neutral-900/40 hover:text-brand-secondary disabled:opacity-50"
      >
        {ocupado ? (
          <Loader2 size={13} className="animate-spin text-brand-secondary" />
        ) : (
          <MonitorUp size={13} />
        )}
      </button>
      {fase === 'subiendo' && (
        <span className="text-[10px] font-medium text-brand-secondary">Subiendo…</span>
      )}
      {fase === 'procesando' && (
        <span className="text-[10px] font-medium text-brand-secondary">Procesando…</span>
      )}
      {fase === 'listo' && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-secondary">
          <ShieldCheck size={10} aria-hidden="true" />
          Listo
        </span>
      )}
      {fase === 'rechazado' && mensaje && (
        <span role="alert" className="inline-flex items-center gap-0.5 text-[10px] font-medium text-danger">
          <ShieldAlert size={10} aria-hidden="true" />
          {mensaje}
        </span>
      )}
    </span>
  )
}
