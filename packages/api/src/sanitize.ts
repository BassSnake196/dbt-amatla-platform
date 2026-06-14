// Sanitización de HTML server-side (regla de seguridad #13): todo texto libre
// con formato que escribe un usuario pasa por aquí ANTES de persistir. Evita
// XSS almacenado (scripts, handlers on*, iframes no permitidos, etc.).

import DOMPurify from 'isomorphic-dompurify'

// Etiquetas base que produce el editor Tiptap (StarterKit + Link + Image):
// párrafos, encabezados, énfasis, listas, citas, código, enlaces e imágenes.
// Las imágenes se guardan con `data-key` (el src firmado se resuelve al
// renderizar) — ver `resolverImagenesContenido`.
const TAGS_BASE = [
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'a',
  'img', 'figure', 'figcaption',
]

const ATTR_BASE = ['href', 'target', 'rel', 'src', 'alt', 'data-key']

const CONFIG = {
  ALLOWED_TAGS: TAGS_BASE,
  ALLOWED_ATTR: ATTR_BASE,
  // Solo esquemas seguros en enlaces/imágenes (sin javascript:). Las URLs
  // firmadas del almacén son absolutas http(s).
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  RETURN_DOM: false as const,
  RETURN_DOM_FRAGMENT: false as const,
}

/** Sanitiza HTML enriquecido de lecciones TEXT (texto + imágenes). */
export function sanitizarHtml(html: string): string {
  return DOMPurify.sanitize(html, CONFIG)
}

// Presentación del curso: igual que las lecciones + video embebido (iframe).
// El iframe solo se permite si su `src` apunta a un host de la allowlist; el
// host se valida con un hook porque `ALLOWED_URI_REGEXP` es global y no
// distingue por etiqueta.
const HOSTS_EMBED = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
])

const CONFIG_PRESENTACION = {
  ALLOWED_TAGS: [...TAGS_BASE, 'iframe'],
  ALLOWED_ATTR: [...ATTR_BASE, 'allow', 'allowfullscreen', 'frameborder', 'width', 'height'],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  // Permite el atributo `src` también en iframe (default DOMPurify ya lo hace
  // para iframe en ADD_TAGS, pero lo dejamos explícito vía ALLOWED_ATTR).
  RETURN_DOM: false as const,
  RETURN_DOM_FRAGMENT: false as const,
}

function esHostEmbedPermitido(src: string): boolean {
  try {
    return HOSTS_EMBED.has(new URL(src).host)
  } catch {
    return false
  }
}

/** Sanitiza la presentación enriquecida del curso (texto + imágenes + video embebido). */
export function sanitizarPresentacion(html: string): string {
  // Elimina cualquier iframe cuyo src no sea de un host de la allowlist.
  // El paquete no incluye la lib DOM, por eso se tipa el nodo de forma mínima.
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return
    const el = node as { getAttribute?(n: string): string | null; remove?(): void }
    const src = el.getAttribute?.('src') ?? ''
    if (!esHostEmbedPermitido(src)) el.remove?.()
  })
  try {
    return DOMPurify.sanitize(html, CONFIG_PRESENTACION)
  } finally {
    DOMPurify.removeHook('uponSanitizeElement')
  }
}
