'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlignLeft, Check, Eye, FileCheck2, FileText, GripVertical, MonitorPlay, Pencil, Plus, Trash2, Video, X } from 'lucide-react'
import {
  crearLeccionAction,
  eliminarLeccionAction,
  renombrarLeccionAction,
  reordenarLeccionesAction,
  type TipoLeccion,
} from '@/acciones/lecciones'
import { SubirArchivo } from './subir-archivo'
import { SubirVideo } from './subir-video'

export interface LeccionItem {
  id: string
  titulo: string
  tipo: 'VIDEO' | 'PDF' | 'QUIZ' | 'TEXT'
  duracion: number | null
  esPreview: boolean
  /** true cuando ya hay un archivo escaneado y enlazado (lecciones PDF). */
  tieneArchivo: boolean
  /** true cuando ya hay un video procesado y enlazado (lecciones VIDEO). */
  tieneVideo: boolean
}

/** 754 → "12:34"; 3725 → "1:02:05" — para el badge de duración del video. */
function formatearDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

const ICONO_TIPO = {
  VIDEO: Video,
  PDF: FileText,
  TEXT: AlignLeft,
  QUIZ: FileText,
} as const

interface LeccionesProps {
  cursoId: string
  seccionId: string
  lecciones: LeccionItem[]
  onError: (mensaje: string | null) => void
}

