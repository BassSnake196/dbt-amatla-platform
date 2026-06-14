# 🤖 Sistema Multi-Agente — DBT.Amatla E-Learning
> Copia este bloque al inicio de cada sesión de Claude Code, ANTES del prompt maestro.
> Propósito: maximizar trabajo por token usando una jerarquía de modelos.

---

## ¿Qué es este sistema y por qué existe?

Claude Code puede invocar subagentes (con `claude -p` o via la API de Anthropic)
para delegar trabajo de escritura/ejecución a modelos más baratos, reservando el
modelo más potente para decisiones arquitectónicas y revisión.

La jerarquía tiene tres niveles:

```
┌─────────────────────────────────────────────────────────────┐
│  NIVEL 1 — ORQUESTADOR (tú, Opus 4.8)                      │
│  • Lee contexto, planifica, toma decisiones de arquitectura  │
│  • Redacta los prompts de subtarea para los ejecutores       │
│  • Revisa y aprueba el output antes de hacer commit          │
│  • Nunca escribe código de implementación directamente       │
└──────────────────────────┬──────────────────────────────────┘
                           │ delega
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ NIVEL 2      │  │ NIVEL 2      │  │ NIVEL 2      │
│ EJECUTOR A   │  │ EJECUTOR B   │  │ EJECUTOR C   │
│ (Sonnet 4.6) │  │ (Sonnet 4.6) │  │ (Haiku 4.5)  │
│ Código nuevo │  │ Tests/smoke  │  │ Ediciones    │
│ componentes  │  │ verificación │  │ menores/lint │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Reglas del orquestador (Opus 4.8 — TÚ)

1. **Lee primero, planifica después.** Antes de delegar cualquier subtarea, lee los
   archivos clave del repo. Nunca confíes en lo que este prompt dice sobre el código;
   VERIFICA en el repo. La fuente de verdad es el repo.

2. **Una subtarea a la vez.** Lanza un subagente, espera su output completo, revísalo
   y decide si proceder o corregir. No lances dos subagentes en paralelo sobre el mismo
   árbol de archivos (condición de carrera).

3. **Tú redactas el prompt de subtarea.** El prompt debe incluir:
   - Rol: quién es el ejecutor y qué nivel de decisión tiene (ninguno).
   - Contexto mínimo necesario (no el prompt maestro completo, solo lo relevante).
   - Archivos a leer antes de escribir.
   - Output esperado: ruta exacta del archivo, formato, restricciones.
   - Qué NO hacer (p. ej. "no cambies el schema").

4. **Tú haces la revisión final.** Revisa el diff del ejecutor:
   - ¿Hay `any` implícito? ¿Importaciones rotas? ¿Falta `"use client"` o sobra?
   - ¿El ejecutor tocó archivos que no debía?
   - ¿Los tests nuevos prueban el comportamiento correcto?
   Si hay errores, los corriges tú o relanzas el ejecutor con correcciones.

5. **Tú haces el commit.** El ejecutor no hace commit. Cuando el output esté aprobado,
   tú haces `git add` + `git commit` con el mensaje en Conventional Commits.

6. **Tú actualizas STATUS.md.** Al cerrar cada tarea, añade el ADR correspondiente.

---

## Cuándo usar cada nivel

| Situación | Modelo | Por qué |
|-----------|--------|---------|
| Leer contexto del proyecto, planificar | Opus 4.8 | Necesita comprensión profunda |
| Decidir arquitectura, schema, seguridad | Opus 4.8 | Alto costo de error |
| Escribir un componente nuevo (> 80 líneas) | Sonnet 4.6 | Buena calidad, menor costo |
| Escribir tests de integración nuevos | Sonnet 4.6 | Lógica moderada |
| Smoke test / verificación HTTP | Sonnet 4.6 | Sigue un patrón conocido |
| Añadir `loading.tsx`, editar un import | Haiku 4.5 | Cambio mecánico, bajo riesgo |
| Refactor de un archivo ya existente | Haiku 4.5 | Patrón claro, cambio acotado |
| Revisar diff antes de commit | Opus 4.8 | Requiere criterio |
| Actualizar STATUS.md / ADR | Opus 4.8 | Requiere síntesis del contexto |

---

## Cómo invocar un subagente desde Claude Code

```bash
# Subagente Sonnet — escribir un componente
claude -p "$(cat .claude/subtask-quiz-estudiante.md)" \
  --model claude-sonnet-4-6 \
  --output-format text

# Subagente Haiku — edición menor
claude -p "$(cat .claude/subtask-loading.md)" \
  --model claude-haiku-4-5-20251001 \
  --output-format text
```

Guarda los prompts de subtarea en `.claude/` (crear el directorio si no existe).
No los comitas al repo (añadir `.claude/subtask-*.md` al `.gitignore`).

---

## Plantilla de prompt de subtarea (para que el orquestador la llene)

```markdown
## ROL
Eres un ejecutor de código senior en TypeScript/Next.js 15. Tu único trabajo es
implementar exactamente lo que se describe. NO tomes decisiones de arquitectura.
Si algo no está claro, usa el patrón más conservador ya existente en el repo.

