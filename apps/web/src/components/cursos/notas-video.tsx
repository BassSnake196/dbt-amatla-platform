'use client'

// Notas personales por timestamp del video. El texto se cifra en BD
// (AES-256-GCM); aquí solo se muestra/edita en claro para el dueño.
// Comparte el control del reproductor: capturar el momento actual al
// escribir y saltar al timestamp al hacer clic en una nota.

import { useState, useTransition } from 'react'
import { Clock, Loader2, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  actualizarNotaAction,
  crearNotaAction,
  eliminarNotaAction,
  listarNotasAction,
  type NotaVideo,
} from '@/acciones/estudiante'
import { formatearTimestamp } from '@/lib/formato'

interface NotasVideoProps {
  leccionId: string
  notasIniciales: NotaVideo[]
  obtenerTiempoActual: () => number
  irATiempo: (segundos: number) => void
}

export function NotasVideo({
  leccionId,
  notasIniciales,
  obtenerTiempoActual,
  irATiempo,
}: NotasVideoProps) {
  const [notas, setNotas] = useState(notasIniciales)
  const [borrador, setBorrador] = useState('')
  const [tiempoCapturado, setTiempoCapturado] = useState<number | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [textoEdicion, setTextoEdicion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  function refrescar() {
    startTransition(async () => {
      setNotas(await listarNotasAction(leccionId))
    })
  }

  function agregar(e: React.FormEvent) {
    e.preventDefault()
    const texto = borrador.trim()
    if (!texto) return
    const posicion = tiempoCapturado ?? obtenerTiempoActual()
    setError(null)
    startTransition(async () => {
      const r = await crearNotaAction(leccionId, posicion, texto)
      if (r.error) setError(r.error)
      else {
        setBorrador('')
        setTiempoCapturado(null)
        setNotas(await listarNotasAction(leccionId))
      }
    })
  }

  function guardarEdicion(id: string) {
    const texto = textoEdicion.trim()
    if (!texto) return
    setError(null)
    startTransition(async () => {
      const r = await actualizarNotaAction(id, texto)
      if (r.error) setError(r.error)
      else {
        setEditando(null)
        setNotas(await listarNotasAction(leccionId))
      }
    })
  }

  function eliminar(id: string) {
    if (!window.confirm('¿Eliminar esta nota?')) return
    setNotas((prev) => prev.filter((n) => n.id !== id))
    startTransition(async () => {
      const r = await eliminarNotaAction(id)
      if (r.error) {
        setError(r.error)
        refrescar()
      }
    })
  }

  return (
    <section aria-labelledby="notas-titulo" className="rounded-card bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 id="notas-titulo" className="font-serif text-lg font-semibold text-brand-dark">
          Mis notas
        </h3>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-secondary"
          title="Tus notas se guardan cifradas y solo tú las ves"
        >
          <Lock size={13} aria-hidden="true" /> privadas y cifradas
        </span>
      </div>

      {/* Nueva nota */}
      <form onSubmit={agregar} className="mt-4">
        <textarea
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onFocus={() => {
            if (tiempoCapturado === null) setTiempoCapturado(Math.floor(obtenerTiempoActual()))
          }}
          rows={2}
          maxLength={2000}
          placeholder="Escribe una nota sobre este momento del video…"
          className="w-full resize-y rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          {tiempoCapturado !== null ? (
            <span className="inline-flex items-center gap-1 text-xs text-neutral-900/55">
              <Clock size={12} aria-hidden="true" /> en {formatearTimestamp(tiempoCapturado)}
            </span>
          ) : (
            <span className="text-xs text-neutral-900/40">
              Se marcará en el momento actual del video
            </span>
          )}
          <button
            type="submit"
            disabled={borrador.trim() === '' || pendiente}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-secondary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#245e52] disabled:opacity-40"
          >
            {pendiente ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={13} aria-hidden="true" />
            )}
            Agregar nota
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {/* Lista de notas */}
      <ul className="mt-5 space-y-2.5">
        {notas.length === 0 ? (
          <li className="text-sm text-neutral-900/50">
            Aún no tienes notas en esta lección. Crea una para recordar momentos clave.
          </li>
        ) : (
          notas.map((nota) => (
            <li key={nota.id} className="rounded-lg border border-neutral-100 p-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => irATiempo(nota.posicionSegundos)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-surface px-2 py-0.5 text-[11px] font-semibold text-brand-dark transition-colors hover:bg-brand-primary hover:text-white"
                  aria-label={`Ir a ${formatearTimestamp(nota.posicionSegundos)} en el video`}
                >
                  <Clock size={11} aria-hidden="true" />
                  {formatearTimestamp(nota.posicionSegundos)}
                </button>

                {editando === nota.id ? (
                  <div className="min-w-0 flex-1">
                    <textarea
                      autoFocus
                      value={textoEdicion}
                      onChange={(e) => setTextoEdicion(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      className="w-full resize-y rounded border border-brand-secondary px-2 py-1 text-sm focus:outline-none"
                    />
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => guardarEdicion(nota.id)}
                        disabled={pendiente}
                        className="rounded-full bg-brand-secondary px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando(null)}
                        className="rounded-full px-3 py-1 text-[11px] font-semibold text-neutral-900/50 hover:bg-neutral-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="min-w-0 flex-1 whitespace-pre-line text-sm text-neutral-900/80">
                    {nota.texto}
                  </p>
                )}

                {editando !== nota.id && (
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEditando(nota.id)
                        setTextoEdicion(nota.texto)
                      }}
                      className="rounded p-1 text-neutral-900/40 hover:text-brand-dark"
                      aria-label="Editar nota"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(nota.id)}
                      className="rounded p-1 text-neutral-900/40 hover:text-danger"
                      aria-label="Eliminar nota"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
