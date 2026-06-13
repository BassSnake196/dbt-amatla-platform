// Sanitización de HTML server-side (regla de seguridad #13): todo texto libre
// con formato que escribe un usuario pasa por aquí ANTES de persistir. Evita
// XSS almacenado (scripts, handlers on*, iframes, etc.).

import DOMPurify from 'isomorphic-dompurify'

// Allowlist alineada con lo que produce el editor Tiptap (StarterKit + Link):
// párrafos, encabezados, énfasis, listas, citas, código y enlaces.
const CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li', 'blockquote', 'a',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  // Solo esquemas seguros en enlaces (sin javascript:)
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  // Garantiza string de salida (no nodo del DOM)
  RETURN_DOM: false as const,
  RETURN_DOM_FRAGMENT: false as const,
}

/** Sanitiza HTML enriquecido de lecciones TEXT (y cualquier texto libre con formato). */
export function sanitizarHtml(html: string): string {
  return DOMPurify.sanitize(html, CONFIG)
}
