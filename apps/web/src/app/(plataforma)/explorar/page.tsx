import { apiServer } from '@/lib/api-server'
import { Compass } from 'lucide-react'
import { ExploradorPublico } from '@/components/publico/explorador-publico'

export const metadata = { title: 'Explorar — DBT.Amatla' }

export default async function ExplorarPage() {
  const api = await apiServer()
  const cursos = await api.catalogo.publicos()
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-teal-suave text-teal">
          <Compass size={20} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-display text-texto">Explorar</h1>
          <p className="text-body text-texto-suave">Cursos abiertos de DBT.Amatla. Ábrelos para inscribirte y empezar.</p>
        </div>
      </div>
      <ExploradorPublico cursos={cursos} sesionActiva={true} />
    </div>
  )
}