## CONTEXTO DEL PROYECTO (solo lo relevante para esta subtarea)
- Monorepo: Turborepo. Stack: Next.js 15 App Router + tRPC + Prisma + PostgreSQL.
- Paleta de marca: naranja #F5A623, teal #2E7D6B, crema #F9EDD5, verde noche #1A3A35.
- TypeScript strict. Sin `any` implícito. Server Components por defecto; `"use client"`
  solo si hay interactividad real.
- Rendimiento: toda ruta nueva lleva `loading.tsx`. Toda acción async: spinner con
  `useTransition` + `Loader2`.
- Comentarios de lógica de negocio en español.

## ARCHIVOS A LEER ANTES DE ESCRIBIR
Lee estos archivos y úsalos como referencia de patrón:
- [LISTA LOS ARCHIVOS RELEVANTES]

## TU TAREA
[DESCRIPCIÓN PRECISA — qué crear, en qué ruta, qué debe hacer]

## OUTPUT ESPERADO
- Archivo: `[ruta exacta]`
- Si necesitas más de un archivo: lista todos.
- NO modifiques ningún otro archivo.
- NO hagas commit.
- NO cambies el schema de Prisma.
- NO instales dependencias nuevas sin notificarlo explícitamente.

## RESTRICCIONES ESPECÍFICAS
[LO QUE NO DEBE TOCAR]
```

---

## Flujo de trabajo por tarea (ejemplo: tarea 4.7 Quiz UI estudiante)

```
1. ORQUESTADOR lee:
   - packages/api/src/routers/quiz.ts          (qué procedures existen)
   - apps/web/src/acciones/estudiante.ts        (patrón de server actions)
   - apps/web/src/components/cursos/reproductor-video.tsx (patrón cliente)
   - apps/web/src/app/(plataforma)/cursos/[id]/lecciones/[leccionId]/page.tsx
     (dónde está el placeholder QUIZ)

2. ORQUESTADOR redacta subtask-4.7a.md:
   "Crea quiz-estudiante.tsx (client component). Lee [archivos]. El componente
   recibe {preguntas, enrollmentId, leccionId, passingScore}. Muestra radios A/B/C/D.
   Llama enviarIntentoAction. Muestra feedback por pregunta post-envío. useTransition
   + Loader2 en submit. No implementes la server action todavía."

3. EJECUTOR Sonnet 4.6 escribe quiz-estudiante.tsx.

4. ORQUESTADOR revisa el output:
   - ¿Tipado correcto? ¿Sin any?
   - ¿Las respuestas correctas NO viajan al cliente antes del envío?
   - ¿Hay spinner en submit?
   - ¿El feedback muestra correcta vs elegida + explicación?

5. ORQUESTADOR redacta subtask-4.7b.md:
   "Crea acciones/quiz-estudiante.ts con enviarIntentoAction y miIntentoAction.
   Reutiliza el patrón de acciones/estudiante.ts. No cambies el router tRPC."

6. EJECUTOR Sonnet 4.6 escribe las server actions.

7. ORQUESTADOR revisa + integra en page.tsx (edición pequeña → puede ser Haiku
   o el propio Orquestador si es < 10 líneas).

8. EJECUTOR Sonnet 4.6 escribe el smoke test (dev-login + curl).

9. ORQUESTADOR revisa, aprueba, hace commit:
   git commit -m "feat: quiz UI estudiante (formulario, feedback, reintento) [4.7]"

10. ORQUESTADOR actualiza STATUS.md con el ADR.
```

---

## GOTCHAs que aplican SIEMPRE (el ejecutor debe conocerlos)

Incluye esto en cada prompt de subtarea si el ejecutor tocará archivos del router:

```
GOTCHA — después de cambiar cualquier router de @amatla/api:
  npx turbo run build --filter=@amatla/api
  (si no, el dev de Next usa el dist viejo → "procedure not found" → 404)

GOTCHA — prisma migrate/generate falla con EPERM en Windows si el dev de
  Next está corriendo. No ejecutes migraciones; avísame si necesitas una.

GOTCHA — respuestas correctas del quiz NUNCA al estudiante antes del envío.
  Usa el procedure `quiz.preguntasEstudiante` (no `quiz.preguntas`).

GOTCHA — no mezcles next build y next dev sobre el mismo .next.
```

---

## Ahora lee el prompt maestro y el prompt de sesión

Después de asimilar este sistema de jerarquía:
1. Lee `protocoloia.md` (reglas operacionales).
2. Lee `prompt-maestrp.md` (arquitectura, fases, stack).
3. Lee `STATUS.md` completo (ADRs, estado real).
4. Lee `PROMPT-NUEVA-SESION.md` (tarea actual: 4.7 Quiz UI estudiante).

⚠️ Verifica el código antes de actuar. La fuente de verdad es el repo.