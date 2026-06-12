// Clasificador de seguridad — puerta de entrada OBLIGATORIA antes de toda llamada a Claude.
// Si detecta crisis: bloquear la IA, marcar AiSession.riskFlagged, notificar al INSTRUCTOR
// y registrar en AuditLog con action 'CRISIS_DETECTED' (flujo definido en el prompt maestro).

// Rango unicode de marcas diacríticas combinantes (U+0300 a U+036F)
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/**
 * Normaliza el mensaje para que los patrones no dependan de mayúsculas ni acentos:
 * "IDEACIÓN" → "ideacion". Los estudiantes escriben con y sin tildes.
 */
function normalize(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase()
}

// Palabras clave y patrones de crisis — lista NO exhaustiva.
// IMPORTANTE: ampliar y validar con el cliente clínico (DBT.Amatla).
// Los patrones se evalúan sobre texto normalizado (minúsculas, sin acentos).
const CRISIS_PATTERNS = [
  /suicid[oai]/,
  /quitarme la vida/,
  /no quiero seguir viviendo/,
  /hacerme dano/,
  /autolesion/,
  /cortarme/,
  /pastillas para morir/,
  /no vale la pena vivir/,
  /ideacion/,
  /plan para morir/,
  /me quiero matar/,
  /matarme/,
  /acabar con mi vida/,
]

const MEDICAL_ADVICE_PATTERNS = [
  /que medicamento/,
  /cuantos miligramos/,
  /puedo tomar/,
  /diagnostico/,
  /tengo .*trastorno/,
]

export type SafetyResult =
  | { safe: true }
  | { safe: false; reason: 'CRISIS' | 'MEDICAL_ADVICE'; message: string }

/**
 * Clasifica un mensaje del usuario ANTES de enviarlo a Claude.
 * La crisis tiene prioridad sobre el consejo médico si ambos aparecen.
 */
export function classifyMessage(userMessage: string): SafetyResult {
  const normalized = normalize(userMessage)

  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(normalized)) {
      return { safe: false, reason: 'CRISIS', message: 'crisis_detected' }
    }
  }
  for (const pattern of MEDICAL_ADVICE_PATTERNS) {
    if (pattern.test(normalized)) {
      return { safe: false, reason: 'MEDICAL_ADVICE', message: 'medical_advice_requested' }
    }
  }
  return { safe: true }
}
