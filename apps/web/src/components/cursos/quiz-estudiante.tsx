'use client'

// Quiz del estudiante (Fase 4.7) — formulario de respuestas y feedback tras
// el envío. El score, passed y las respuestas correctas SIEMPRE vienen del
// servidor (regla #13): este componente nunca recibe correctOption antes de
// enviar el intento.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import {
  enviarIntentoAction,
  type FeedbackIntento,
  type OpcionRespuesta,
} from '@/acciones/quiz-estudiante'

const LETRAS: OpcionRespuesta[] = ['A', 'B', 'C', 'D']

export interface PreguntaEstudianteItem {
  id: string
  orden: number
  enunciado: string
  opcionA: string
  opcionB: string
  opcionC: string
  opcionD: string
}

interface QuizEstudianteProps {
  leccionId: string
  passingScore: number
  preguntas: PreguntaEstudianteItem[]
  intentoInicial: FeedbackIntento | null
}

export function QuizEstudiante({
  leccionId,
  passingScore,
  preguntas,
  intentoInicial,
}: QuizEstudianteProps) {
  const router = useRouter()
  const [respuestas, setRespuestas] = useState<Record<string, OpcionRespuesta>>({})
  const [feedback, setFeedback] = useState<FeedbackIntento | null>(intentoInicial)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  const totalRespondidas = Object.keys(respuestas).length
  const todasRespondidas = totalRespondidas === preguntas.length

  function enviar() {
    setError(null)
    startTransition(async () => {
      const r = await enviarIntentoAction(
        leccionId,
        Object.entries(respuestas).map(([preguntaId, opcion]) => ({ preguntaId, opcion })),
      )
      if (r.error) {
        setError(r.error)
        return
      }
      if (r.feedback) {
        setFeedback(r.feedback)
        // Si aprobó, refresca para que el índice marque la ✓ y desbloquee la siguiente lección
        if (r.feedback.passed) router.refresh()
      }
    })
  }

  function intentarDeNuevo() {
    setRespuestas({})
    setFeedback(null)
    setError(null)
  }

  if (feedback) {
    return (
      <VistaResultado
        feedback={feedback}
        passingScore={passingScore}
        preguntas={preguntas}
        onIntentarDeNuevo={intentarDeNuevo}
      />
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ol className="space-y-3">
        {preguntas
          .slice()
          .sort((a, b) => a.orden - b.orden)
          .map((pregunta, indice) => (
            <li key={pregunta.id} className="rounded-card bg-white p-4 shadow-card">
              <p className="text-sm font-medium text-brand-dark">
                {indice + 1}. {pregunta.enunciado}
              </p>
              <fieldset className="mt-3 space-y-1.5">
                <legend className="sr-only">Opciones de la pregunta {indice + 1}</legend>
                {LETRAS.map((letra) => {
                  const texto = pregunta[`opcion${letra}`]
                  const seleccionada = respuestas[pregunta.id] === letra
                  return (
                    <label
                      key={letra}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        seleccionada
                          ? 'border-brand-secondary bg-brand-secondary/10'
                          : 'border-neutral-100 hover:bg-neutral-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={pregunta.id}
                        checked={seleccionada}
                        onChange={() =>
                          setRespuestas((prev) => ({ ...prev, [pregunta.id]: letra }))
                        }
                        aria-label={`Pregunta ${indice + 1}, opción ${letra}: ${texto}`}
                        className="h-4 w-4 accent-brand-secondary"
                      />
                      <span className="font-semibold text-brand-dark">{letra})</span>
                      <span className="min-w-0 flex-1">{texto}</span>
                    </label>
                  )
                })}
              </fieldset>
            </li>
          ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-brand-surface p-4 shadow-card">
        <p className="text-sm text-brand-dark/70">
          {totalRespondidas} de {preguntas.length} respondidas
        </p>
        <button
          type="button"
          onClick={enviar}
          disabled={!todasRespondidas || pendiente}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pendiente && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Enviar respuestas
        </button>
      </div>
    </div>
  )
}

function VistaResultado({
  feedback,
  passingScore,
  preguntas,
  onIntentarDeNuevo,
}: {
  feedback: FeedbackIntento
  passingScore: number
  preguntas: PreguntaEstudianteItem[]
  onIntentarDeNuevo: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-card bg-white p-6 text-center shadow-card">
        <p className="font-serif text-4xl font-semibold text-brand-dark">{feedback.score}%</p>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {feedback.passed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-secondary/10 px-3 py-1 text-sm font-semibold text-brand-secondary">
              <CheckCircle2 size={15} aria-hidden="true" /> Aprobado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-sm font-semibold text-danger">
              <XCircle size={15} aria-hidden="true" /> Reprobado
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-neutral-900/60">
          Necesitas {passingScore}% para aprobar
        </p>
      </div>

      <ol className="space-y-3">
        {preguntas
          .slice()
          .sort((a, b) => a.orden - b.orden)
          .map((pregunta, indice) => {
            const resultado = feedback.resultados.find((r) => r.preguntaId === pregunta.id)
            return (
              <li key={pregunta.id} className="rounded-card bg-white p-4 shadow-card">
                <p className="text-sm font-medium text-brand-dark">
                  {indice + 1}. {pregunta.enunciado}
                </p>
                <ul className="mt-2 space-y-1">
                  {LETRAS.map((letra) => {
                    const texto = pregunta[`opcion${letra}`]
                    const esCorrecta = resultado?.correcta === letra
                    const esElegidaIncorrecta =
                      resultado?.elegida === letra && !resultado.acerto

                    let clase = 'text-neutral-900/70'
                    if (esCorrecta) {
                      clase = 'bg-brand-secondary/10 font-semibold text-brand-secondary'
                    } else if (esElegidaIncorrecta) {
                      clase = 'bg-danger/10 font-semibold text-danger'
                    }

                    return (
                      <li
                        key={letra}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${clase}`}
                      >
                        <span className="font-semibold">{letra})</span>
                        <span className="min-w-0 flex-1">{texto}</span>
                        {esCorrecta && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide">
                            <CheckCircle2 size={12} aria-hidden="true" /> Correcta
                          </span>
                        )}
                        {esElegidaIncorrecta && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide">
                            <XCircle size={12} aria-hidden="true" /> Tu respuesta
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {resultado?.explicacion && (
                  <p className="mt-2 text-xs italic text-neutral-900/50">
                    Explicación: {resultado.explicacion}
                  </p>
                )}
              </li>
            )
          })}
      </ol>

      {feedback.passed ? (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-secondary">
          <CheckCircle2 size={16} aria-hidden="true" /> Lección completada
        </p>
      ) : (
        <button
          type="button"
          onClick={onIntentarDeNuevo}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  )
}
