'use client'

// Gestor de preguntas de una lección QUIZ (instructor) — Fase 4.6.
// Reordenamiento con dnd-kit, CRUD de preguntas y configuración del passingScore.
// La respuesta correcta SÍ se muestra aquí (es la vista del instructor); el
// estudiante nunca la recibe antes de enviar (eso lo garantiza el backend).

import { useId, useState, useTransition } from 'react'
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
import { Check, GripVertical, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  actualizarPreguntaAction,
  configurarPassingScoreAction,
  crearPreguntaAction,
  eliminarPreguntaAction,
  reordenarPreguntasAction,
  type DatosPregunta,
  type OpcionQuiz,
} from '@/acciones/quiz'

export interface PreguntaItem {
  id: string
  orden: number
  enunciado: string
  opcionA: string
  opcionB: string
  opcionC: string
  opcionD: string
  correcta: OpcionQuiz
  explicacion: string | null
}

const LETRAS: OpcionQuiz[] = ['A', 'B', 'C', 'D']

function vacia(): DatosPregunta {
  return { enunciado: '', opcionA: '', opcionB: '', opcionC: '', opcionD: '', correcta: 'A', explicacion: '' }
}

export function GestorQuiz({
  cursoId,
  leccionId,
  passingScoreInicial,
  preguntasIniciales,
}: {
  cursoId: string
  leccionId: string
  passingScoreInicial: number
  preguntasIniciales: PreguntaItem[]
}) {
  const [preguntas, setPreguntas] = useState(preguntasIniciales)
  const [error, setError] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alTerminarArrastre(evento: DragEndEvent) {
    const { active, over } = evento
    if (!over || active.id === over.id) return
    const desde = preguntas.findIndex((p) => p.id === active.id)
    const hasta = preguntas.findIndex((p) => p.id === over.id)
    const nuevo = arrayMove(preguntas, desde, hasta)
    setPreguntas(nuevo)
    startTransition(async () => {
      const r = await reordenarPreguntasAction(cursoId, leccionId, nuevo.map((p) => p.id))
      if (r.error) {
        setError(r.error)
        setPreguntas(preguntas) // revertir
      }
    })
  }

  function crear(datos: DatosPregunta) {
    startTransition(async () => {
      const r = await crearPreguntaAction(cursoId, leccionId, datos)
      if (r.error) {
        setError(r.error)
        return
      }
      setError(null)
      setPreguntas((prev) => [
        ...prev,
        {
          id: r.id ?? `tmp-${Date.now()}`,
          orden: prev.length + 1,
          enunciado: datos.enunciado,
          opcionA: datos.opcionA,
          opcionB: datos.opcionB,
          opcionC: datos.opcionC,
          opcionD: datos.opcionD,
          correcta: datos.correcta,
          explicacion: datos.explicacion || null,
        },
      ])
      setAgregando(false)
    })
  }

  function actualizar(preguntaId: string, datos: DatosPregunta, onListo: () => void) {
    startTransition(async () => {
      const r = await actualizarPreguntaAction(cursoId, leccionId, preguntaId, datos)
      if (r.error) {
        setError(r.error)
        return
      }
      setError(null)
      setPreguntas((prev) =>
        prev.map((p) =>
          p.id === preguntaId
            ? {
                ...p,
                enunciado: datos.enunciado,
                opcionA: datos.opcionA,
                opcionB: datos.opcionB,
                opcionC: datos.opcionC,
                opcionD: datos.opcionD,
                correcta: datos.correcta,
                explicacion: datos.explicacion || null,
              }
            : p,
        ),
      )
      onListo()
    })
  }

  function eliminar(preguntaId: string) {
    if (!window.confirm('¿Eliminar esta pregunta? No se puede deshacer.')) return
    const previas = preguntas
    setPreguntas((prev) => prev.filter((p) => p.id !== preguntaId))
    startTransition(async () => {
      const r = await eliminarPreguntaAction(cursoId, leccionId, preguntaId)
      if (r.error) {
        setError(r.error)
        setPreguntas(previas) // revertir
      }
    })
  }

  return (
    <div className="space-y-5">
      <ConfigPassingScore cursoId={cursoId} leccionId={leccionId} inicial={passingScoreInicial} />

      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-brand-dark">
          Preguntas{' '}
          <span className="text-sm font-normal text-neutral-900/50">({preguntas.length})</span>
        </h3>
      </div>

      {preguntas.length === 0 ? (
        <p className="rounded-card bg-brand-surface p-6 text-sm text-brand-dark/70">
          Este quiz aún no tiene preguntas. Agrega la primera para que el estudiante pueda
          responderlo.
        </p>
      ) : (
        <DndContext
          id={`dnd-preguntas-${leccionId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={alTerminarArrastre}
        >
          <SortableContext items={preguntas.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-3">
              {preguntas.map((pregunta, indice) => (
                <PreguntaCard
                  key={pregunta.id}
                  numero={indice + 1}
                  pregunta={pregunta}
                  enviando={false}
                  onGuardar={actualizar}
                  onEliminar={eliminar}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {agregando ? (
        <div className="rounded-card border-2 border-dashed border-brand-secondary/40 bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-brand-dark">Nueva pregunta</p>
          <FormularioPregunta
            inicial={vacia()}
            etiquetaEnviar="Agregar pregunta"
            onGuardar={(datos) => crear(datos)}
            onCancelar={() => setAgregando(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setAgregando(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-secondary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} aria-hidden="true" />
          Agregar pregunta
        </button>
      )}
    </div>
  )
}

function ConfigPassingScore({
  cursoId,
  leccionId,
  inicial,
}: {
  cursoId: string
  leccionId: string
  inicial: number
}) {
  const [valor, setValor] = useState(inicial)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const r = await configurarPassingScoreAction(cursoId, leccionId, valor)
      if (r.error) setError(r.error)
      else setGuardado(true)
    })
  }

  return (
    <form
      onSubmit={guardar}
      className="flex flex-wrap items-center gap-3 rounded-card bg-white p-4 shadow-card"
    >
      <label htmlFor="passingScore" className="text-sm font-medium text-brand-dark">
        Puntaje mínimo para aprobar
      </label>
      <div className="flex items-center gap-1">
        <input
          id="passingScore"
          type="number"
          min={1}
          max={100}
          value={valor}
          onChange={(e) => {
            setValor(Number(e.target.value))
            setGuardado(false)
          }}
          className="w-20 rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm shadow-card focus:border-brand-secondary focus:outline-none"
        />
        <span className="text-sm text-neutral-900/60">%</span>
      </div>
      <button
        type="submit"
        disabled={pendiente || valor < 1 || valor > 100}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pendiente ? (
          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
        ) : guardado ? (
          <Check size={13} aria-hidden="true" />
        ) : null}
        {guardado ? 'Guardado' : 'Guardar'}
      </button>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  )
}

function PreguntaCard({
  numero,
  pregunta,
  enviando,
  onGuardar,
  onEliminar,
}: {
  numero: number
  pregunta: PreguntaItem
  enviando: boolean
  onGuardar: (id: string, datos: DatosPregunta, onListo: () => void) => void
  onEliminar: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pregunta.id,
  })
  const [editando, setEditando] = useState(false)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-card bg-white p-4 shadow-card ${isDragging ? 'z-10 opacity-80 shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-neutral-900/40 hover:bg-neutral-100 hover:text-brand-dark active:cursor-grabbing"
          aria-label={`Reordenar pregunta ${numero}`}
        >
          <GripVertical size={18} />
        </button>

        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-surface font-serif text-sm font-semibold text-brand-dark">
          {numero}
        </span>

        <div className="min-w-0 flex-1">
          {editando ? (
            <FormularioPregunta
              inicial={{
                enunciado: pregunta.enunciado,
                opcionA: pregunta.opcionA,
                opcionB: pregunta.opcionB,
                opcionC: pregunta.opcionC,
                opcionD: pregunta.opcionD,
                correcta: pregunta.correcta,
                explicacion: pregunta.explicacion ?? '',
              }}
              etiquetaEnviar="Guardar cambios"
              onGuardar={(datos) => onGuardar(pregunta.id, datos, () => setEditando(false))}
              onCancelar={() => setEditando(false)}
            />
          ) : (
            <>
              <p className="text-sm font-medium text-brand-dark">{pregunta.enunciado}</p>
              <ul className="mt-2 space-y-1">
                {LETRAS.map((letra) => {
                  const texto = pregunta[`opcion${letra}`]
                  const esCorrecta = pregunta.correcta === letra
                  return (
                    <li
                      key={letra}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                        esCorrecta
                          ? 'bg-brand-secondary/10 font-semibold text-brand-secondary'
                          : 'text-neutral-900/70'
                      }`}
                    >
                      <span className="font-semibold">{letra})</span>
                      <span className="min-w-0 flex-1 truncate">{texto}</span>
                      {esCorrecta && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide">
                          <Check size={12} aria-hidden="true" /> Correcta
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
              {pregunta.explicacion && (
                <p className="mt-2 text-xs italic text-neutral-900/50">
                  Explicación: {pregunta.explicacion}
                </p>
              )}
            </>
          )}
        </div>

        {!editando && (
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditando(true)}
              disabled={enviando}
              className="rounded p-1.5 text-neutral-900/50 hover:bg-neutral-100 hover:text-brand-dark"
              aria-label={`Editar pregunta ${numero}`}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => onEliminar(pregunta.id)}
              disabled={enviando}
              className="rounded p-1.5 text-neutral-900/50 hover:bg-danger/10 hover:text-danger"
              aria-label={`Eliminar pregunta ${numero}`}
            >
              <Trash2 size={15} />
            </button>
          </span>
        )}
      </div>
    </li>
  )
}

