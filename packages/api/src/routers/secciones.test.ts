// Tests de integración del router de secciones — CRUD, reordenamiento y ownership.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')

type SessionUser = import('../context.js').SessionUser

function callerComo(user: SessionUser | null) {
  return createCaller(createContextInner({ user }))
}

const INSTRUCTORA: SessionUser = {
  id: 'dev-instructor-1',
  email: 'instructora@test.dev',
  name: 'Dra. Mariana Cepeda',
  role: 'INSTRUCTOR',
}

const INTRUSO: SessionUser = {
  id: 'test-instructor-3',
  email: 'intruso@test.dev',
  name: 'Intruso',
  role: 'INSTRUCTOR',
}

let cursoId: string

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: INTRUSO.id },
    update: {},
    create: { id: INTRUSO.id, email: INTRUSO.email, name: INTRUSO.name, role: 'INSTRUCTOR' },
  })
  const api = callerComo(INSTRUCTORA)
  const { id } = await api.cursos.crear({
    titulo: 'Curso para secciones (test)',
    descripcion: 'Curso temporal para probar el CRUD de secciones.',
    categoria: 'Pruebas',
  })
  cursoId = id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { resource: `Course:${cursoId}` },
        { resource: { startsWith: 'Section:' }, userId: { in: [INSTRUCTORA.id, INTRUSO.id] } },
      ],
    },
  })
  await prisma.course.deleteMany({ where: { id: cursoId } })
  await prisma.user.delete({ where: { id: INTRUSO.id } }).catch(() => {})
  await prisma.$disconnect()
})

describe('secciones — CRUD y orden', () => {
  it('crear asigna orden incremental y audita', async () => {
    const api = callerComo(INSTRUCTORA)
    const a = await api.secciones.crear({ cursoId, titulo: 'Sección A' })
    const b = await api.secciones.crear({ cursoId, titulo: 'Sección B' })
    const c = await api.secciones.crear({ cursoId, titulo: 'Sección C', descripcion: 'Con descripción' })

    const lista = await api.secciones.listar({ cursoId })
    expect(lista.map((s) => s.titulo)).toEqual(['Sección A', 'Sección B', 'Sección C'])
    expect(lista.map((s) => s.orden)).toEqual([1, 2, 3])

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `Section:${a.id}`, action: 'CREATE_SECTION' },
    })
    expect(auditoria).not.toBeNull()
    expect([a.id, b.id, c.id]).toHaveLength(3)
  })

  it('reordenar aplica el nuevo orden completo', async () => {
    const api = callerComo(INSTRUCTORA)
    const antes = await api.secciones.listar({ cursoId })
    const invertido = [...antes].reverse().map((s) => s.id)

    await api.secciones.reordenar({ cursoId, ordenIds: invertido })

    const despues = await api.secciones.listar({ cursoId })
    expect(despues.map((s) => s.id)).toEqual(invertido)
    expect(despues.map((s) => s.orden)).toEqual([1, 2, 3])
  })

  it('reordenar rechaza conjuntos que no coinciden', async () => {
    const api = callerComo(INSTRUCTORA)
    await expect(
      api.secciones.reordenar({ cursoId, ordenIds: ['id-falso-1', 'id-falso-2'] }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('actualizar renombra la sección', async () => {
    const api = callerComo(INSTRUCTORA)
    const [primera] = await api.secciones.listar({ cursoId })
    await api.secciones.actualizar({ id: primera!.id, titulo: 'Renombrada' })
    const lista = await api.secciones.listar({ cursoId })
    expect(lista[0]!.titulo).toBe('Renombrada')
  })

  it('eliminar quita la sección y reordenar sigue funcionando', async () => {
    const api = callerComo(INSTRUCTORA)
    const lista = await api.secciones.listar({ cursoId })
    await api.secciones.eliminar({ id: lista[1]!.id })
    const restantes = await api.secciones.listar({ cursoId })
    expect(restantes).toHaveLength(lista.length - 1)
  })
})

describe('secciones — ownership', () => {
  it('un intruso no puede listar, crear ni reordenar en curso ajeno', async () => {
    const intruso = callerComo(INTRUSO)
    await expect(intruso.secciones.listar({ cursoId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      intruso.secciones.crear({ cursoId, titulo: 'Sección pirata' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    const api = callerComo(INSTRUCTORA)
    const lista = await api.secciones.listar({ cursoId })
    await expect(
      intruso.secciones.reordenar({ cursoId, ordenIds: lista.map((s) => s.id) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('un intruso no puede renombrar ni eliminar una sección ajena', async () => {
    const api = callerComo(INSTRUCTORA)
    const [seccion] = await api.secciones.listar({ cursoId })
    const intruso = callerComo(INTRUSO)
    await expect(
      intruso.secciones.actualizar({ id: seccion!.id, titulo: 'Hackeada' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(intruso.secciones.eliminar({ id: seccion!.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
