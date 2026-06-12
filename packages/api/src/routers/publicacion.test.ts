// Tests de integración de publicar/archivar curso y vista previa de lección.
// Postgres local de docker-compose; almacén y stream con directorio temporal.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { AlmacenLocal, StreamLocal } = await import('@amatla/storage')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')
const { __setAlmacen } = await import('../almacen.js')
const { __setStream } = await import('../stream.js')

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

const OTRO_INSTRUCTOR: SessionUser = {
  id: 'test-instructor-publicacion',
  email: 'otro-publicacion@test.dev',
  name: 'Otro Instructor',
  role: 'INSTRUCTOR',
}

const UID_VIDEO = 'aaaabbbbccccddddeeeeffff00001111'

let directorio: string
let cursoId: string
let leccionVideoId: string
let leccionPdfId: string
let leccionTextoId: string

beforeAll(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'amatla-publicacion-'))
  __setAlmacen(
    new AlmacenLocal({
      directorio: join(directorio, 'almacen'),
      urlBase: 'http://localhost:3000/api/almacen-dev',
      secreto: 'secreto-test',
    }),
  )
  __setStream(
    new StreamLocal({
      directorio: join(directorio, 'stream'),
      urlBase: 'http://localhost:3000/api/stream-dev',
      secreto: 'secreto-test',
    }),
  )

  await prisma.user.upsert({
    where: { id: OTRO_INSTRUCTOR.id },
    update: {},
    create: {
      id: OTRO_INSTRUCTOR.id,
      email: OTRO_INSTRUCTOR.email,
      name: OTRO_INSTRUCTOR.name,
      role: 'INSTRUCTOR',
    },
  })

  const curso = await prisma.course.create({
    data: {
      title: 'Curso test publicación',
      description: 'Curso para pruebas de publicar/archivar y vista previa.',
      category: 'Pruebas',
      instructorId: INSTRUCTORA.id,
      sections: {
        create: {
          title: 'Sección de prueba',
          order: 1,
          lessons: {
            create: [
              { title: 'Video sin procesar', order: 1, type: 'VIDEO' },
              { title: 'Material PDF', order: 2, type: 'PDF' },
              { title: 'Texto pendiente', order: 3, type: 'TEXT' },
            ],
          },
        },
      },
    },
    include: { sections: { include: { lessons: { orderBy: { order: 'asc' } } } } },
  })
  cursoId = curso.id
  leccionVideoId = curso.sections[0]!.lessons[0]!.id
  leccionPdfId = curso.sections[0]!.lessons[1]!.id
  leccionTextoId = curso.sections[0]!.lessons[2]!.id
})

beforeEach(async () => {
  // Estado limpio entre tests: curso en borrador, lecciones sin contenido
  await prisma.course.update({ where: { id: cursoId }, data: { status: 'DRAFT' } })
  await prisma.lesson.updateMany({
    where: { section: { courseId: cursoId } },
    data: { videoId: null, fileKey: null },
  })
})

afterAll(async () => {
  __setAlmacen(null)
  __setStream(null)
  await prisma.auditLog.deleteMany({ where: { resource: `Course:${cursoId}` } })
  await prisma.course.delete({ where: { id: cursoId } }).catch(() => {})
  await prisma.user.delete({ where: { id: OTRO_INSTRUCTOR.id } }).catch(() => {})
  await prisma.$disconnect()
  await rm(directorio, { recursive: true, force: true })
})

