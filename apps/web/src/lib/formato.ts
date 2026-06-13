// Helpers de formato para la UI — fechas siempre convertidas desde UTC
// a America/Mexico_City (la BD guarda UTC, la conversión es de la UI).

import { TIMEZONE } from '@amatla/shared'

/** Segundos → "3 h 30 min" / "45 min" / "2 h". */
export function formatearDuracion(segundos: number): string {
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.round((segundos % 3600) / 60)
  if (horas === 0) return `${minutos} min`
  if (minutos === 0) return `${horas} h`
  return `${horas} h ${minutos} min`
}

/** Segundos → timestamp de video "12:34" / "1:02:05". */
export function formatearTimestamp(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(seg).padStart(2, '0')}`
}

/** Partes de una fecha para el bloque estilo calendario y la hora local. */
export function partesFechaSesion(fecha: Date): {
  dia: string // "MIÉ"
  numero: string // "17"
  mes: string // "jun"
  hora: string // "18:00"
} {
  const fmt = (opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-MX', { timeZone: TIMEZONE, ...opciones }).format(fecha)
  return {
    dia: fmt({ weekday: 'short' }).replace('.', '').toUpperCase(),
    numero: fmt({ day: 'numeric' }),
    mes: fmt({ month: 'short' }).replace('.', ''),
    hora: fmt({ hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}
