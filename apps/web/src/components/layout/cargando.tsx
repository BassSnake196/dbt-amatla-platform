import { Loader2 } from 'lucide-react'

// Estado de carga compartido. App Router lo muestra (vía loading.tsx) en cuanto
// empieza una navegación, sin esperar a que el server component termine sus
// queries — así el cambio de pantalla se siente inmediato.
export function Cargando({ mensaje = 'Cargando…' }: { mensaje?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-brand-secondary"
    >
      <Loader2 className="animate-spin" size={32} aria-hidden="true" />
      <p className="text-sm font-medium text-neutral-900/60">{mensaje}</p>
    </div>
  )
}
