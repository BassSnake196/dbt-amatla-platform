import { Compass } from 'lucide-react'
import { CatalogoPublico } from '@/components/publico/catalogo-publico'

interface CursoPublico {
  id: string
  titulo: string
  categoria: string
  instructora: string
  thumbnailUrl: string | null
  lecciones: number
  duracionSegundos: number
}

// Sección "Descubrir" inline en la home: cursos públicos en los que el
// estudiante aún no está inscrito. Si no hay ninguno, no se renderiza nada
// (evita una sección vacía cuando ya está inscrito en todo el catálogo).
export function Descubrir({ cursos }: { cursos: CursoPublico[] }) {
  if (cursos.length === 0) return null

  return (
    <section aria-labelledby="descubrir-titulo">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-teal-suave text-teal">
          <Compass size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 id="descubrir-titulo" className="text-heading text-texto">
            Descubrir
          </h2>
          <p className="text-body text-texto-suave">
            Cursos abiertos para explorar y empezar cuando quieras.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CatalogoPublico cursos={cursos} sesionActiva={true} />
      </div>
    </section>
  )
}
