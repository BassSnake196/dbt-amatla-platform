'use client'

// Publicar / archivar curso desde la página de estructura. La validación
// real (≥1 lección con contenido listo) vive en el backend — aquí solo se
// muestra el error que devuelva.

import { useState, useTransition } from 'react'
import { Archive, Loader2, Megaphone } from 'lucide-react'
import { archivarCursoAction, publicarCursoAction } from '@/acciones/cursos'

interface AccionesCursoProps {
  cursoId: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

export function AccionesCurso({ cursoId, status }: AccionesCursoProps) {
  const [error, setError] = useState<string | null>(null)
  const [ocupado, startTransition] = useTransition()

  function publicar() {
    setError(null)
    startTransition(async () => {
      const r = await publicarCursoAction(cursoId)
      if (r.error) setError(r.error)
    })
  }

  function archivar() {
    if (
      !window.confirm(
        '¿Archivar este curso? Dejará de estar visible para los estudiantes hasta que vuelvas a publicarlo.',
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const r = await archivarCursoAction(cursoId)
      if (r.error) setError(r.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {status !== 'PUBLISHED' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={publicar}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {ocupado ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Megaphone size={13} aria-hidden="true" />
            )}
            Publicar curso
          </button>
        )}
        {status === 'PUBLISHED' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={archivar}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-100 px-4 py-2 text-xs font-semibold text-brand-dark transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
          >
            {ocupado ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Archive size={13} aria-hidden="true" />
            )}
            Archivar curso
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
