'use client'

// Subida de archivos con pipeline de seguridad:
// elegir archivo → PUT directo a la URL firmada → confirmar → polling
// mientras el worker escanea con ClamAV → al quedar CLEAN se refresca la
// página (el recurso recién entonces aparece enlazado).

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Paperclip, ShieldAlert, ShieldCheck, UploadCloud } from 'lucide-react'
import {
  confirmarSubidaArchivoAction,
  estadoSubidaArchivoAction,
  solicitarSubidaArchivoAction,
  type PropositoSubida,
} from '@/acciones/archivos'

type Fase = 'inactivo' | 'subiendo' | 'escaneando' | 'listo' | 'rechazado'

const INTERVALO_POLL_MS = 2000
const MAX_INTENTOS_POLL = 45 // ~90s de escaneo antes de rendirse

interface SubirArchivoProps {
  proposito: PropositoSubida
  objetivoId: string
  /** Para el input file, ej. ".jpg,.jpeg,.png" */
  accept: string
  etiqueta: string
  /** true → botón de ícono para filas compactas (lecciones). */
  compacto?: boolean
}

export function SubirArchivo({ proposito, objetivoId, accept, etiqueta, compacto }: SubirArchivoProps) {
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

    const solicitud = await solicitarSubidaArchivoAction({
      proposito,
      objetivoId,
      nombreArchivo: archivo.name,
      mimeType: archivo.type,
      tamanoBytes: archivo.size,
    })
    if (solicitud.error !== null) return fallar(solicitud.error)

    // PUT directo al almacén — el archivo no pasa por el backend
    let subida: Response
    try {
      subida = await fetch(solicitud.url, {
        method: 'PUT',
        headers: { 'Content-Type': archivo.type },
        body: archivo,
      })
    } catch {
      return fallar('No se pudo subir el archivo. Revisa tu conexión.')
    }
    if (!subida.ok) return fallar('La subida fue rechazada por el almacén. Intenta de nuevo.')

    const confirmacion = await confirmarSubidaArchivoAction(solicitud.uploadId)
    if (confirmacion.error) return fallar(confirmacion.error)

    setFase('escaneando')
    for (let intento = 0; intento < MAX_INTENTOS_POLL; intento++) {
      await new Promise((listo) => setTimeout(listo, INTERVALO_POLL_MS))
      const estado = await estadoSubidaArchivoAction(solicitud.uploadId)
      if (estado.error !== null) return fallar(estado.error)

      if (estado.estado === 'CLEAN') {
        setFase('listo')
        setMensaje('Archivo verificado y disponible.')
        router.refresh()
        return
      }
      if (estado.estado === 'INFECTED') {
        return fallar('El antivirus detectó una amenaza. El archivo fue eliminado.')
      }
      if (estado.estado === 'ERROR') {
        return fallar(
          estado.detalle?.startsWith('MIME_NO_COINCIDE')
            ? 'El contenido del archivo no corresponde a su tipo. Fue eliminado.'
            : 'No se pudo procesar el archivo. Intenta de nuevo.',
        )
      }
    }
    fallar('El escaneo está tardando demasiado. Verifica que el worker de media esté corriendo.')
  }

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo archivo
    if (archivo) void procesar(archivo)
  }

  const ocupado = fase === 'subiendo' || fase === 'escaneando'

  if (compacto) {
    return (
      <span className="inline-flex items-center gap-1">
        <input ref={inputRef} type="file" accept={accept} onChange={alElegir} className="hidden" />
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
            <Paperclip size={13} />
          )}
        </button>
        {fase === 'rechazado' && mensaje && (
          <span role="alert" className="inline-flex items-center gap-0.5 text-[10px] font-medium text-danger">
            <ShieldAlert size={10} aria-hidden="true" />
            {mensaje}
          </span>
        )}
        {fase === 'escaneando' && (
          <span className="text-[10px] font-medium text-brand-secondary">Escaneando…</span>
        )}
        {fase === 'listo' && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-secondary">
            <ShieldCheck size={10} aria-hidden="true" />
            Listo
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={accept} onChange={alElegir} className="hidden" />
      <button
        type="button"
        disabled={ocupado}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-100 px-4 py-2 text-xs font-semibold text-brand-dark transition-colors hover:border-brand-secondary hover:text-brand-secondary disabled:opacity-50"
      >
        {ocupado ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <UploadCloud size={14} aria-hidden="true" />
        )}
        {fase === 'subiendo' ? 'Subiendo…' : fase === 'escaneando' ? 'Escaneando…' : etiqueta}
      </button>

      {fase === 'escaneando' && (
        <p className="text-xs text-neutral-900/60">
          Verificando el archivo con el antivirus — esto toma unos segundos.
        </p>
      )}
      {fase === 'listo' && mensaje && (
        <p className="inline-flex items-center gap-1 text-xs font-medium text-brand-secondary">
          <ShieldCheck size={12} aria-hidden="true" />
          {mensaje}
        </p>
      )}
      {fase === 'rechazado' && mensaje && (
        <p role="alert" className="inline-flex items-center gap-1 text-xs font-medium text-danger">
          <ShieldAlert size={12} aria-hidden="true" />
          {mensaje}
        </p>
      )}
    </div>
  )
}
