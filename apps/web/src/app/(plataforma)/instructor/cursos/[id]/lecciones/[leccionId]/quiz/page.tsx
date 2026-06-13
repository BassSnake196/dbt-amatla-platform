import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { exigirInstructor } from '@/lib/guardia'
import { apiServer } from '@/lib/api-server'
import { GestorQuiz } from '@/components/instructor/gestor-quiz'

export const metadata = { title: 'Editar quiz — DBT.Amatla' }

// Gestor de preguntas de una lección QUIZ. preview valida ownership (404 si no
// es del instructor); aquí además exigimos que la lección sea de tipo QUIZ.
// quiz.preguntas devuelve las preguntas CON la respuesta correcta (es la vista
// del instructor) — el estudiante nunca la recibe antes de enviar su intento.
export default async function EditarQuizPage({
  params,
}: {
  params: Promise<{ id: string; leccionId: string }>
}) {
  await exigirInstructor()
  const { id, leccionId } = await params

  const api = await apiServer()
  const leccion = await api.lecciones.preview({ id: leccionId }).catch(() => null)
  if (!leccion || leccion.tipo !== 'QUIZ') notFound()

  const { passingScore, preguntas } = await api.quiz.preguntas({ leccionId })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/instructor/cursos/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary transition-colors hover:text-brand-dark"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Estructura del curso
        </Link>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-brand-dark md:text-3xl">
          {leccion.titulo}
        </h2>
        <p className="mt-1 text-sm text-neutral-900/60">
          Crea las preguntas de opción múltiple y define el puntaje mínimo para aprobar. El
          estudiante debe aprobar para completar la lección.
        </p>
      </div>

      <GestorQuiz
        cursoId={id}
        leccionId={leccion.id}
        passingScoreInicial={passingScore}
        preguntasIniciales={preguntas.map((p) => ({
          id: p.id,
          orden: p.orden,
          enunciado: p.enunciado,
          opcionA: p.opcionA,
          opcionB: p.opcionB,
          opcionC: p.opcionC,
          opcionD: p.opcionD,
          correcta: p.correcta,
          explicacion: p.explicacion,
        }))}
      />
    </div>
  )
}
