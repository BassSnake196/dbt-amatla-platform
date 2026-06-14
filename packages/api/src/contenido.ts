// Resolución de imágenes embebidas en HTML (regla #10: nunca se guarda la URL
// firmada, solo el key). El editor inserta `<img data-key="..." src="...">`; al
// renderizar se re-firma el `src` a partir del `data-key` para que nunca se
// sirva una URL caducada desde BD. El HTML ya viene sanitizado (forma
// controlada), por eso basta una sustitución dirigida sobre cada etiqueta img.

import { obtenerAlmacen } from './almacen.js'

const IMG_TAG = /<img\b[^>]*>/gi
const DATA_KEY = /\bdata-key="([^"]+)"/i
const SRC_ATTR = /\s+src="[^"]*"/i

/**
 * Reemplaza el `src` de cada `<img data-key="KEY">` por una URL de lectura
 * firmada on-demand. Las imágenes sin `data-key` se dejan intactas.
 */
export function resolverImagenesContenido(html: string): string {
  if (!html.includes('data-key')) return html
  return html.replace(IMG_TAG, (tag) => {
    const m = DATA_KEY.exec(tag)
    if (!m) return tag
    const key = m[1]!
    const url = obtenerAlmacen().urlLectura(key).url
    const sinSrc = tag.replace(SRC_ATTR, '')
    return sinSrc.replace(/<img\b/i, `<img src="${url}"`)
  })
}