export function LeccionesSeccion({ cursoId, seccionId, lecciones: iniciales, onError }: LeccionesProps) {
  const [lecciones, setLecciones] = useState(iniciales)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoTipo, setNuevoTipo] = useState<TipoLeccion>('VIDEO')
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alTerminarArrastre(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const desde = lecciones.findIndex((l) => l.id === active.id)
    const hasta = lecciones.findIndex((l) => l.id === over.id)
    const nuevoOrden = arrayMove(lecciones, desde, hasta)
    setLecciones(nuevoOrden)
    startTransition(async () => {
      const r = await reordenarLeccionesAction(cursoId, seccionId, nuevoOrden.map((l) => l.id))
      if (r.error) {
        onError(r.error)
        setLecciones(lecciones)
      }
    })
  }

  function agregar(e: React.FormEvent) {
    e.preventDefault()
    const titulo = nuevoTitulo.trim()
    if (!titulo) return
    startTransition(async () => {
      const r = await crearLeccionAction(cursoId, seccionId, titulo, nuevoTipo)
      if (r.error) onError(r.error)
      else {
        onError(null)
        setNuevoTitulo('')
        setLecciones((prev) => [
          ...prev,
          {
            id: r.id ?? `tmp-${Date.now()}`,
            titulo,
            tipo: nuevoTipo,
            duracion: null,
            esPreview: false,
            tieneArchivo: false,
            tieneVideo: false,
          },
        ])
      }
    })
  }

  function renombrar(leccionId: string, titulo: string) {
    setLecciones((prev) => prev.map((l) => (l.id === leccionId ? { ...l, titulo } : l)))
    startTransition(async () => {
      const r = await renombrarLeccionAction(cursoId, leccionId, titulo)
      if (r.error) onError(r.error)
    })
  }

  function eliminar(leccionId: string) {
    const leccion = lecciones.find((l) => l.id === leccionId)
    if (!window.confirm(`¿Eliminar la lección "${leccion?.titulo}"?`)) return
    setLecciones((prev) => prev.filter((l) => l.id !== leccionId))
    startTransition(async () => {
      const r = await eliminarLeccionAction(cursoId, leccionId)
      if (r.error) onError(r.error)
    })
  }

  return (
    <div className="ml-10 space-y-2 border-l-2 border-brand-surface pl-4">
      {lecciones.length === 0 ? (
        <p className="py-1 text-xs text-neutral-900/50">Sin lecciones todavía.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={alTerminarArrastre}>
          <SortableContext items={lecciones.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-1.5">
              {lecciones.map((leccion) => (
                <LeccionFila
                  key={leccion.id}
                  leccion={leccion}
                  onRenombrar={renombrar}
                  onEliminar={eliminar}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <form onSubmit={agregar} className="flex flex-wrap gap-2 pt-1">
        <select
          value={nuevoTipo}
          onChange={(e) => setNuevoTipo(e.target.value as TipoLeccion)}
          aria-label="Tipo de lección"
          className="rounded-lg border border-neutral-100 bg-white px-2.5 py-2 text-xs shadow-card focus:border-brand-secondary focus:outline-none"
        >
          <option value="VIDEO">Video</option>
          <option value="PDF">PDF</option>
          <option value="TEXT">Texto</option>
        </select>
        <input
          type="text"
          value={nuevoTitulo}
          onChange={(e) => setNuevoTitulo(e.target.value)}
          placeholder="Título de la nueva lección"
          className="min-w-0 flex-1 rounded-lg border border-neutral-100 bg-white px-3 py-2 text-xs shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none"
        />
        <button
          type="submit"
          disabled={nuevoTitulo.trim() === ''}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-secondary/10 px-3 py-2 text-xs font-semibold text-brand-secondary transition-colors hover:bg-brand-secondary hover:text-white disabled:opacity-40"
        >
          <Plus size={13} aria-hidden="true" />
          Agregar
        </button>
      </form>
    </div>
  )
}

function LeccionFila({
  leccion,
  onRenombrar,
  onEliminar,
}: {
  leccion: LeccionItem
  onRenombrar: (id: string, titulo: string) => void
  onEliminar: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: leccion.id,
  })
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(leccion.titulo)
  const Icono = ICONO_TIPO[leccion.tipo]

  function guardar() {
    const limpio = titulo.trim()
    if (limpio && limpio !== leccion.titulo) onRenombrar(leccion.id, limpio)
    setEditando(false)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-2 ${
        isDragging ? 'z-10 opacity-80 shadow-md' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-0.5 text-neutral-900/30 hover:text-brand-dark active:cursor-grabbing"
        aria-label={`Reordenar lección ${leccion.titulo}`}
      >
        <GripVertical size={15} />
      </button>

      <Icono size={14} className="shrink-0 text-brand-secondary" aria-label={leccion.tipo} />

      {editando ? (
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardar()
              if (e.key === 'Escape') {
                setTitulo(leccion.titulo)
                setEditando(false)
              }
            }}
            className="min-w-0 flex-1 rounded border border-brand-secondary px-2 py-1 text-xs focus:outline-none"
          />
          <button type="button" onClick={guardar} className="rounded p-1 text-brand-secondary hover:bg-neutral-100" aria-label="Guardar">
            <Check size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              setTitulo(leccion.titulo)
              setEditando(false)
            }}
            className="rounded p-1 text-neutral-900/50 hover:bg-neutral-100"
            aria-label="Cancelar"
          >
            <X size={13} />
          </button>
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-brand-dark">
          {leccion.titulo}
          {leccion.esPreview && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-primary">
              <Eye size={10} aria-hidden="true" /> Preview
            </span>
          )}
        </span>
      )}

      {!editando && (
        <span className="flex shrink-0 items-center">
          {leccion.tipo === 'VIDEO' && (
            <>
              {leccion.tieneVideo && (
                <span
                  className="mr-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-brand-secondary"
                  aria-label="Video cargado"
                >
                  <MonitorPlay size={13} aria-hidden="true" />
                  {leccion.duracion !== null && formatearDuracion(leccion.duracion)}
                </span>
              )}
              <SubirVideo
                leccionId={leccion.id}
                etiqueta={
                  leccion.tieneVideo
                    ? `Reemplazar video de ${leccion.titulo}`
                    : `Subir video a ${leccion.titulo}`
                }
              />
            </>
          )}
          {leccion.tipo === 'PDF' && (
            <>
              {leccion.tieneArchivo && (
                <FileCheck2
                  size={13}
                  className="mr-0.5 text-brand-secondary"
                  aria-label="PDF cargado"
                />
              )}
              <SubirArchivo
                compacto
                proposito="PDF_LECCION"
                objetivoId={leccion.id}
                accept=".pdf"
                etiqueta={leccion.tieneArchivo ? `Reemplazar PDF de ${leccion.titulo}` : `Subir PDF a ${leccion.titulo}`}
              />
            </>
          )}
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded p-1 text-neutral-900/40 hover:text-brand-dark"
            aria-label={`Renombrar ${leccion.titulo}`}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onEliminar(leccion.id)}
            className="rounded p-1 text-neutral-900/40 hover:text-danger"
            aria-label={`Eliminar ${leccion.titulo}`}
          >
            <Trash2 size={13} />
          </button>
        </span>
      )}
    </li>
  )
}
