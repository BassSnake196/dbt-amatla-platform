// Tests del pipeline de escaneo — Postgres local + almacén temporal.
// El escáner se inyecta (DI): la integración real con clamd se prueba
// en clamav.test.ts; aquí se valida la lógica del pipeline.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { AlmacenLocal } = await import('@amatla/storage')
const { procesarEscaneo } = await import('./escaneo.js')

const USUARIO_ID = 'test-worker-instructor'
// Magic bytes reales: file-type los necesita para identificar el MIME
const PNG_MINIMO = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('resto-del-png'),
])
const PDF_MINIMO = Buffer.from('%PDF-1.4\ncontenido de prueba\n%%EOF')

const LIMPIO = vi.fn().mockResolvedValue({ limpio: true, firma: null })
const INFECTADO = vi
  .fn()
  .mockResolvedValue({ limpio: false, firma: 'Win.Test.EICAR_HDB-1' })

let directorio: string
let almacen: InstanceType<typeof AlmacenLocal>
let cursoId: string
let leccionId: string

async function crearSubida(datos: {
  key: string
  mimeType: string
  purpose: string
  targetId: string
  contenido?: Buffer
}) {
  if (datos.contenido) await almacen.guardar(datos.key, datos.contenido)
  return prisma.fileUpload.create({
    data: {
      uploadedBy: USUARIO_ID,
      r2Key: datos.key,
      fileName: datos.key.split('/').pop()!,
      mimeType: datos.mimeType,
      sizeBytes: datos.contenido?.length ?? 1,
      purpose: datos.purpose,
      targetId: datos.targetId,
    },
  })
}

beforeAll(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'amatla-worker-'))
  almacen = new AlmacenLocal({
    directorio,
    urlBase: 'http://localhost:3000/api/almacen-dev',
    secreto: 'secreto-test-worker',
  })

  await prisma.user.upsert({
    where: { id: USUARIO_ID },
    update: {},
    create: {
      id: USUARIO_ID,
      email: 'worker-test@test.dev',
      name: 'Instructor Worker Test',
      role: 'INSTRUCTOR',
    },
  })
  const curso = await prisma.course.create({
    data: {
      title: 'Curso test worker',
      description: 'Curso para pruebas del worker de escaneo.',
      category: 'Pruebas',
      instructorId: USUARIO_ID,
      sections: {
        create: {
          title: 'Sección',
          order: 1,
          lessons: { create: { title: 'Material', order: 1, type: 'PDF' } },
        },
      },
    },
    include: { sections: { include: { lessons: true } } },
  })
  cursoId = curso.id
  leccionId = curso.sections[0]!.lessons[0]!.id
})

afterAll(async () => {
  const subidas = await prisma.fileUpload.findMany({
    where: { uploadedBy: USUARIO_ID },
    select: { id: true },
  })
  await prisma.auditLog.deleteMany({
    where: { resource: { in: subidas.map((s) => `FileUpload:${s.id}`) } },
  })
  await prisma.fileUpload.deleteMany({ where: { uploadedBy: USUARIO_ID } })
  await prisma.notification.deleteMany({ where: { userId: USUARIO_ID } })
  await prisma.course.delete({ where: { id: cursoId } }).catch(() => {})
  await prisma.user.delete({ where: { id: USUARIO_ID } }).catch(() => {})
  await prisma.$disconnect()
  await rm(directorio, { recursive: true, force: true })
})

describe('procesarEscaneo — archivo limpio', () => {
  it('marca CLEAN, enlaza el thumbnail del curso y notifica', async () => {
    const subida = await crearSubida({
      key: `cursos/${cursoId}/thumbnail/a.png`,
      mimeType: 'image/png',
      purpose: 'THUMBNAIL_CURSO',
      targetId: cursoId,
      contenido: PNG_MINIMO,
    })

    await procesarEscaneo(subida.id, { almacen, escanear: LIMPIO })

    const actualizada = await prisma.fileUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.scanStatus).toBe('CLEAN')

    const curso = await prisma.course.findUniqueOrThrow({ where: { id: cursoId } })
    expect(curso.thumbnail).toBe(subida.r2Key)

    // El archivo sigue en el almacén
    expect(await almacen.tamano(subida.r2Key)).toBe(PNG_MINIMO.length)

    const aviso = await prisma.notification.findFirst({
      where: { userId: USUARIO_ID, type: 'ARCHIVO_LISTO' },
    })
    expect(aviso).not.toBeNull()
  })

  it('al reemplazar el thumbnail elimina el archivo anterior', async () => {
    const keyAnterior = (await prisma.course.findUniqueOrThrow({ where: { id: cursoId } }))
      .thumbnail!
    const subida = await crearSubida({
      key: `cursos/${cursoId}/thumbnail/b.png`,
      mimeType: 'image/png',
      purpose: 'THUMBNAIL_CURSO',
      targetId: cursoId,
      contenido: PNG_MINIMO,
    })

    await procesarEscaneo(subida.id, { almacen, escanear: LIMPIO })

    const curso = await prisma.course.findUniqueOrThrow({ where: { id: cursoId } })
    expect(curso.thumbnail).toBe(subida.r2Key)
    expect(await almacen.tamano(keyAnterior)).toBeNull() // anterior limpiado
  })

  it('enlaza el fileKey de una lección PDF', async () => {
    const subida = await crearSubida({
      key: `lecciones/${leccionId}/m.pdf`,
      mimeType: 'application/pdf',
      purpose: 'PDF_LECCION',
      targetId: leccionId,
      contenido: PDF_MINIMO,
    })

    await procesarEscaneo(subida.id, { almacen, escanear: LIMPIO })

    const leccion = await prisma.lesson.findUniqueOrThrow({ where: { id: leccionId } })
    expect(leccion.fileKey).toBe(subida.r2Key)
  })
})

