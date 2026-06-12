// Tests de integración del router de archivos — validaciones del pipeline
// de subida, ownership y auditoría. Postgres local de docker-compose.
// La cola BullMQ se mockea (el worker tiene sus propios tests); el almacén
// usa un directorio temporal.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

vi.mock('../cola-media.js', () => ({
  encolarEscaneo: vi.fn().mockResolvedValue(undefined),
}))

const { prisma } = await import('@amatla/db')
const { AlmacenLocal } = await import('@amatla/storage')
const { createCaller } = await import('../root.js')
const { createContextInner } = await import('../context.js')
const { __setAlmacen } = await import('../almacen.js')
const { encolarEscaneo } = await import('../cola-media.js')

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
  id: 'test-instructor-archivos',
  email: 'otro-archivos@test.dev',
  name: 'Otro Instructor',
  role: 'INSTRUCTOR',
}

let directorio: string
let cursoId: string
let leccionPdfId: string
let leccionVideoId: string

beforeAll(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'amatla-archivos-'))
  __setAlmacen(
    new AlmacenLocal({
      directorio,
      urlBase: 'http://localhost:3000/api/almacen-dev',
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
      title: 'Curso test archivos',
      description: 'Curso para pruebas del pipeline de subida.',
      category: 'Pruebas',
      instructorId: INSTRUCTORA.id,
      sections: {
        create: {
          title: 'Sección única',
          order: 1,
          lessons: {
            create: [
              { title: 'Material PDF', order: 1, type: 'PDF' },
              { title: 'Video intro', order: 2, type: 'VIDEO' },
            ],
          },
        },
      },
    },
    include: { sections: { include: { lessons: { orderBy: { order: 'asc' } } } } },
  })
  cursoId = curso.id
  leccionPdfId = curso.sections[0]!.lessons[0]!.id
  leccionVideoId = curso.sections[0]!.lessons[1]!.id
})

afterAll(async () => {
  const subidas = await prisma.fileUpload.findMany({
    where: { uploadedBy: { in: [INSTRUCTORA.id, OTRO_INSTRUCTOR.id] } },
    select: { id: true },
  })
  await prisma.auditLog.deleteMany({
    where: { resource: { in: subidas.map((s) => `FileUpload:${s.id}`) } },
  })
  await prisma.fileUpload.deleteMany({ where: { id: { in: subidas.map((s) => s.id) } } })
  await prisma.auditLog.deleteMany({ where: { resource: `Course:${cursoId}` } })
  await prisma.course.delete({ where: { id: cursoId } }).catch(() => {})
  await prisma.user.delete({ where: { id: OTRO_INSTRUCTOR.id } }).catch(() => {})
  await prisma.$disconnect()
  await rm(directorio, { recursive: true, force: true })
})

