// Extensiones Tiptap compartidas por el editor de lecciones TEXT y el de la
// presentación del curso.

import { Node, mergeAttributes } from '@tiptap/core'
import Image from '@tiptap/extension-image'

// Imagen que conserva `data-key` (regla #10): el src firmado se resuelve al
// renderizar server-side a partir del key del objeto en el almacén.
export const ImagenContenido = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-key': {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-key'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs['data-key'] ? { 'data-key': attrs['data-key'] as string } : {},
      },
    }
  },
})

// Convierte una URL de YouTube/Vimeo a su forma de *embed* (iframe). Devuelve
// null si no es un host soportado.
export function urlEmbed(url: string): string | null {
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  const host = u.host.replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1)
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname.startsWith('/embed/')) return `https://www.youtube.com${u.pathname}`
    const id = u.searchParams.get('v')
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (host === 'vimeo.com') {
    const id = u.pathname.split('/').filter(Boolean)[0]
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
  }
  if (host === 'player.vimeo.com') return u.toString()
  return null
}

// Nodo de video embebido: renderiza un iframe. El host se re-valida
// server-side en `sanitizarPresentacion` antes de persistir.
export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      frameborder: { default: '0' },
      allowfullscreen: { default: 'true' },
      allow: { default: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes)]
  },
})