describe('procesarEscaneo — rechazos', () => {
  it('INFECTED: elimina el archivo, NO enlaza, notifica y audita', async () => {
    const leccionAntes = await prisma.lesson.findUniqueOrThrow({ where: { id: leccionId } })
    const subida = await crearSubida({
      key: `lecciones/${leccionId}/virus.pdf`,
      mimeType: 'application/pdf',
      purpose: 'PDF_LECCION',
      targetId: leccionId,
      contenido: PDF_MINIMO,
    })

    await procesarEscaneo(subida.id, { almacen, escanear: INFECTADO })

    const actualizada = await prisma.fileUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.scanStatus).toBe('INFECTED')
    expect(actualizada.scanResult).toBe('Win.Test.EICAR_HDB-1')

    expect(await almacen.tamano(subida.r2Key)).toBeNull() // eliminado
    const leccion = await prisma.lesson.findUniqueOrThrow({ where: { id: leccionId } })
    expect(leccion.fileKey).toBe(leccionAntes.fileKey) // sin cambios

    const aviso = await prisma.notification.findFirst({
      where: { userId: USUARIO_ID, type: 'ARCHIVO_RECHAZADO' },
    })
    expect(aviso).not.toBeNull()

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `FileUpload:${subida.id}`, action: 'DELETE_FILE' },
    })
    expect(auditoria).not.toBeNull()
  })

  it('ERROR por magic bytes: contenido PNG declarado como PDF', async () => {
    const subida = await crearSubida({
      key: `lecciones/${leccionId}/falso.pdf`,
      mimeType: 'application/pdf',
      purpose: 'PDF_LECCION',
      targetId: leccionId,
      contenido: PNG_MINIMO, // contenido real: PNG
    })

    const escaner = vi.fn()
    await procesarEscaneo(subida.id, { almacen, escanear: escaner })

    const actualizada = await prisma.fileUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.scanStatus).toBe('ERROR')
    expect(actualizada.scanResult).toMatch(/^MIME_NO_COINCIDE/)
    expect(escaner).not.toHaveBeenCalled() // ni se llegó al antivirus
    expect(await almacen.tamano(subida.r2Key)).toBeNull()
  })

  it('ERROR si el objeto nunca llegó al almacén', async () => {
    const subida = await crearSubida({
      key: `lecciones/${leccionId}/fantasma.pdf`,
      mimeType: 'application/pdf',
      purpose: 'PDF_LECCION',
      targetId: leccionId,
      // sin contenido — no se guarda nada
    })

    await procesarEscaneo(subida.id, { almacen, escanear: vi.fn() })

    const actualizada = await prisma.fileUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.scanStatus).toBe('ERROR')
    expect(actualizada.scanResult).toBe('ARCHIVO_FALTANTE')
  })

  it('es idempotente: una subida ya procesada no se reescanea', async () => {
    const subida = await crearSubida({
      key: `lecciones/${leccionId}/ya.pdf`,
      mimeType: 'application/pdf',
      purpose: 'PDF_LECCION',
      targetId: leccionId,
      contenido: PDF_MINIMO,
    })
    await prisma.fileUpload.update({
      where: { id: subida.id },
      data: { scanStatus: 'CLEAN' },
    })

    const escaner = vi.fn()
    await procesarEscaneo(subida.id, { almacen, escanear: escaner })
    expect(escaner).not.toHaveBeenCalled()
  })

  it('ERROR si el objetivo fue eliminado durante el escaneo', async () => {
    const cursoEfimero = await prisma.course.create({
      data: {
        title: 'Curso efímero',
        description: 'Se elimina antes de terminar el escaneo.',
        category: 'Pruebas',
        instructorId: USUARIO_ID,
      },
    })
    const subida = await crearSubida({
      key: `cursos/${cursoEfimero.id}/thumbnail/x.png`,
      mimeType: 'image/png',
      purpose: 'THUMBNAIL_CURSO',
      targetId: cursoEfimero.id,
      contenido: PNG_MINIMO,
    })
    await prisma.course.delete({ where: { id: cursoEfimero.id } })

    await procesarEscaneo(subida.id, { almacen, escanear: LIMPIO })

    const actualizada = await prisma.fileUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.scanStatus).toBe('ERROR')
    expect(actualizada.scanResult).toBe('OBJETIVO_INEXISTENTE')
    expect(await almacen.tamano(subida.r2Key)).toBeNull()
  })
})