describe('cursos.publicar', () => {
  it('rechaza publicar sin ninguna lección con contenido listo', async () => {
    await expect(callerComo(INSTRUCTORA).cursos.publicar({ id: cursoId })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    // Una lección VIDEO sin video procesado tampoco cuenta como lista
    const curso = await prisma.course.findUniqueOrThrow({ where: { id: cursoId } })
    expect(curso.status).toBe('DRAFT')
  })

  it('publica cuando hay al menos una lección lista y audita PUBLISH_COURSE', async () => {
    await prisma.lesson.update({
      where: { id: leccionVideoId },
      data: { videoId: UID_VIDEO, duration: 300 },
    })

    const r = await callerComo(INSTRUCTORA).cursos.publicar({ id: cursoId })
    expect(r.status).toBe('PUBLISHED')

    const curso = await prisma.course.findUniqueOrThrow({ where: { id: cursoId } })
    expect(curso.status).toBe('PUBLISHED')

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `Course:${cursoId}`, action: 'PUBLISH_COURSE' },
    })
    expect(auditoria).not.toBeNull()
  })

  it('un PDF escaneado y enlazado también habilita la publicación', async () => {
    await prisma.lesson.update({
      where: { id: leccionPdfId },
      data: { fileKey: `lecciones/${leccionPdfId}/material.pdf` },
    })
    const r = await callerComo(INSTRUCTORA).cursos.publicar({ id: cursoId })
    expect(r.status).toBe('PUBLISHED')
  })

  it('rechaza publicar un curso ya publicado y respeta ownership', async () => {
    await prisma.lesson.update({ where: { id: leccionVideoId }, data: { videoId: UID_VIDEO } })
    await callerComo(INSTRUCTORA).cursos.publicar({ id: cursoId })

    await expect(callerComo(INSTRUCTORA).cursos.publicar({ id: cursoId })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    await expect(callerComo(OTRO_INSTRUCTOR).cursos.publicar({ id: cursoId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('cursos.archivar', () => {
  it('archiva un curso publicado y audita ARCHIVE_COURSE', async () => {
    await prisma.course.update({ where: { id: cursoId }, data: { status: 'PUBLISHED' } })

    const r = await callerComo(INSTRUCTORA).cursos.archivar({ id: cursoId })
    expect(r.status).toBe('ARCHIVED')

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `Course:${cursoId}`, action: 'ARCHIVE_COURSE' },
    })
    expect(auditoria).not.toBeNull()
  })

  it('rechaza archivar dos veces y respeta ownership', async () => {
    await prisma.course.update({ where: { id: cursoId }, data: { status: 'ARCHIVED' } })
    await expect(callerComo(INSTRUCTORA).cursos.archivar({ id: cursoId })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    await expect(callerComo(OTRO_INSTRUCTOR).cursos.archivar({ id: cursoId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('un curso archivado puede volver a publicarse si sigue teniendo contenido', async () => {
    await prisma.lesson.update({ where: { id: leccionVideoId }, data: { videoId: UID_VIDEO } })
    await prisma.course.update({ where: { id: cursoId }, data: { status: 'ARCHIVED' } })

    const r = await callerComo(INSTRUCTORA).cursos.publicar({ id: cursoId })
    expect(r.status).toBe('PUBLISHED')
  })
})

describe('lecciones.preview', () => {
  it('lección VIDEO con video: URL de reproducción firmada con TTL ≤ 30 min', async () => {
    await prisma.lesson.update({
      where: { id: leccionVideoId },
      data: { videoId: UID_VIDEO, duration: 300 },
    })

    const r = await callerComo(INSTRUCTORA).lecciones.preview({ id: leccionVideoId })
    expect(r.tipo).toBe('VIDEO')
    expect(r.curso.id).toBe(cursoId)
    expect(r.seccionTitulo).toBe('Sección de prueba')
    expect(r.urlPdf).toBeNull()
    expect(r.urlVideo).toContain(`/api/stream-dev/${UID_VIDEO}`)
    expect(r.urlVideo).toContain('firma=')

    const exp = Number(new URL(r.urlVideo!).searchParams.get('exp'))
    expect(exp * 1000).toBeLessThanOrEqual(Date.now() + 30 * 60 * 1000)
  })

  it('lección PDF con archivo: URL de lectura firmada; sin contenido: nulls', async () => {
    await prisma.lesson.update({
      where: { id: leccionPdfId },
      data: { fileKey: `lecciones/${leccionPdfId}/material.pdf` },
    })

    const conPdf = await callerComo(INSTRUCTORA).lecciones.preview({ id: leccionPdfId })
    expect(conPdf.urlPdf).toContain('/api/almacen-dev/')
    expect(conPdf.urlVideo).toBeNull()

    const texto = await callerComo(INSTRUCTORA).lecciones.preview({ id: leccionTextoId })
    expect(texto.urlVideo).toBeNull()
    expect(texto.urlPdf).toBeNull()
  })

  it('otro instructor recibe NOT_FOUND (ownership de 3 niveles)', async () => {
    await expect(
      callerComo(OTRO_INSTRUCTOR).lecciones.preview({ id: leccionVideoId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
