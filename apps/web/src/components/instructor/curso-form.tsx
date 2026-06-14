'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle, Globe, Lock } from 'lucide-react'
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
  valoresIniciales?: { titulo: string; descripcion: string; categoria: string; esPublico?: boolean }
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
  const [esPublico, setEsPublico] = useState(valoresIniciales?.esPublico ?? false)

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

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-brand-dark">Visibilidad</legend>
        <input type="hidden" name="esPublico" value={esPublico ? 'true' : 'false'} />
        <div className="grid max-w-md grid-cols-2 gap-3">
          <OpcionVisibilidad
            seleccionada={!esPublico}
            onClick={() => setEsPublico(false)}
            icono={<Lock size={16} aria-hidden="true" />}
            titulo="Privado"
            descripcion="Solo estudiantes asignados"
          />
          <OpcionVisibilidad
            seleccionada={esPublico}
            onClick={() => setEsPublico(true)}
            icono={<Globe size={16} aria-hidden="true" />}
            titulo="Público"
            descripcion="Aparece en el catálogo"
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <BotonEnviar texto={textoBoton} />
        <a href="/instructor" className="text-sm font-medium text-neutral-900/60 hover:text-brand-dark">
          Cancelar
        </a>
      </div>
    </form>
  )
}

function OpcionVisibilidad({
  seleccionada,
  onClick,
  icono,
  titulo,
  descripcion,
}: {
  seleccionada: boolean
  onClick: () => void
  icono: React.ReactNode
  titulo: string
  descripcion: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionada}
      className={`flex items-start gap-2.5 rounded-lg border-[1.5px] px-4 py-3 text-left transition-colors ${
        seleccionada
          ? 'border-brand-primary bg-naranja-suave text-[#b07d10]'
          : 'border-borde bg-white text-texto-suave hover:bg-crema-hover'
      }`}
    >
      <span className="mt-0.5 shrink-0">{icono}</span>
      <span>
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs opacity-80">{descripcion}</span>
      </span>
    </button>
  )
}
