// Router de administración (Fase 4): gestión de usuarios reservada a
// SUPER_ADMIN — listar, cambiar rol y activar/desactivar cuentas.
// Cambiar el rol o desactivar una cuenta invalida su sesión (regla de
// seguridad): el usuario afectado deja de tener acceso de inmediato.

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '../trpc.js'
import { auditFromRequest, auditResource } from '../audit.js'

const ROLES = ['SUPER_ADMIN', 'INSTRUCTOR', 'MODERATOR', 'STUDENT'] as const

const usuarioListado = z.object({
  id: z.string(),
  nombre: z.string(), // name ?? email — siempre algo legible
  email: z.string(),
  rol: z.enum(ROLES),
  activo: z.boolean(),
  creadoEl: z.date(),
})

export const adminRouter = router({
  /**
   * Lista de usuarios para el panel de administración. Si se envía
   * `busqueda`, filtra por nombre o email (insensible a mayúsculas).
   */
  usuarios: adminProcedure
    .input(z.object({ busqueda: z.string().trim().optional() }).optional())
    .output(z.array(usuarioListado))
    .query(async ({ ctx, input }) => {
      const busqueda = input?.busqueda
      const where =
        busqueda && busqueda.length > 0
          ? {
              OR: [
                { name: { contains: busqueda, mode: 'insensitive' as const } },
                { email: { contains: busqueda, mode: 'insensitive' as const } },
              ],
            }
          : {}

      const usuarios = await ctx.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

      return usuarios.map((u) => ({
        id: u.id,
        nombre: u.name ?? u.email,
        email: u.email,
        rol: u.role,
        activo: u.isActive,
        creadoEl: u.createdAt,
      }))
    }),

  /**
   * Cambia el rol de un usuario. Invalida su sesión actual (cambio de
   * permisos efectivo de inmediato) y registra auditoría CHANGE_ROLE.
   */
  cambiarRol: adminProcedure
    .input(z.object({ userId: z.string(), rol: z.enum(ROLES) }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No puedes cambiar tu propio rol.' })
      }

      const usuario = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      })
      if (!usuario) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado.' })
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: input.userId }, data: { role: input.rol } })
        // Invalida la sesión: el cambio de rol debe aplicarse de inmediato.
        await tx.session.deleteMany({ where: { userId: input.userId } })
        await auditFromRequest(
          ctx,
          'CHANGE_ROLE',
          auditResource('User', input.userId),
          { anterior: usuario.role, nuevo: input.rol },
          tx,
        )
      })

      return { ok: true as const }
    }),

  /**
   * Activa o desactiva una cuenta. Desactivar invalida la sesión actual
   * (la cuenta deja de tener acceso de inmediato) y registra auditoría
   * ACTIVATE_USER / DEACTIVATE_USER.
   */
  cambiarEstado: adminProcedure
    .input(z.object({ userId: z.string(), activo: z.boolean() }))
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No puedes desactivar tu propia cuenta.',
        })
      }

      const usuario = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      })
      if (!usuario) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado.' })
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: input.userId }, data: { isActive: input.activo } })
        if (input.activo === false) {
          // Desactivar invalida la sesión: la cuenta pierde acceso de inmediato.
          await tx.session.deleteMany({ where: { userId: input.userId } })
        }
        await auditFromRequest(
          ctx,
          input.activo ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
          auditResource('User', input.userId),
          undefined,
          tx,
        )
      })

      return { ok: true as const }
    }),
})
