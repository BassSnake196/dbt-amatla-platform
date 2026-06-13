import { notFound } from 'next/navigation'
import { CheckCircle2, FileText, MonitorPlay, NotebookText } from 'lucide-react'
import { apiServer } from '@/lib/api-server'
import { formatearDuracion } from '@/lib/formato'
import { ReproductorVideo } from '@/components/cursos/reproductor-video'
import { VisorPdfCliente } from '@/components/cursos/visor-pdf-cliente'
import { BotonMarcarTerminada } from '@/components/cursos/boton-marcar-terminada'
import { QuizEstudiante } from '@/components/cursos/quiz-estudiante'

export const metadata = { title: 'Lección — DBT.Amatla' }

// Página de lección del estudiante. El acceso lo valida estudiante.leccion
// (Enrollment + sección accesible o preview): lección bloqueada → 404 sin
// revelar nada. Para VIDEO la URL firmada se genera on-demand (TTL 30 min,
// regla #10) y el reproductor la renueva solo.
export default async function LeccionPage({
  params,
}: {
  params: Promise<{ id: string; leccionId: string }>
}) {
  const { id, leccionId } = await params

  const api = await apiServer()
  const leccion = await api.estudiante.leccion({ id: leccionId }).catch(() => null)
  // 404 también si la lección existe pero pertenece a otro curso (URL cruzada)
  if (!leccion || leccion.curso.id !== id) notFound()

  // URLs firmadas solo cuando el worker ya procesó/enlazó el contenido
  const video =
    leccion.tipo === 'VIDEO' && leccion.tieneVideo
      ? await api.estudiante.videoLeccion({ id: leccionId }).catch(() => null)
      : null
  const pdf =
    leccion.tipo === 'PDF' && leccion.tieneArchivo
      ? await api.estudiante.pdfLeccion({ id: leccionId }).catch(() => null)
      : null

  // Notas personales (texto cifrado en BD) — solo tiene sentido en video
  const notasCrudas =
    leccion.tipo === 'VIDEO' && video
      ? await api.estudiante.notasLeccion({ leccionId }).catch(() => [])
      : []
  const notas = notasCrudas.map((n) => ({
    id: n.id,
    posicionSegundos: n.posicionSegundos,
    texto: n.texto,
    actualizadaEl: n.actualizadaEl.toISOString(),
  }))

  // Datos del quiz: preguntas (sin la respuesta correcta, regla #13) y el
  // último intento del estudiante (si existe) para mostrar el feedback al reabrir
  const quiz =
    leccion.tipo === 'QUIZ'
      ? await api.quiz.preguntasEstudiante({ leccionId }).catch(() => null)
      : null
  const miIntentoQuiz =
    leccion.tipo === 'QUIZ'
      ? await api.quiz.miIntento({ leccionId }).catch(() => null)
      : null
  // Serializa el intento para el client component (descarta la fecha Date)
  const intentoQuiz = miIntentoQuiz
    ? {
        score: miIntentoQuiz.score,
        passed: miIntentoQuiz.passed,
        passingScore: miIntentoQuiz.passingScore,
        resultados: miIntentoQuiz.resultados,
      }
    : null

  return (
    <article className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-secondary">
          {leccion.seccionTitulo}
        </p>
        <h3 className="mt-1 font-serif text-xl font-semibold text-brand-dark md:text-2xl">
          {leccion.titulo}
        </h3>
        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-900/55">
          {leccion.duracion !== null && leccion.duracion > 0 && (
            <span>{formatearDuracion(leccion.duracion)}</span>
          )}
          {leccion.estado === 'COMPLETADA' && (
            <span className="inline-flex items-center gap-1 font-semibold text-brand-secondary">
              <CheckCircle2 size={13} aria-hidden="true" /> Completada
            </span>
          )}
        </div>
      </header>

      {leccion.tipo === 'VIDEO' && video && (
        <>
          <ReproductorVideo
            leccionId={leccion.id}
            titulo={leccion.titulo}
            urlInicial={video.url}
            tipo={video.tipo}
            expiraEpochInicial={video.expiraEn.getTime()}
            posicionInicial={leccion.estado === 'COMPLETADA' ? 0 : leccion.ultimaPosicion}
            maxVisto={leccion.maxVisto}
            notasIniciales={notas}
          />
          {/* El video también se completa solo al 80%; este botón deja avanzar
              manualmente cuando el estudiante termina o decide finalizar. */}
          <BotonMarcarTerminada
            leccionId={leccion.id}
            completada={leccion.estado === 'COMPLETADA'}
            etiqueta="Finalizar lección"
          />
        </>
      )}

      {leccion.tipo === 'VIDEO' && !video && (
        <div className="flex aspect-video w-full items-center justify-center rounded-card bg-black text-center">
          <div className="px-6 text-white/70">
            <MonitorPlay size={32} className="mx-auto" aria-hidden="true" />
            <p className="mt-3 text-sm">
              El video de esta lección está en preparación. Vuelve a intentarlo en un rato.
            </p>
          </div>
        </div>
      )}

      {leccion.tipo === 'PDF' && pdf && (
        <VisorPdfCliente
          leccionId={leccion.id}
          url={pdf.url}
          permitirDescarga={pdf.permitirDescarga}
          completada={leccion.estado === 'COMPLETADA'}
        />
      )}

      {leccion.tipo === 'PDF' && !pdf && (
        <div className="flex min-h-64 items-center justify-center rounded-card bg-white p-10 text-center shadow-card">
          <div className="text-neutral-900/60">
            <FileText size={32} className="mx-auto text-brand-secondary" aria-hidden="true" />
            <p className="mt-3 text-sm">
              El material de esta lección está en preparación. Vuelve a intentarlo en un rato.
            </p>
          </div>
        </div>
      )}

      {leccion.tipo === 'TEXT' && (
        <div className="space-y-5">
          {leccion.contenido ? (
            // HTML ya sanitizado server-side al guardar (regla #13)
            <div
              className="contenido-rico rounded-card bg-white p-6 shadow-card md:p-8"
              dangerouslySetInnerHTML={{ __html: leccion.contenido }}
            />
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-card bg-brand-surface p-10 text-center shadow-card">
              <div className="text-neutral-900/60">
                <NotebookText size={32} className="mx-auto text-brand-secondary" aria-hidden="true" />
                <p className="mt-3 text-sm">El contenido de esta lección estará disponible muy pronto.</p>
              </div>
            </div>
          )}
          {/* Progreso secuencial: marcar la lección TEXT como terminada desbloquea la siguiente */}
          <BotonMarcarTerminada
            leccionId={leccion.id}
            completada={leccion.estado === 'COMPLETADA'}
          />
        </div>
      )}

      {leccion.tipo === 'QUIZ' && quiz && (
        <QuizEstudiante
          leccionId={leccion.id}
          passingScore={quiz.passingScore}
          preguntas={quiz.preguntas}
          intentoInicial={intentoQuiz}
        />
      )}

      {leccion.tipo === 'QUIZ' && !quiz && (
        <div className="flex min-h-64 items-center justify-center rounded-card bg-brand-surface p-10 text-center shadow-card">
          <p className="text-sm text-neutral-900/60">Este examen aún no está disponible.</p>
        </div>
      )}
    </article>
  )
}
