// Tests de integración del router de videos — validaciones de la subida
// directa a Stream, ownership y auditoría. Postgres local de docker-compose.
// El stream usa un directorio temporal (mock local de Cloudflare Stream).

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { StreamLocal } = await import('@amatla/storage')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')
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
  id: 'test-instructor-videos',
  email: 'otro-videos@test.dev',
  name: 'Otro Instructor',
  role: 'INSTRUCTOR',
}

let directorio: string
let cursoId: string
let leccionVideoId: string
let leccionPdfId: string

beforeAll(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'amatla-videos-'))
  __setStream(
    new StreamLocal({
      directorio,
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
      title: 'Curso test videos',
      description: 'Curso para pruebas de subida de video.',
      category: 'Pruebas',
      instructorId: INSTRUCTORA.id,
      sections: {
        create: {
          title: 'Sección única',
          order: 1,
          lessons: {
            create: [
              { title: 'Video intro', order: 1, type: 'VIDEO' },
              { title: 'Material PDF', order: 2, type: 'PDF' },
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
})

afterAll(async () => {
  __setStream(null)
  const subidas = await prisma.videoUpload.findMany({
    where: { uploadedBy: { in: [INSTRUCTORA.id, OTRO_INSTRUCTOR.id] } },
    select: { id: true },
  })
  await prisma.auditLog.deleteMany({
    where: { resource: { in: subidas.map((s) => `VideoUpload:${s.id}`) } },
  })
  await prisma.videoUpload.deleteMany({ where: { id: { in: subidas.map((s) => s.id) } } })
  await prisma.auditLog.deleteMany({ where: { resource: `Course:${cursoId}` } })
  await prisma.course.delete({ where: { id: cursoId } }).catch(() => {})
  await prisma.user.delete({ where: { id: OTRO_INSTRUCTOR.id } }).catch(() => {})
  await prisma.$disconnect()
  await rm(directorio, { recursive: true, force: true })
})

function solicitudValida() {
  return {
    leccionId: leccionVideoId,
    nombreArchivo: 'clase-01.mp4',
    mimeType: 'video/mp4',
    tamanoBytes: 5 * 1024 * 1024,
  }
}

describe('videos.solicitarSubida', () => {
  it('rechaza extensiones no permitidas', async () => {
    await expect(
      callerComo(INSTRUCTORA).videos.solicitarSubida({
        ...solicitudValida(),
        nombreArchivo: 'clase.avi',
        mimeType: 'video/x-msvideo',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rechaza MIME incoherente con la extensión', async () => {
    await expect(
      callerComo(INSTRUCTORA).videos.solicitarSubida({
        ...solicitudValida(),
        mimeType: 'video/quicktime', // .mp4 declarado como mov
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rechaza videos de más de 500MB', async () => {
    await expect(
      callerComo(INSTRUCTORA).videos.solicitarSubida({
        ...solicitudValida(),
        tamanoBytes: 501 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rechaza lecciones que no son de tipo VIDEO', async () => {
    await expect(
      callerComo(INSTRUCTORA).videos.solicitarSubida({
        ...solicitudValida(),
        leccionId: leccionPdfId,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('un instructor NO puede subir video a la lección de otro (NOT_FOUND)', async () => {
    await expect(
      callerComo(OTRO_INSTRUCTOR).videos.solicitarSubida(solicitudValida()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('solicitud feliz: VideoUpload PENDING + auditoría + URL de un solo uso', async () => {
    const r = await callerComo(INSTRUCTORA).videos.solicitarSubida(solicitudValida())
    expect(r.url).toContain('/api/stream-dev/')
    expect(r.url).toContain('firma=')
    expect(r.expiraEn.getTime()).toBeGreaterThan(Date.now())

    const registro = await prisma.videoUpload.findUniqueOrThrow({
      where: { id: r.videoUploadId },
    })
    expect(registro.status).toBe('PENDING')
    expect(registro.lessonId).toBe(leccionVideoId)
    expect(registro.uid).toMatch(/^[a-f0-9]{32}$/)

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `VideoUpload:${r.videoUploadId}`, action: 'UPLOAD_VIDEO' },
    })
    expect(auditoria).not.toBeNull()

    // La lección NO se enlaza al solicitar — eso lo hace SOLO el worker
    const leccion = await prisma.lesson.findUniqueOrThrow({ where: { id: leccionVideoId } })
    expect(leccion.videoId).toBeNull()
  })
})

describe('videos.estadoSubida', () => {
  it('el dueño ve el estado; otro instructor recibe NOT_FOUND', async () => {
    const r = await callerComo(INSTRUCTORA).videos.solicitarSubida(solicitudValida())

    const estado = await callerComo(INSTRUCTORA).videos.estadoSubida({
      videoUploadId: r.videoUploadId,
    })
    expect(estado).toEqual({ estado: 'PENDING', duracion: null, detalle: null })

    await expect(
      callerComo(OTRO_INSTRUCTOR).videos.estadoSubida({ videoUploadId: r.videoUploadId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
