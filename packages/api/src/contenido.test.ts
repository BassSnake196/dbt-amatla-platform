// Tests del sanitizado de contenido enriquecido (regla #13) y de la resolución
// de imágenes embebidas por data-key (regla #10). No tocan la BD.

import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { AlmacenLocal } = await import('@amatla/storage')
const { __setAlmacen } = await import('./almacen.js')
const { sanitizarHtml, sanitizarPresentacion } = await import('./sanitize.js')
const { resolverImagenesContenido } = await import('./contenido.js')

beforeAll(async () => {
  const directorio = await mkdtemp(join(tmpdir(), 'amatla-contenido-'))
  __setAlmacen(
    new AlmacenLocal({ directorio, urlBase: 'http://localhost:3000/api/almacen-dev', secreto: 'secreto-test' }),
  )
})

afterAll(() => {
  __setAlmacen(null)
})

describe('sanitizarHtml (lecciones TEXT)', () => {
  it('conserva imágenes con data-key y elimina scripts/handlers', () => {
    const sucio =
      '<p>Hola</p><img src="https://x/y.png" data-key="cursos/c1/contenido/a.png" alt="dib">' +
      '<script>alert(1)</script><img src="x" onerror="alert(1)">'
    const limpio = sanitizarHtml(sucio)
    expect(limpio).toContain('data-key="cursos/c1/contenido/a.png"')
    expect(limpio).toContain('alt="dib"')
    expect(limpio).not.toContain('<script')
    expect(limpio).not.toContain('onerror')
  })

  it('no permite iframes en lecciones', () => {
    const limpio = sanitizarHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>')
    expect(limpio).not.toContain('<iframe')
  })
})

describe('sanitizarPresentacion', () => {
  it('permite iframe de YouTube/Vimeo', () => {
    const yt = sanitizarPresentacion('<iframe src="https://www.youtube.com/embed/abc"></iframe>')
    expect(yt).toContain('<iframe')
    expect(yt).toContain('youtube.com/embed/abc')
    const vimeo = sanitizarPresentacion('<iframe src="https://player.vimeo.com/video/123"></iframe>')
    expect(vimeo).toContain('player.vimeo.com/video/123')
  })

  it('elimina iframe de hosts no permitidos', () => {
    const limpio = sanitizarPresentacion('<iframe src="https://evil.example/x"></iframe>')
    expect(limpio).not.toContain('<iframe')
  })

  it('elimina scripts aunque permita iframe', () => {
    const limpio = sanitizarPresentacion('<script>alert(1)</script><iframe src="https://www.youtube.com/embed/x"></iframe>')
    expect(limpio).not.toContain('<script')
    expect(limpio).toContain('<iframe')
  })
})

describe('resolverImagenesContenido', () => {
  it('re-firma el src de cada img con data-key', () => {
    const html = '<p>t</p><img src="https://caduca/vieja.png" data-key="cursos/c1/contenido/a.png">'
    const resuelto = resolverImagenesContenido(html)
    expect(resuelto).not.toContain('https://caduca/vieja.png')
    expect(resuelto).toContain('data-key="cursos/c1/contenido/a.png"')
    // URL firmada del almacén mock
    expect(resuelto).toMatch(/src="http:\/\/localhost:3000\/api\/almacen-dev\/[^"]*"/)
  })

  it('deja intacto el HTML sin imágenes', () => {
    const html = '<p>solo texto</p>'
    expect(resolverImagenesContenido(html)).toBe(html)
  })
})
