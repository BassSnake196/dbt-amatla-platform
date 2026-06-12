// Unit tests del pipeline de seguridad — mensajes de crisis, médicos y normales.
// Obligación ética: ante ideación suicida la plataforma SIEMPRE debe escalar al terapeuta.

import { describe, expect, it } from 'vitest'
import { classifyMessage } from './classifier.js'
import { CRISIS_RESPONSE, MEDICAL_ADVICE_RESPONSE, MANDATORY_SYSTEM_PROMPT } from './index.js'

describe('classifyMessage — mensajes de crisis', () => {
  const mensajesDeCrisis = [
    'He pensado en el suicidio últimamente',
    'quiero quitarme la vida',
    'No quiero seguir viviendo así',
    'a veces pienso en hacerme daño',
    'tengo marcas de autolesión',
    'pensé en cortarme otra vez',
    'cuántas pastillas para morir se necesitan',
    'siento que no vale la pena vivir',
    'mi terapeuta dice que tengo ideación',
    'tengo un plan para morir',
    'me quiero matar',
    'pienso en matarme',
    'quiero acabar con mi vida',
  ]

  it.each(mensajesDeCrisis)('bloquea: "%s"', (mensaje) => {
    expect(classifyMessage(mensaje)).toEqual({
      safe: false,
      reason: 'CRISIS',
      message: 'crisis_detected',
    })
  })

  it('detecta crisis sin importar mayúsculas', () => {
    expect(classifyMessage('QUIERO QUITARME LA VIDA').safe).toBe(false)
  })

  it('detecta crisis escrita sin acentos', () => {
    expect(classifyMessage('tengo ideacion suicida')).toEqual({
      safe: false,
      reason: 'CRISIS',
      message: 'crisis_detected',
    })
  })

  it('detecta crisis escrita con acentos', () => {
    expect(classifyMessage('el médico habló de ideación')).toEqual({
      safe: false,
      reason: 'CRISIS',
      message: 'crisis_detected',
    })
  })

  it('la crisis tiene prioridad sobre el consejo médico', () => {
    const resultado = classifyMessage('qué medicamento sirve si pienso en suicidio')
    expect(resultado).toEqual({ safe: false, reason: 'CRISIS', message: 'crisis_detected' })
  })
})

describe('classifyMessage — consejo médico', () => {
  const mensajesMedicos = [
    '¿Qué medicamento me recomiendas para la ansiedad?',
    '¿Cuántos miligramos de sertralina debería usar?',
    '¿Puedo tomar esto junto con mi tratamiento?',
    'dame un diagnóstico por favor',
    'creo que tengo un trastorno límite',
  ]

  it.each(mensajesMedicos)('bloquea: "%s"', (mensaje) => {
    expect(classifyMessage(mensaje)).toEqual({
      safe: false,
      reason: 'MEDICAL_ADVICE',
      message: 'medical_advice_requested',
    })
  })
})

describe('classifyMessage — mensajes normales de estudio', () => {
  const mensajesNormales = [
    '¿Qué es la regulación emocional en DBT?',
    'Explícame el módulo de apertura radical',
    '¿Puedes resumir la lección 3?',
    'No entendí la diferencia entre sobrecontrol y subcontrol',
    '¿Cuándo es la próxima sesión en vivo?',
    'Hola, buenos días',
  ]

  it.each(mensajesNormales)('permite: "%s"', (mensaje) => {
    expect(classifyMessage(mensaje)).toEqual({ safe: true })
  })

  it('permite el string vacío', () => {
    expect(classifyMessage('')).toEqual({ safe: true })
  })
})

describe('respuestas estáticas y system prompt', () => {
  it('la respuesta de crisis incluye la Línea de la Vida', () => {
    expect(CRISIS_RESPONSE).toContain('800 911 2000')
    expect(CRISIS_RESPONSE).toContain('terapeuta')
  })

  it('la respuesta médica redirige al terapeuta', () => {
    expect(MEDICAL_ADVICE_RESPONSE).toContain('terapeuta')
  })

  it('el system prompt obligatorio mantiene las restricciones clave', () => {
    expect(MANDATORY_SYSTEM_PROMPT).toContain('No eres terapeuta')
    expect(MANDATORY_SYSTEM_PROMPT).toContain('800 911 2000')
    expect(MANDATORY_SYSTEM_PROMPT).toContain('español de México')
  })
})
