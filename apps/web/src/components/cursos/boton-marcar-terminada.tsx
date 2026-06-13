'use client'

// Botón para que el estudiante marque una lección como terminada y pueda
// avanzar (progreso secuencial: completar desbloquea la siguiente). Se usa en
// lecciones TEXT, VIDEO y PDF; el QUIZ se completa aprobándolo. Al completar,
// refresca para actualizar el índice y la frontera de navegación.

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { completarLeccionAction } from '@/acciones/estudiante'

export function BotonMarcarTerminada({
  leccionId,
  completada,
  etiqueta = 'Marcar como terminada',
}: {
  leccionId: string
  completada: boolean
  /** Texto del botón — p. ej. "Finalizar lección" en video/PDF. */
  etiqueta?: string
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
      const r = await completarLeccionAction(leccionId)
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
      {etiqueta}
    </button>
  )
}
