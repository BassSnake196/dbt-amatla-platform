import { Phone } from 'lucide-react'

// Franja discreta de apoyo — principio de UI del prompt maestro:
// banner tenue con teléfono de emergencia, nunca modal bloqueante.
export function LineaAyuda() {
  return (
    <aside
      className="flex flex-wrap items-center gap-3 rounded-card border border-danger/20 bg-danger/5 px-5 py-4"
      aria-label="Apoyo en momentos difíciles"
    >
      <Phone size={18} className="shrink-0 text-danger" aria-hidden="true" />
      <p className="text-sm text-brand-dark">
        ¿Estás pasando por un momento difícil? Habla con tu terapeuta o llama a la{' '}
        <strong className="font-semibold">Línea de la Vida: 800 911 2000</strong> — disponible 24/7.
      </p>
    </aside>
  )
}
