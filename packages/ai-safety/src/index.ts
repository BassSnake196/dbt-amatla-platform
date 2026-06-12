// @amatla/ai-safety — pipeline de clasificación previo a toda llamada a Claude.
// Flujo obligatorio (regla de desarrollo #7):
//   1. classifyMessage(userInput)
//   2. Si !safe → respuesta estática + AiSession.riskFlagged = true
//                + Notification al INSTRUCTOR + AuditLog 'CRISIS_DETECTED'
//   3. Si safe  → llamada a Claude con MANDATORY_SYSTEM_PROMPT

export { classifyMessage, type SafetyResult } from './classifier.js'
export { CRISIS_RESPONSE, MEDICAL_ADVICE_RESPONSE } from './responses.js'
export { MANDATORY_SYSTEM_PROMPT } from './system-prompt.js'
