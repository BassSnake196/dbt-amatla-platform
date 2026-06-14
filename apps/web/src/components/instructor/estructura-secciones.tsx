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
import { Check, ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  crearSeccionAction,
  eliminarSeccionAction,
  renombrarSeccionAction,
  reordenarSeccionesAction,
} from '@/acciones/secciones'
import { LeccionesSeccion, type LeccionItem } from './lecciones-seccion'

export interface SeccionItem {
  id: string
  titulo: string
  descripcion: string | null
  lecciones: LeccionItem[]
}

interface EstructuraProps {
  cursoId: string
  secciones: SeccionItem[]
}

export function EstructuraSecciones({ cursoId, secciones: iniciales }: EstructuraProps) {
  // Estado local optimista — el servidor revalida después
  const [secciones, setSecciones] = useState(iniciales)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alTerminarArrastre(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const desde = secciones.findIndex((s) => s.id === active.id)
    const hasta = secciones.findIndex((s) => s.id === over.id)
    const nuevoOrden = arrayMove(secciones, desde, hasta)
    setSecciones(nuevoOrden) // optimista
    startTransition(async () => {
      const r = await reordenarSeccionesAction(cursoId, nuevoOrden.map((s) => s.id))
      if (r.error) {
        setError(r.error)
        setSecciones(secciones) // revertir
      }
    })
  }

  function agregarSeccion(e: React.FormEvent) {
    e.preventDefault()
    const titulo = nuevoTitulo.trim()
    if (!titulo) return
    startTransition(async () => {
      const r = await crearSeccionAction(cursoId, titulo)
      if (r.error) setError(r.error)
      else {
        setError(null)
        setNuevoTitulo('')
        // id REAL de BD (no temporal): permite crear lecciones en la sección
        // recién agregada sin recargar. Fallback a tmp por si la acción no lo trae.
        setSecciones((previas) => [
          ...previas,
          { id: r.id ?? `tmp-${Date.now()}`, titulo, descripcion: null, lecciones: [] },
        ])
      }
    })
  }

  function renombrar(seccionId: string, titulo: string) {
    setSecciones((prev) => prev.map((s) => (s.id === seccionId ? { ...s, titulo } : s)))
    startTransition(async () => {
      const r = await renombrarSeccionAction(cursoId, seccionId, titulo)
      if (r.error) setError(r.error)
    })
  }

  function eliminar(seccionId: string) {
    const seccion = secciones.find((s) => s.id === seccionId)
    const confirmado = window.confirm(
      `¿Eliminar la sección "${seccion?.titulo}"? Sus ${seccion?.lecciones.length ?? 0} lecciones también se eliminarán.`,
    )
    if (!confirmado) return
    setSecciones((prev) => prev.filter((s) => s.id !== seccionId))
    startTransition(async () => {
      const r = await eliminarSeccionAction(cursoId, seccionId)
      if (r.error) setError(r.error)
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {secciones.length === 0 ? (
        <p className="rounded-card bg-brand-surface p-6 text-sm text-brand-dark/70">
          Aún no hay secciones. Agrega la primera para empezar a estructurar el curso.
        </p>
      ) : (
        // id determinista: sin él, dnd-kit numera con un contador global y
        // el aria-describedby del SSR no coincide con el del cliente
        <DndContext
          id={`dnd-secciones-${cursoId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={alTerminarArrastre}
        >
          <SortableContext items={secciones.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {secciones.map((seccion, indice) => (
                <SeccionFila
                  key={seccion.id}
                  cursoId={cursoId}
                  seccion={seccion}
                  numero={indice + 1}
                  onRenombrar={renombrar}
                  onEliminar={eliminar}
                  onError={setError}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <form onSubmit={agregarSeccion} className="flex gap-2">
        <input
          type="text"
          value={nuevoTitulo}
          onChange={(e) => setNuevoTitulo(e.target.value)}
          placeholder="Título de la nueva sección"
          className="flex-1 rounded-lg border border-neutral-100 bg-white px-4 py-2.5 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        />
        <button
          type="submit"
          disabled={pendiente || nuevoTitulo.trim() === ''}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-secondary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Plus size={15} aria-hidden="true" />
          Agregar sección
        </button>
      </form>
    </div>
  )
}

function SeccionFila({
  cursoId,
  seccion,
  numero,
  onRenombrar,
  onEliminar,
  onError,
}: {
  cursoId: string
  seccion: SeccionItem
  numero: number
  onRenombrar: (id: string, titulo: string) => void
  onEliminar: (id: string) => void
  onError: (mensaje: string | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: seccion.id,
  })
  const [editando, setEditando] = useState(false)
  const [expandida, setExpandida] = useState(false)
  const [titulo, setTitulo] = useState(seccion.titulo)

  function guardar() {
    const limpio = titulo.trim()
    if (limpio && limpio !== seccion.titulo) onRenombrar(seccion.id, limpio)
    setEditando(false)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-card bg-white p-4 shadow-card ${
        isDragging ? 'z-10 opacity-80 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center gap-3">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-neutral-900/40 hover:bg-neutral-100 hover:text-brand-dark active:cursor-grabbing"
        aria-label={`Reordenar sección ${seccion.titulo}`}
      >
        <GripVertical size={18} />
      </button>

      <button
        type="button"
        onClick={() => setExpandida((v) => !v)}
        className="rounded p-0.5 text-neutral-900/50 hover:text-brand-dark"
        aria-expanded={expandida}
        aria-label={expandida ? `Contraer ${seccion.titulo}` : `Expandir ${seccion.titulo}`}
      >
        {expandida ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-surface font-serif text-sm font-semibold text-brand-dark">
        {numero}
      </span>

      {editando ? (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardar()
              if (e.key === 'Escape') {
                setTitulo(seccion.titulo)
                setEditando(false)
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-brand-secondary px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
          />
          <button type="button" onClick={guardar} className="rounded p-1.5 text-brand-secondary hover:bg-neutral-100" aria-label="Guardar título">
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setTitulo(seccion.titulo)
              setEditando(false)
            }}
            className="rounded p-1.5 text-neutral-900/50 hover:bg-neutral-100"
            aria-label="Cancelar edición"
          >
            <X size={16} />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setExpandida((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-sm font-semibold text-brand-dark">{seccion.titulo}</span>
          <span className="text-xs text-neutral-900/50">
            {seccion.lecciones.length} {seccion.lecciones.length === 1 ? 'lección' : 'lecciones'}
          </span>
        </button>
      )}

      {!editando && (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded p-1.5 text-neutral-900/50 hover:bg-neutral-100 hover:text-brand-dark"
            aria-label={`Renombrar ${seccion.titulo}`}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => onEliminar(seccion.id)}
            className="rounded p-1.5 text-neutral-900/50 hover:bg-danger/10 hover:text-danger"
            aria-label={`Eliminar ${seccion.titulo}`}
          >
            <Trash2 size={15} />
          </button>
        </span>
      )}
      </div>

      {expandida && (
        <div className="mt-3">
          <LeccionesSeccion
            cursoId={cursoId}
            seccionId={seccion.id}
            lecciones={seccion.lecciones}
            onError={onError}
          />
        </div>
      )}
    </li>
  )
}
