'use client'

// Gestión de usuarios (Fase 4, SUPER_ADMIN): buscar, cambiar rol y
// activar/desactivar cuentas. El estado optimista vive aquí; la verdad la
// pone el server (revalidatePath + router.refresh).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2, ShieldCheck } from 'lucide-react'
import { cambiarRolAction, cambiarEstadoAction, type RolUsuario } from '@/acciones/admin'

export interface UsuarioItem {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  creadoEl: string // ISO
}

interface Props {
  usuarios: UsuarioItem[]
  usuarioActualId: string
}

const ETIQUETAS_ROL: Record<RolUsuario, string> = {
  SUPER_ADMIN: 'Administrador',
  INSTRUCTOR: 'Instructor',
  MODERATOR: 'Moderador',
  STUDENT: 'Estudiante',
}

const OPCIONES_ROL: RolUsuario[] = ['SUPER_ADMIN', 'INSTRUCTOR', 'MODERATOR', 'STUDENT']

export function GestionUsuarios({ usuarios: usuariosIniciales, usuarioActualId }: Props) {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState(usuariosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  function manejarCambioRol(usuario: UsuarioItem, nuevoRol: RolUsuario) {
    if (nuevoRol === usuario.rol) return
    if (!window.confirm('Cambiar el rol cerrará la sesión de este usuario. ¿Continuar?')) return

    setError(null)
    const rolAnterior = usuario.rol
    setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, rol: nuevoRol } : u)))

    startTransition(async () => {
      const r = await cambiarRolAction(usuario.id, nuevoRol)
      if (r.error) {
        setError(r.error)
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuario.id ? { ...u, rol: rolAnterior } : u)),
        )
      } else {
        router.refresh()
      }
    })
  }

  function manejarCambioEstado(usuario: UsuarioItem) {
    const nuevoActivo = !usuario.activo
    if (!nuevoActivo) {
      if (!window.confirm('Desactivar cerrará su sesión y no podrá entrar. ¿Continuar?')) return
    }

    setError(null)
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, activo: nuevoActivo } : u)),
    )

    startTransition(async () => {
      const r = await cambiarEstadoAction(usuario.id, nuevoActivo)
      if (r.error) {
        setError(r.error)
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuario.id ? { ...u, activo: usuario.activo } : u)),
        )
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="sr-only" htmlFor="busqueda-usuarios">
          Buscar usuarios
        </label>
        <input
          id="busqueda-usuarios"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o correo…"
          className="w-full max-w-sm rounded-lg border border-neutral-100 bg-white px-3 py-2.5 text-sm shadow-card focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <section className="rounded-card bg-white shadow-card">
        {filtrados.length === 0 ? (
          <p className="p-5 text-sm text-neutral-900/55">
            No se encontraron usuarios con ese criterio de búsqueda.
          </p>
        ) : (
          <>
            {/* Tabla — md y mayor */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-900/50">
                  <th className="px-5 py-3">Usuario</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Creado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtrados.map((u) => {
                  const esPropio = u.id === usuarioActualId
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-crema-hover">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-brand-dark">
                          {u.nombre}
                          {esPropio && (
                            <span className="ml-1 text-xs font-normal text-neutral-900/50">
                              (tú)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-900/55">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={u.rol}
                          onChange={(e) => manejarCambioRol(u, e.target.value as RolUsuario)}
                          disabled={esPropio || pendiente}
                          aria-label={`Rol de ${u.nombre}`}
                          className="rounded-lg border border-neutral-100 bg-white px-2.5 py-1.5 text-sm shadow-card focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 disabled:opacity-50"
                        >
                          {OPCIONES_ROL.map((rol) => (
                            <option key={rol} value={rol}>
                              {ETIQUETAS_ROL[rol]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            u.activo
                              ? 'bg-brand-secondary/10 text-brand-secondary'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-900/70">
                        {new Date(u.creadoEl).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => manejarCambioEstado(u)}
                          disabled={esPropio || pendiente}
                          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-900/70 transition-colors hover:border-brand-secondary hover:text-brand-secondary disabled:opacity-40"
                        >
                          {pendiente ? (
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                          ) : u.activo ? (
                            <Ban size={13} aria-hidden="true" />
                          ) : (
                            <ShieldCheck size={13} aria-hidden="true" />
                          )}
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Tarjetas — móvil */}
            <ul className="divide-y divide-neutral-100 md:hidden">
              {filtrados.map((u) => {
                const esPropio = u.id === usuarioActualId
                return (
                  <li key={u.id} className="space-y-3 p-4">
                    <div>
                      <p className="font-semibold text-brand-dark">
                        {u.nombre}
                        {esPropio && (
                          <span className="ml-1 text-xs font-normal text-neutral-900/50">
                            (tú)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-900/55">{u.email}</p>
                      <p className="mt-1 text-xs text-neutral-900/55">
                        Creado el {new Date(u.creadoEl).toLocaleDateString('es-MX')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="flex-1">
                        <span className="sr-only">Rol de {u.nombre}</span>
                        <select
                          value={u.rol}
                          onChange={(e) => manejarCambioRol(u, e.target.value as RolUsuario)}
                          disabled={esPropio || pendiente}
                          className="w-full rounded-lg border border-neutral-100 bg-white px-2.5 py-1.5 text-sm shadow-card focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 disabled:opacity-50"
                        >
                          {OPCIONES_ROL.map((rol) => (
                            <option key={rol} value={rol}>
                              {ETIQUETAS_ROL[rol]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          u.activo
                            ? 'bg-brand-secondary/10 text-brand-secondary'
                            : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => manejarCambioEstado(u)}
                      disabled={esPropio || pendiente}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-900/70 transition-colors hover:border-brand-secondary hover:text-brand-secondary disabled:opacity-40"
                    >
                      {pendiente ? (
                        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                      ) : u.activo ? (
                        <Ban size={13} aria-hidden="true" />
                      ) : (
                        <ShieldCheck size={13} aria-hidden="true" />
                      )}
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
