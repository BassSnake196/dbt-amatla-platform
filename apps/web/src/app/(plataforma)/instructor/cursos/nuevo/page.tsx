import { ImageIcon } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { crearCursoAction } from '@/acciones/cursos'
import { CursoForm } from '@/components/instructor/curso-form'

export const metadata = { title: 'Nuevo curso — DBT.Amatla' }

export default async function NuevoCursoPage() {
  await exigirInstructor()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          Nuevo curso
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">
          Se guardará como borrador — podrás agregar secciones y lecciones antes de publicarlo.
        </p>
      </div>

      {/* La portada se sube tras crear el curso (el pipeline de imagen necesita
          el id ya existente). Mientras tanto se usa una portada generada. */}
      <div className="flex max-w-2xl items-start gap-3 rounded-card border border-borde bg-brand-surface/40 p-4 text-sm text-brand-dark/70">
        <ImageIcon size={18} className="mt-0.5 shrink-0 text-brand-secondary" aria-hidden="true" />
        <p>
          <span className="font-medium text-brand-dark">Imagen del curso:</span> al crear el curso
          podrás subir su portada desde la edición. Si no subes ninguna, se mostrará una portada
          con las iniciales del título.
        </p>
      </div>

      <CursoForm action={crearCursoAction} textoBoton="Crear curso" />
    </div>
  )
}
