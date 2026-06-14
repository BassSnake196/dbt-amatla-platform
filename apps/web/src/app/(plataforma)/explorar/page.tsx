import { apiServer } from '@/lib/api-server'
import { ExploradorPublico } from '@/components/publico/explorador-publico'

export const metadata = { title: 'Explorar — DBT.Amatla' }

export default async function ExplorarPage() {
  const api = await apiServer()
  const cursos = await api.catalogo.publicos()
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="max-w-2xl">
        <p className="text-eyebrow uppercase tracking-wider text-teal">Descubre</p>
        <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-texto md:text-[36px]">
          Aprende habilidades DBT que transforman tu vida
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-texto-suave">
          Cursos abiertos de DBT.Amatla. Ábrelos para inscribirte y empezar cuando quieras.
        </p>
      </header>
      <ExploradorPublico cursos={cursos} sesionActiva={true} />
    </div>
  )
}
