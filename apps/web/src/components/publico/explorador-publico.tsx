'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { CatalogoPublico, type CursoPublico } from '@/components/publico/catalogo-publico'

// Explorador público: barra de búsqueda + pills de categoría client-side
// sobre el catálogo público (mismo patrón que el catálogo privado).
export function ExploradorPublico({
  cursos,
  sesionActiva,
}: {
  cursos: CursoPublico[]
  sesionActiva: boolean
}) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<string>('Todos')

  const categorias = useMemo(
    () => [...new Set(cursos.map((curso) => curso.categoria))].sort((a, b) => a.localeCompare(b, 'es')),
    [cursos],
  )

  const cursosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return cursos.filter((curso) => {
      const coincideCategoria = categoria === 'Todos' || curso.categoria === categoria
      const coincideTexto =
        texto === '' ||
        curso.titulo.toLowerCase().includes(texto) ||
        curso.categoria.toLowerCase().includes(texto) ||
        curso.instructora.toLowerCase().includes(texto)
      return coincideCategoria && coincideTexto
    })
  }, [cursos, busqueda, categoria])

  if (cursos.length === 0) {
    return (
      <div className="rounded-card border border-borde bg-white p-10 text-center">
        <p className="text-body text-texto-suave">Aún no hay cursos públicos disponibles.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-72">
          <span className="sr-only">Buscar curso, categoría o instructora</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-suave"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar curso, categoría o instructora"
            className="w-full rounded-full border border-borde bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-texto-suave focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </label>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          {['Todos', ...categorias].map((cat) => {
            const activa = categoria === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                aria-pressed={activa}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                  activa
                    ? 'bg-teal text-white'
                    : 'border border-borde bg-white text-texto hover:bg-crema-hover'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {cursosFiltrados.length === 0 ? (
        <div className="rounded-card border border-borde bg-white p-10 text-center">
          <p className="text-body text-texto-suave">Ningún curso coincide con tu búsqueda.</p>
        </div>
      ) : (
        <CatalogoPublico cursos={cursosFiltrados} sesionActiva={sesionActiva} destacado />
      )}
    </div>
  )
}
