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
      <CursoForm action={crearCursoAction} textoBoton="Crear curso" />
    </div>
  )
}
