'use client'

import { useMemo, useState } from 'react'
import { GraduationCap, Search } from 'lucide-react'
import type { CursoAsignado } from '@/lib/tipos-estudiante'
import { CursoCard } from './curso-card'

// Catálogo de cursos asignados (via Enrollment — datos reales de tRPC).
// Búsqueda y filtros client-side: a esta escala (<10 cursos por estudiante)
// no amerita filtrado en servidor.
export function Catalogo({ cursos }: { cursos: CursoAsignado[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<string>('Todos')

  // Pills derivadas de los cursos reales — la categoría es texto libre del instructor
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
        curso.instructora.toLowerCase().includes(texto)
      return coincideCategoria && coincideTexto
    })
  }, [cursos, busqueda, categoria])

  // Sin cursos asignados: bienvenida cálida, sin búsqueda ni filtros vacíos
  if (cursos.length === 0) {
    return (
      <section aria-labelledby="catalogo-titulo">
        <div className="mb-5 flex items-center gap-2">
          <GraduationCap className="text-brand-secondary" size={22} aria-hidden="true" />
          <h3 id="catalogo-titulo" className="font-serif text-xl font-semibold text-brand-dark">
            Asignados por tu terapeuta
          </h3>
        </div>
        <div className="rounded-card bg-brand-surface p-10 text-center shadow-card">
          <p className="font-serif text-lg text-brand-dark">Aún no tienes cursos asignados</p>
          <p className="mt-2 text-sm text-neutral-900/60">
            Tu terapeuta te asignará los módulos de trabajo. Cuando lo haga, aparecerán aquí.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="catalogo-titulo">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-brand-secondary" size={22} aria-hidden="true" />
          <h3 id="catalogo-titulo" className="font-serif text-xl font-semibold text-brand-dark">
            Asignados por tu terapeuta
          </h3>
        </div>

        <label className="relative block md:w-72">
          <span className="sr-only">Buscar curso o instructora</span>
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-900/40"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar curso o instructora"
            className="w-full rounded-full border border-neutral-100 bg-white py-2.5 pl-10 pr-4 text-sm shadow-card placeholder:text-neutral-900/40 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
          />
        </label>
      </div>

      {/* Pills de categoría */}
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
        {['Todos', ...categorias].map((cat) => {
          const activa = categoria === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoria(cat)}
              aria-pressed={activa}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary ${
                activa
                  ? 'bg-brand-secondary text-white'
                  : 'bg-white text-brand-dark shadow-card hover:bg-neutral-100'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {cursosFiltrados.length === 0 ? (
        <div className="rounded-card bg-white p-10 text-center shadow-card">
          <p className="font-serif text-lg text-brand-dark">Ningún curso coincide con tu búsqueda</p>
          <p className="mt-2 text-sm text-neutral-900/60">
            Prueba con otra palabra o quita el filtro de categoría.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cursosFiltrados.map((curso) => (
            <CursoCard key={curso.id} curso={curso} />
          ))}
        </div>
      )}
    </section>
  )
}
