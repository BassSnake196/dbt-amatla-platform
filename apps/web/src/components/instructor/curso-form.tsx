'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle } from 'lucide-react'
import type { EstadoFormCurso } from '@/acciones/cursos'

// Categorías sugeridas — el campo acepta texto libre (datalist)
const CATEGORIAS_SUGERIDAS = [
  'Regulación emocional',
  'RO-DBT',
  'Mindfulness',
  'Habilidades TIP',
  'Tolerancia al malestar',
]

interface CursoFormProps {
  action: (estado: EstadoFormCurso, formData: FormData) => Promise<EstadoFormCurso>
  textoBoton: string
  valoresIniciales?: { titulo: string; descripcion: string; categoria: string }
}

function BotonEnviar({ texto }: { texto: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Guardando…' : texto}
    </button>
  )
}

export function CursoForm({ action, textoBoton, valoresIniciales }: CursoFormProps) {
  const [estado, formAction] = useActionState(action, { error: null })

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {estado.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-brand-dark"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
          {estado.error}
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-brand-dark">Título</span>
        <input
          type="text"
          name="titulo"
          required
          defaultValue={valoresIniciales?.titulo}
          placeholder="Ej. Habilidades DBT: Regulación Emocional"
          className="w-full rounded-lg border border-neutral-100 bg-white px-4 py-3 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-brand-dark">Categoría</span>
        <input
          type="text"
          name="categoria"
          required
          list="categorias-sugeridas"
          defaultValue={valoresIniciales?.categoria}
          placeholder="Elige o escribe una categoría"
          className="w-full rounded-lg border border-neutral-100 bg-white px-4 py-3 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        />
        <datalist id="categorias-sugeridas">
          {CATEGORIAS_SUGERIDAS.map((categoria) => (
            <option key={categoria} value={categoria} />
          ))}
        </datalist>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-brand-dark">Descripción</span>
        <textarea
          name="descripcion"
          required
          rows={5}
          defaultValue={valoresIniciales?.descripcion}
          placeholder="¿Qué aprenderán tus estudiantes? ¿A quién va dirigido?"
          className="w-full rounded-lg border border-neutral-100 bg-white px-4 py-3 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        />
      </label>

      <div className="flex items-center gap-4">
        <BotonEnviar texto={textoBoton} />
        <a href="/instructor" className="text-sm font-medium text-neutral-900/60 hover:text-brand-dark">
          Cancelar
        </a>
      </div>
    </form>
  )
}
