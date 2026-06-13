'use client'

// Reproductor HLS/MP4 con Vidstack (requisitos del prompt maestro):
// - URL firmada on-demand con renovación automática ~5 min antes de expirar
// - Posición guardada cada 15 s (intervalo, no cada frame) + al pausar/terminar
// - Completitud al 80% — la decide el SERVER con la duración de BD; aquí solo
//   se refresca la UI cuando la mutación reporta completadaAhora
// - Velocidades 0.75x / 1x / 1.25x / 1.5x / 2x

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MediaPlayer,
  MediaProvider,
  type MediaPlayerInstance,
} from '@vidstack/react'
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
  type DefaultLayoutTranslations,
} from '@vidstack/react/player/layouts/default'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import {
  guardarProgresoVideoAction,
  renovarUrlVideoAction,
  type NotaVideo,
} from '@/acciones/estudiante'
import { NotasVideo } from './notas-video'

const INTERVALO_GUARDADO_MS = 15_000
const MARGEN_RENOVACION_MS = 5 * 60_000 // renovar 5 min antes de expirar
const VELOCIDADES = [0.75, 1, 1.25, 1.5, 2]

// Etiquetas en español de México (la UI no muestra strings en inglés)
const TRADUCCIONES: Partial<DefaultLayoutTranslations> = {
  Play: 'Reproducir',
  Pause: 'Pausar',
  Mute: 'Silenciar',
  Unmute: 'Activar sonido',
  Volume: 'Volumen',
  Settings: 'Configuración',
  Speed: 'Velocidad',
  Normal: 'Normal',
  Quality: 'Calidad',
  Auto: 'Automática',
  Fullscreen: 'Pantalla completa',
  'Exit Fullscreen': 'Salir de pantalla completa',
  'Enter Fullscreen': 'Pantalla completa',
  'Seek Forward': 'Adelantar',
  'Seek Backward': 'Retroceder',
  Captions: 'Subtítulos',
  'Closed-Captions On': 'Activar subtítulos',
  'Closed-Captions Off': 'Desactivar subtítulos',
  Download: 'Descargar',
  Replay: 'Volver a ver',
  Seek: 'Buscar',
  LIVE: 'EN VIVO',
}

interface ReproductorVideoProps {
  leccionId: string
  titulo: string
  urlInicial: string
  // El mock local sirve MP4; con Cloudflare Stream real será HLS
  // (application/x-mpegurl) — ampliar la unión cuando llegue
  tipo: 'video/mp4'
  expiraEpochInicial: number
  posicionInicial: number // segundos — para reanudar donde se quedó
  notasIniciales: NotaVideo[]
}

export function ReproductorVideo({
  leccionId,
  titulo,
  urlInicial,
  tipo,
  expiraEpochInicial,
  posicionInicial,
  notasIniciales,
}: ReproductorVideoProps) {
  const router = useRouter()
  const playerRef = useRef<MediaPlayerInstance>(null)
  const [src, setSrc] = useState({ src: urlInicial, type: tipo })
  const expiraRef = useRef(expiraEpochInicial)
  // Posición a restaurar cuando el medio esté listo (reanudar o cambio de URL)
  const posicionPendienteRef = useRef<number | null>(posicionInicial > 0 ? posicionInicial : null)
  const ultimaGuardadaRef = useRef(-1)
  const guardandoRef = useRef(false)

  async function guardarPosicion() {
    const player = playerRef.current
    if (!player || guardandoRef.current) return
    const posicion = Math.floor(player.currentTime)
    // Evitar escrituras redundantes (misma posición que la última guardada)
    if (posicion === ultimaGuardadaRef.current || posicion <= 0) return

    guardandoRef.current = true
    try {
      const r = await guardarProgresoVideoAction(leccionId, posicion)
      ultimaGuardadaRef.current = posicion
      // Recién completada: refrescar para que el índice marque la ✓
      if (r.completadaAhora) router.refresh()
    } finally {
      guardandoRef.current = false
    }
  }

  // Guardado periódico cada 15 s mientras se reproduce (debounced por intervalo)
  useEffect(() => {
    const intervalo = setInterval(() => {
      const player = playerRef.current
      if (player && !player.paused) void guardarPosicion()
    }, INTERVALO_GUARDADO_MS)
    return () => clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leccionId])

  // Renovación automática de la URL firmada antes de que expire
  useEffect(() => {
    const espera = Math.max(10_000, expiraRef.current - Date.now() - MARGEN_RENOVACION_MS)
    const temporizador = setTimeout(async () => {
      const player = playerRef.current
      const posicion = player ? Math.floor(player.currentTime) : 0
      const r = await renovarUrlVideoAction(leccionId)
      if (r.url && r.expiraEpoch) {
        expiraRef.current = r.expiraEpoch
        posicionPendienteRef.current = posicion > 0 ? posicion : null
        setSrc({ src: r.url, type: tipo })
      }
    }, espera)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, leccionId, tipo])

  // Saltar a un timestamp desde una nota: posiciona y, si está pausado, reproduce
  function irATiempo(segundos: number) {
    const player = playerRef.current
    if (!player) return
    player.currentTime = segundos
    if (player.paused) void player.play()
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-card bg-black shadow-card">
        <MediaPlayer
          ref={playerRef}
          src={src}
          title={titulo}
          onCanPlay={() => {
            const pendiente = posicionPendienteRef.current
            if (pendiente !== null && playerRef.current) {
              playerRef.current.currentTime = pendiente
              posicionPendienteRef.current = null
            }
          }}
          onPause={() => void guardarPosicion()}
          onEnded={() => void guardarPosicion()}
          className="aspect-video w-full"
        >
          <MediaProvider />
          <DefaultVideoLayout
            icons={defaultLayoutIcons}
            translations={TRADUCCIONES}
            playbackRates={VELOCIDADES}
          />
        </MediaPlayer>
      </div>

      <NotasVideo
        leccionId={leccionId}
        notasIniciales={notasIniciales}
        obtenerTiempoActual={() => playerRef.current?.currentTime ?? 0}
        irATiempo={irATiempo}
      />
    </div>
  )
}
