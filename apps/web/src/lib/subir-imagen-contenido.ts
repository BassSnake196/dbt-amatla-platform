// Sube una imagen embebida (lecciones TEXT / presentación del curso) por el
// pipeline con escaneo y devuelve su key + URL de lectura firmada para
// insertarla en el editor. A diferencia del componente `SubirArchivo`, no
// refresca la página: el editor necesita la URL de vuelta para insertar la img.

import {
  confirmarSubidaArchivoAction,
  estadoSubidaArchivoAction,
  solicitarSubidaArchivoAction,
  urlContenidoSubidoAction,
} from '@/acciones/archivos'

const INTERVALO_POLL_MS = 2000
const MAX_INTENTOS_POLL = 45 // ~90s de escaneo antes de rendirse

export type ResultadoImagen = { error: string } | { error: null; key: string; url: string }

export async function subirImagenContenido(cursoId: string, archivo: File): Promise<ResultadoImagen> {
  const solicitud = await solicitarSubidaArchivoAction({
    proposito: 'IMAGEN_CONTENIDO',
    objetivoId: cursoId,
    nombreArchivo: archivo.name,
    mimeType: archivo.type,
    tamanoBytes: archivo.size,
  })
  if (solicitud.error !== null) return { error: solicitud.error }

  let subida: Response
  try {
    subida = await fetch(solicitud.url, {
      method: 'PUT',
      headers: { 'Content-Type': archivo.type },
      body: archivo,
    })
  } catch {
    return { error: 'No se pudo subir la imagen. Revisa tu conexión.' }
  }
  if (!subida.ok) return { error: 'La subida fue rechazada por el almacén. Intenta de nuevo.' }

  const confirmacion = await confirmarSubidaArchivoAction(solicitud.uploadId)
  if (confirmacion.error) return { error: confirmacion.error }

  for (let intento = 0; intento < MAX_INTENTOS_POLL; intento++) {
    await new Promise((listo) => setTimeout(listo, INTERVALO_POLL_MS))
    const estado = await estadoSubidaArchivoAction(solicitud.uploadId)
    if (estado.error !== null) return { error: estado.error }

    if (estado.estado === 'CLEAN') {
      const datos = await urlContenidoSubidoAction(solicitud.uploadId)
      if (datos.error !== null) return { error: datos.error }
      return { error: null, key: datos.key, url: datos.url }
    }
    if (estado.estado === 'INFECTED') {
      return { error: 'El antivirus detectó una amenaza. La imagen fue eliminada.' }
    }
    if (estado.estado === 'ERROR') {
      return {
        error: estado.detalle?.startsWith('MIME_NO_COINCIDE')
          ? 'El contenido del archivo no corresponde a una imagen. Fue eliminado.'
          : 'No se pudo procesar la imagen. Intenta de nuevo.',
      }
    }
  }
  return { error: 'El escaneo está tardando demasiado. Intenta de nuevo en un momento.' }
}
