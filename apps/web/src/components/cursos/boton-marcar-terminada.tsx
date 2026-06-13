'use client'

// Botón para que el estudiante marque una lección TEXT como terminada.
// Necesario para el progreso secuencial: completar la lección desbloquea la
// siguiente. Al completar, refresca para actualizar el índice y la frontera.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { marcarTextoVistoAction } from '@/acciones/estudiante'

export function BotonMarcarTerminada({
  leccionId,
  completada,
}: {
  leccionId: string
  completada: boolean
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()

  if (completada) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-secondary">
        <CheckCircle2 size={16} aria-hidden="true" /> Lección completada
      </p>
    )
  }

  function marcar() {
    startTransition(async () => {
      const r = await marcarTextoVistoAction(leccionId)
      if (!r.error) router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={marcar}
      disabled={pendiente}
      className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pendiente ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <CheckCircle2 size={16} aria-hidden="true" />
      )}
      Marcar como terminada
    </button>
  )
}
