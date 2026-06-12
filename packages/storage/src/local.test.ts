// Tests unitarios del almacén local (mock de R2) — disco temporal, sin servicios.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AlmacenLocal } from './local.js'
import { verificarFirmaLectura, verificarFirmaSubida } from './firmas.js'

const SECRETO = 'secreto-de-prueba'
let directorio: string
let almacen: AlmacenLocal

beforeAll(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'amatla-almacen-'))
  almacen = new AlmacenLocal({
    directorio,
    urlBase: 'http://localhost:3000/api/almacen-dev',
    secreto: SECRETO,
  })
})

afterAll(async () => {
  await rm(directorio, { recursive: true, force: true })
})

describe('guardar / leer / tamano / eliminar', () => {
  it('hace el roundtrip completo de un objeto', async () => {
    const datos = Buffer.from('contenido de prueba — acentos y ñ')
    await almacen.guardar('cursos/abc/thumbnail/x.png', datos)

    expect(await almacen.tamano('cursos/abc/thumbnail/x.png')).toBe(datos.length)
    expect((await almacen.leer('cursos/abc/thumbnail/x.png')).equals(datos)).toBe(true)

    await almacen.eliminar('cursos/abc/thumbnail/x.png')
    expect(await almacen.tamano('cursos/abc/thumbnail/x.png')).toBeNull()
  })

  it('tamano devuelve null para objetos inexistentes', async () => {
    expect(await almacen.tamano('no/existe.pdf')).toBeNull()
  })

  it('eliminar un objeto inexistente no lanza', async () => {
    await expect(almacen.eliminar('no/existe.pdf')).resolves.toBeUndefined()
  })
})

describe('protección contra path traversal', () => {
  it.each(['../fuera.txt', 'a/../../fuera.txt', '/absoluta.txt', 'a\\b.txt', '.oculto'])(
    'rechaza la key %s',
    async (key) => {
      await expect(almacen.guardar(key, Buffer.from('x'))).rejects.toThrow(/inválida|raíz/)
    },
  )
})

describe('URLs firmadas de subida', () => {
  it('genera una URL verificable con los mismos parámetros', () => {
    const { url, expiraEn } = almacen.urlSubida('lecciones/l1/doc.pdf', {
      mimeType: 'application/pdf',
      maxBytes: 1024,
    })
    expect(expiraEn.getTime()).toBeGreaterThan(Date.now())

    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/api/almacen-dev/lecciones/l1/doc.pdf')
    const exp = Number(parsed.searchParams.get('exp'))
    const max = Number(parsed.searchParams.get('max'))
    const ct = parsed.searchParams.get('ct')!
    const firma = parsed.searchParams.get('firma')!

    expect(almacen.verificarSubida('lecciones/l1/doc.pdf', { exp, max, ct }, firma)).toBe(true)
  })

  it('rechaza la firma si se altera cualquier parámetro', () => {
    const { url } = almacen.urlSubida('lecciones/l1/doc.pdf', {
      mimeType: 'application/pdf',
      maxBytes: 1024,
    })
    const parsed = new URL(url)
    const exp = Number(parsed.searchParams.get('exp'))
    const firma = parsed.searchParams.get('firma')!

    // Cambiar el límite de tamaño invalida la firma
    expect(
      almacen.verificarSubida('lecciones/l1/doc.pdf', { exp, max: 999999, ct: 'application/pdf' }, firma),
    ).toBe(false)
    // Cambiar la key invalida la firma
    expect(
      almacen.verificarSubida('lecciones/OTRA/doc.pdf', { exp, max: 1024, ct: 'application/pdf' }, firma),
    ).toBe(false)
    // Cambiar el content-type invalida la firma
    expect(
      almacen.verificarSubida('lecciones/l1/doc.pdf', { exp, max: 1024, ct: 'image/png' }, firma),
    ).toBe(false)
  })

  it('rechaza firmas expiradas', () => {
    const exp = Math.floor(Date.now() / 1000) - 10
    // Firma matemáticamente válida pero vencida
    const firmaValida = almacen.urlSubida('a/b.pdf', { mimeType: 'application/pdf', maxBytes: 10 })
    const firma = new URL(firmaValida.url).searchParams.get('firma')!
    expect(
      verificarFirmaSubida(SECRETO, 'a/b.pdf', { exp, max: 10, ct: 'application/pdf' }, firma),
    ).toBe(false)
  })
})

describe('URLs firmadas de lectura', () => {
  it('genera y verifica; el TTL por defecto respeta el máximo de 30 min', () => {
    const { url, expiraEn } = almacen.urlLectura('cursos/c1/thumbnail/t.png')
    // Regla de seguridad #10: TTL máximo 30 minutos
    expect(expiraEn.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000)

    const parsed = new URL(url)
    const exp = Number(parsed.searchParams.get('exp'))
    const firma = parsed.searchParams.get('firma')!
    expect(almacen.verificarLectura('cursos/c1/thumbnail/t.png', { exp }, firma)).toBe(true)
    expect(almacen.verificarLectura('cursos/c1/thumbnail/OTRO.png', { exp }, firma)).toBe(false)
  })

  it('rechaza lecturas expiradas', () => {
    const exp = Math.floor(Date.now() / 1000) - 1
    expect(verificarFirmaLectura(SECRETO, 'x.png', { exp }, 'cualquiera')).toBe(false)
  })
})