describe('archivos.solicitarSubida — validaciones', () => {
  it('firma la subida de un thumbnail válido y registra FileUpload + auditoría', async () => {
    const api = callerComo(INSTRUCTORA)
    const r = await api.archivos.solicitarSubida({
      proposito: 'THUMBNAIL_CURSO',
      objetivoId: cursoId,
      nombreArchivo: 'portada.png',
      mimeType: 'image/png',
      tamanoBytes: 1234,
    })

    expect(r.url).toContain('firma=')
    expect(r.expiraEn.getTime()).toBeGreaterThan(Date.now())

    const subida = await prisma.fileUpload.findUniqueOrThrow({ where: { id: r.uploadId } })
    expect(subida.scanStatus).toBe('PENDING')
    expect(subida.purpose).toBe('THUMBNAIL_CURSO')
    expect(subida.targetId).toBe(cursoId)
    expect(subida.r2Key).toMatch(new RegExp(`^cursos/${cursoId}/thumbnail/.+\\.png$`))

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `FileUpload:${r.uploadId}`, action: 'UPLOAD_FILE' },
    })
    expect(auditoria?.userId).toBe(INSTRUCTORA.id)
  })

  it('rechaza extensiones no permitidas', async () => {
    const api = callerComo(INSTRUCTORA)
    await expect(
      api.archivos.solicitarSubida({
        proposito: 'THUMBNAIL_CURSO',
        objetivoId: cursoId,
        nombreArchivo: 'malware.exe',
        mimeType: 'image/png',
        tamanoBytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rechaza MIME incoherente con la extensión', async () => {
    const api = callerComo(INSTRUCTORA)
    await expect(
      api.archivos.solicitarSubida({
        proposito: 'THUMBNAIL_CURSO',
        objetivoId: cursoId,
        nombreArchivo: 'portada.png',
        mimeType: 'image/jpeg',
        tamanoBytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('rechaza archivos que superan el límite del propósito', async () => {
    const api = callerComo(INSTRUCTORA)
    await expect(
      api.archivos.solicitarSubida({
        proposito: 'THUMBNAIL_CURSO',
        objetivoId: cursoId,
        nombreArchivo: 'gigante.png',
        mimeType: 'image/png',
        tamanoBytes: 11 * 1024 * 1024, // > 10MB
      }),
    ).rejects.toThrow(/10MB/)
  })

  it('rechaza subir PDF a una lección que no es de tipo PDF', async () => {
    const api = callerComo(INSTRUCTORA)
    await expect(
      api.archivos.solicitarSubida({
        proposito: 'PDF_LECCION',
        objetivoId: leccionVideoId,
        nombreArchivo: 'manual.pdf',
        mimeType: 'application/pdf',
        tamanoBytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('otro instructor no puede subir a un curso ajeno (NOT_FOUND)', async () => {
    const intruso = callerComo(OTRO_INSTRUCTOR)
    await expect(
      intruso.archivos.solicitarSubida({
        proposito: 'THUMBNAIL_CURSO',
        objetivoId: cursoId,
        nombreArchivo: 'portada.png',
        mimeType: 'image/png',
        tamanoBytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('archivos.confirmarSubida', () => {
  it('rechaza confirmar si el objeto no se subió', async () => {
    const api = callerComo(INSTRUCTORA)
    const { uploadId } = await api.archivos.solicitarSubida({
      proposito: 'PDF_LECCION',
      objetivoId: leccionPdfId,
      nombreArchivo: 'manual.pdf',
      mimeType: 'application/pdf',
      tamanoBytes: 500,
    })
    await expect(api.archivos.confirmarSubida({ uploadId })).rejects.toThrow(/no se subió/)
    expect(encolarEscaneo).not.toHaveBeenCalled()
  })

  it('con el objeto en el almacén, encola el escaneo', async () => {
    const api = callerComo(INSTRUCTORA)
    const datos = Buffer.from('x'.repeat(500))
    const { uploadId } = await api.archivos.solicitarSubida({
      proposito: 'PDF_LECCION',
      objetivoId: leccionPdfId,
      nombreArchivo: 'manual.pdf',
      mimeType: 'application/pdf',
      tamanoBytes: datos.length,
    })
    const subida = await prisma.fileUpload.findUniqueOrThrow({ where: { id: uploadId } })

    // Simula el PUT del navegador escribiendo directo en el almacén
    const { obtenerAlmacen } = await import('../almacen.js')
    await (obtenerAlmacen() as InstanceType<typeof AlmacenLocal>).guardar(subida.r2Key, datos)

    const r = await api.archivos.confirmarSubida({ uploadId })
    expect(r.ok).toBe(true)
    expect(encolarEscaneo).toHaveBeenCalledWith({ uploadId })
  })

  it('solo quien subió puede confirmar (NOT_FOUND para otros)', async () => {
    const api = callerComo(INSTRUCTORA)
    const { uploadId } = await api.archivos.solicitarSubida({
      proposito: 'THUMBNAIL_CURSO',
      objetivoId: cursoId,
      nombreArchivo: 'portada.jpg',
      mimeType: 'image/jpeg',
      tamanoBytes: 100,
    })
    const intruso = callerComo(OTRO_INSTRUCTOR)
    await expect(intruso.archivos.confirmarSubida({ uploadId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(intruso.archivos.estadoSubida({ uploadId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('archivos.estadoSubida', () => {
  it('devuelve el estado del escaneo al dueño', async () => {
    const api = callerComo(INSTRUCTORA)
    const { uploadId } = await api.archivos.solicitarSubida({
      proposito: 'THUMBNAIL_CURSO',
      objetivoId: cursoId,
      nombreArchivo: 'portada.jpeg',
      mimeType: 'image/jpeg',
      tamanoBytes: 100,
    })
    const estado = await api.archivos.estadoSubida({ uploadId })
    expect(estado).toEqual({ estado: 'PENDING', detalle: null })
  })
})
