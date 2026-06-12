// Tests de integración de procesarVideo — contra el Postgres local de
// docker-compose. El stream se inyecta como stub en memoria (DI) que
// registra las eliminaciones.

import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

process.env.DATABASE_URL ??= 'postgresql://amatla:amatla_dev@localhost:5432/amatla_dev'

const { prisma } = await import('@amatla/db')
const { procesarVideo } = await import('./video.js')

const USER_ID = 'test-worker-videos'

let eliminados: string[]
const stream = {
  eliminar: async (uid: string) => {
    eliminados.push(uid)
  },
}

let cursoId: string
let leccionId: string

function uidNuevo(): string {
  return randomUUID().replaceAll('-', '')
}

async function crearSubida(uid: string, lessonId: string) {
  return prisma.videoUpload.create({
    data: {
      uid,
      lessonId,
      uploadedBy: USER_ID,
      fileName: 'clase-test.mp4',
      sizeBytes: 1024,
    },
  })
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'worker-videos@test.dev', name: 'Worker Videos', role: 'INSTRUCTOR' },
  })
  const curso = await prisma.course.create({
    data: {
      title: 'Curso test worker video',
      description: 'Pruebas de procesarVideo.',
      category: 'Pruebas',
      instructorId: USER_ID,
      sections: {
        create: {
          title: 'Sección única',
          order: 1,
          lessons: {
            create: [
              { title: 'Video principal', order: 1, type: 'VIDEO' },
              { title: 'Otro video ya enlazado', order: 2, type: 'VIDEO', duration: 600 },
            ],
          },
        },
      },
    },
    include: { sections: { include: { lessons: { orderBy: { order: 'asc' } } } } },
  })
  cursoId = curso.id
  leccionId = curso.sections[0]!.lessons[0]!.id
})

beforeEach(async () => {
  eliminados = []
  // Estado limpio de la lección entre tests
  await prisma.lesson.update({ where: { id: leccionId }, data: { videoId: null, duration: null } })
})

afterAll(async () => {
  const subidas = await prisma.videoUpload.findMany({
    where: { uploadedBy: USER_ID },
    select: { id: true },
  })
  await prisma.auditLog.deleteMany({
    where: { resource: { in: subidas.map((s) => `VideoUpload:${s.id}`) } },
  })
  await prisma.videoUpload.deleteMany({ where: { uploadedBy: USER_ID } })
  await prisma.notification.deleteMany({ where: { userId: USER_ID } })
  await prisma.course.delete({ where: { id: cursoId } }).catch(() => {})
  await prisma.user.delete({ where: { id: USER_ID } }).catch(() => {})
  await prisma.$disconnect()
})

describe('procesarVideo — webhook ready', () => {
  it('enlaza videoId + duración, recalcula el total del curso y notifica', async () => {
    const uid = uidNuevo()
    const subida = await crearSubida(uid, leccionId)

    await procesarVideo({ uid, estado: 'ready', duracionSegundos: 754 }, { stream })

    const actualizada = await prisma.videoUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.status).toBe('READY')
    expect(actualizada.duration).toBe(754)

    const leccion = await prisma.lesson.findUniqueOrThrow({ where: { id: leccionId } })
    expect(leccion.videoId).toBe(uid)
    expect(leccion.duration).toBe(754)

    // 754 (esta lección) + 600 (la otra lección del curso)
    const curso = await prisma.course.findUniqueOrThrow({ where: { id: cursoId } })
    expect(curso.totalDuration).toBe(1354)

    const aviso = await prisma.notification.findFirst({
      where: { userId: USER_ID, type: 'VIDEO_LISTO' },
      orderBy: { createdAt: 'desc' },
    })
    expect(aviso).not.toBeNull()
    expect(eliminados).toHaveLength(0)
  })

  it('al reemplazar un video, elimina el anterior del stream', async () => {
    const uidViejo = uidNuevo()
    await prisma.lesson.update({
      where: { id: leccionId },
      data: { videoId: uidViejo, duration: 100 },
    })

    const uid = uidNuevo()
    await crearSubida(uid, leccionId)
    await procesarVideo({ uid, estado: 'ready', duracionSegundos: 300 }, { stream })

    const leccion = await prisma.lesson.findUniqueOrThrow({ where: { id: leccionId } })
    expect(leccion.videoId).toBe(uid)
    expect(eliminados).toEqual([uidViejo])
  })

  it('es idempotente: una subida ya procesada no se vuelve a tocar', async () => {
    const uid = uidNuevo()
    const subida = await crearSubida(uid, leccionId)
    await procesarVideo({ uid, estado: 'ready', duracionSegundos: 200 }, { stream })
    // Reintento de BullMQ con otra duración — no debe cambiar nada
    await procesarVideo({ uid, estado: 'ready', duracionSegundos: 999 }, { stream })

    const actualizada = await prisma.videoUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.duration).toBe(200)
  })
})

describe('procesarVideo — fallos', () => {
  it('webhook de error: marca ERROR, elimina el video, audita y notifica', async () => {
    const uid = uidNuevo()
    const subida = await crearSubida(uid, leccionId)

    await procesarVideo({ uid, estado: 'error', detalle: 'VIDEO_INVALIDO' }, { stream })

    const actualizada = await prisma.videoUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.status).toBe('ERROR')
    expect(actualizada.detail).toBe('VIDEO_INVALIDO')
    expect(eliminados).toEqual([uid])

    const leccion = await prisma.lesson.findUniqueOrThrow({ where: { id: leccionId } })
    expect(leccion.videoId).toBeNull()

    const auditoria = await prisma.auditLog.findFirst({
      where: { resource: `VideoUpload:${subida.id}`, action: 'DELETE_FILE' },
    })
    expect(auditoria).not.toBeNull()

    const aviso = await prisma.notification.findFirst({
      where: { userId: USER_ID, type: 'VIDEO_RECHAZADO' },
      orderBy: { createdAt: 'desc' },
    })
    expect(aviso).not.toBeNull()
  })

  it('lección eliminada durante el procesamiento → ERROR OBJETIVO_INEXISTENTE', async () => {
    const seccion = await prisma.section.findFirstOrThrow({ where: { courseId: cursoId } })
    const efimera = await prisma.lesson.create({
      data: { sectionId: seccion.id, title: 'Lección efímera', order: 99, type: 'VIDEO' },
    })
    const uid = uidNuevo()
    const subida = await crearSubida(uid, efimera.id)
    await prisma.lesson.delete({ where: { id: efimera.id } })

    await procesarVideo({ uid, estado: 'ready', duracionSegundos: 120 }, { stream })

    const actualizada = await prisma.videoUpload.findUniqueOrThrow({ where: { id: subida.id } })
    expect(actualizada.status).toBe('ERROR')
    expect(actualizada.detail).toBe('OBJETIVO_INEXISTENTE')
    expect(eliminados).toEqual([uid])
  })

  it('uid desconocido lanza (BullMQ reintenta)', async () => {
    await expect(
      procesarVideo({ uid: uidNuevo(), estado: 'ready', duracionSegundos: 10 }, { stream }),
    ).rejects.toThrow(/no existe/)
  })
})
