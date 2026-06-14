import { Phone } from 'lucide-react'

// Footer de apoyo global — vive en el shell de la plataforma (C2), no en cada
// página. Franja discreta con teléfono de emergencia, nunca modal bloqueante.
// Fluye con el layout (static), no tapa contenido.
export function LineaAyuda() {
  return (
    <footer
      className="flex flex-wrap items-center gap-2 border-t border-borde bg-[#f0ede8] px-6 py-3 text-[13px] text-texto-suave"
      aria-label="Apoyo en momentos difíciles"
    >
      <Phone size={14} className="shrink-0 text-teal" aria-hidden="true" />
      <p>
        ¿Estás pasando por un momento difícil? Habla con tu terapeuta o llama a la Línea de la
        Vida:{' '}
        <span className="font-semibold text-brand-dark">800 911 2000</span> — disponible 24/7.
      </p>
    </footer>
  )
}