function FormularioPregunta({
  inicial,
  etiquetaEnviar,
  onGuardar,
  onCancelar,
}: {
  inicial: DatosPregunta
  etiquetaEnviar: string
  onGuardar: (datos: DatosPregunta) => void
  onCancelar: () => void
}) {
  const [valores, setValores] = useState<DatosPregunta>(inicial)
  const grupo = useId() // nombre único del radio group (puede haber varios formularios)

  const completo =
    valores.enunciado.trim().length >= 2 &&
    LETRAS.every((l) => valores[`opcion${l}`].trim() !== '')

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!completo) return
    onGuardar({
      enunciado: valores.enunciado.trim(),
      opcionA: valores.opcionA.trim(),
      opcionB: valores.opcionB.trim(),
      opcionC: valores.opcionC.trim(),
      opcionD: valores.opcionD.trim(),
      correcta: valores.correcta,
      explicacion: valores.explicacion.trim(),
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-brand-dark">Enunciado</label>
        <textarea
          value={valores.enunciado}
          onChange={(e) => setValores((v) => ({ ...v, enunciado: e.target.value }))}
          rows={2}
          placeholder="Escribe la pregunta…"
          className="w-full rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-semibold text-brand-dark">
          Opciones — marca la correcta
        </legend>
        {LETRAS.map((letra) => {
          const campo = `opcion${letra}` as const
          return (
            <div key={letra} className="flex items-center gap-2">
              <input
                type="radio"
                name={grupo}
                checked={valores.correcta === letra}
                onChange={() => setValores((v) => ({ ...v, correcta: letra }))}
                aria-label={`Marcar opción ${letra} como correcta`}
                className="h-4 w-4 accent-brand-secondary"
              />
              <span className="w-5 text-sm font-semibold text-brand-dark">{letra})</span>
              <input
                type="text"
                value={valores[campo]}
                onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                placeholder={`Opción ${letra}`}
                className="min-w-0 flex-1 rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none"
              />
            </div>
          )
        })}
      </fieldset>

      <div>
        <label className="mb-1 block text-xs font-semibold text-brand-dark">
          Explicación <span className="font-normal text-neutral-900/50">(opcional)</span>
        </label>
        <textarea
          value={valores.explicacion}
          onChange={(e) => setValores((v) => ({ ...v, explicacion: e.target.value }))}
          rows={2}
          placeholder="Se muestra al estudiante en el feedback, tras enviar el quiz."
          className="w-full rounded-lg border border-neutral-100 bg-white px-3 py-2 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!completo}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-5 py-2 text-xs font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Check size={13} aria-hidden="true" />
          {etiquetaEnviar}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-neutral-900/60 transition-colors hover:bg-neutral-100"
        >
          <X size={13} aria-hidden="true" />
          Cancelar
        </button>
      </div>
    </form>
  )
}
