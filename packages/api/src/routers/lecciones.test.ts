// Tests de integración del router de lecciones — CRUD, orden y ownership de 3 niveles.

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
  id: 'test-instructor-4',
  email: 'intruso-lecciones@test.dev',
  name: 'Intruso',
  role: 'INSTRUCTOR',
}

let cursoId: string
let seccionId: string

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: INTRUSO.id },
    update: {},
    create: { id: INTRUSO.id, email: INTRUSO.email, name: INTRUSO.name, role: 'INSTRUCTOR' },
  })
  const api = callerComo(INSTRUCTORA)
  const curso = await api.cursos.crear({
    titulo: 'Curso para lecciones (test)',
    descripcion: 'Curso temporal para probar el CRUD de lecciones.',
    categoria: 'Pruebas',
  })
  cursoId = curso.id
  const seccion = await api.secciones.crear({ cursoId, titulo: 'Sección de lecciones' })
  seccionId = seccion.id
})

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { userId: { in: [INSTRUCTORA.id, INTRUSO.id] }, resource: { startsWith: 'Lesson:' } },
  })
  await prisma.auditLog.deleteMany({
    where: { OR: [{ resource: `Course:${cursoId}` }, { resource: `Section:${seccionId}` }] },
  })
  await prisma.course.deleteMany({ where: { id: cursoId } })
  await prisma.user.delete({ where: { id: INTRUSO.id } }).catch(() => {})
  await prisma.$disconnect()
})

describe('lecciones — CRUD y orden', () => {
  it('crear asigna orden incremental, tipo y audita', async () => {
    const api = callerComo(INSTRUCTORA)
    const v = await api.lecciones.crear({ seccionId, titulo: 'Video intro', tipo: 'VIDEO' })
    await api.lecciones.crear({ seccionId, titulo: 'Material PDF', tipo: 'PDF' })
    await api.lecciones.crear({ seccionId, titulo: 'Lectura', tipo: 'TEXT' })

    const [seccion] = await api.secciones.listar({ cursoId })
    expect(seccion!.lecciones.map((l) => l.titulo)).toEqual(['Video intro', 'Material PDF', 'Lectura'])
    expect(seccion!.lecciones.map((l) => l.orden)).toEqual([1, 2, 3])
    expect(seccion!.lecciones[0]!.tipo).toBe('VIDEO')

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `Lesson:${v.id}`, action: 'CREATE_LESSON' },
    })
    expect(auditoria).not.toBeNull()
  })

  it('rechaza tipos fuera de VIDEO/PDF/TEXT', async () => {
    const api = callerComo(INSTRUCTORA)
    await expect(
      // @ts-expect-error — tipo inválido a propósito
      api.lecciones.crear({ seccionId, titulo: 'Quiz prohibido', tipo: 'QUIZ' }),
    ).rejects.toThrow(/VIDEO, PDF o TEXT/)
  })

  it('actualizar renombra y marca como preview', async () => {
    const api = callerComo(INSTRUCTORA)
    const [seccion] = await api.secciones.listar({ cursoId })
    const primera = seccion!.lecciones[0]!
    await api.lecciones.actualizar({ id: primera.id, titulo: 'Video bienvenida', esPreview: true })

    const [actualizada] = await api.secciones.listar({ cursoId })
    expect(actualizada!.lecciones[0]!.titulo).toBe('Video bienvenida')
    expect(actualizada!.lecciones[0]!.esPreview).toBe(true)
  })

  it('reordenar aplica el nuevo orden y rechaza conjuntos inválidos', async () => {
    const api = callerComo(INSTRUCTORA)
    const [seccion] = await api.secciones.listar({ cursoId })
    const invertido = [...seccion!.lecciones].reverse().map((l) => l.id)

    await api.lecciones.reordenar({ seccionId, ordenIds: invertido })
    const [despues] = await api.secciones.listar({ cursoId })
    expect(despues!.lecciones.map((l) => l.id)).toEqual(invertido)
    expect(despues!.lecciones.map((l) => l.orden)).toEqual([1, 2, 3])

    await expect(
      api.lecciones.reordenar({ seccionId, ordenIds: ['falso-1'] }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('eliminar quita la lección', async () => {
    const api = callerComo(INSTRUCTORA)
    const [seccion] = await api.secciones.listar({ cursoId })
    await api.lecciones.eliminar({ id: seccion!.lecciones[2]!.id })
    const [despues] = await api.secciones.listar({ cursoId })
    expect(despues!.lecciones).toHaveLength(2)
  })
})

describe('lecciones — contenido TEXT (Tiptap)', () => {
  it('guarda HTML sanitizado (quita scripts) y lo devuelve; rechaza no-TEXT', async () => {
    const api = callerComo(INSTRUCTORA)
    const texto = await api.lecciones.crear({ seccionId, titulo: 'Lección de texto', tipo: 'TEXT' })

    // HTML con un <script> y un onclick maliciosos + formato legítimo
    await api.lecciones.guardarContenido({
      id: texto.id,
      contenido:
        '<h2>Título</h2><p>Hola <strong>mundo</strong></p><script>alert(1)</script><p onclick="evil()">x</p><a href="javascript:evil()">link</a>',
    })

    const { contenido } = await api.lecciones.obtenerContenido({ id: texto.id })
    expect(contenido).toContain('<strong>mundo</strong>')
    expect(contenido).toContain('<h2>')
    expect(contenido).not.toContain('<script>')
    expect(contenido).not.toContain('onclick')
    expect(contenido).not.toContain('javascript:')

    // Una lección VIDEO no admite contenido de texto
    const video = await api.lecciones.crear({ seccionId, titulo: 'Video (no TEXT)', tipo: 'VIDEO' })
    await expect(
      api.lecciones.guardarContenido({ id: video.id, contenido: '<p>x</p>' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(api.lecciones.obtenerContenido({ id: video.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })

    await api.lecciones.eliminar({ id: texto.id })
    await api.lecciones.eliminar({ id: video.id })
  })

  it('un intruso no puede leer ni escribir el contenido de una lección ajena', async () => {
    const api = callerComo(INSTRUCTORA)
    const texto = await api.lecciones.crear({ seccionId, titulo: 'Texto privado', tipo: 'TEXT' })
    const intruso = callerComo(INTRUSO)
    await expect(intruso.lecciones.obtenerContenido({ id: texto.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      intruso.lecciones.guardarContenido({ id: texto.id, contenido: '<p>hack</p>' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await api.lecciones.eliminar({ id: texto.id })
  })
})

describe('lecciones — ownership (3 niveles)', () => {
  it('un intruso no puede crear, editar, eliminar ni reordenar en sección ajena', async () => {
    const intruso = callerComo(INTRUSO)
    await expect(
      intruso.lecciones.crear({ seccionId, titulo: 'Pirata', tipo: 'TEXT' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    const api = callerComo(INSTRUCTORA)
    const [seccion] = await api.secciones.listar({ cursoId })
    const leccion = seccion!.lecciones[0]!

    await expect(
      intruso.lecciones.actualizar({ id: leccion.id, titulo: 'Hackeada' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(intruso.lecciones.eliminar({ id: leccion.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      intruso.lecciones.reordenar({ seccionId, ordenIds: seccion!.lecciones.map((l) => l.id) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
