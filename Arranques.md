# 🚀 ARRANQUE — Sesión 8 · DBT.Amatla E-Learning
> Copia TODO este bloque al iniciar Claude Code. Lee cada sección en el orden indicado.
> No omitas ninguna. No actúes hasta llegar a "TU TAREA".

---

## PASO 1 — Lee los archivos del repo (en este orden)

```
1. protocoloia.md           → tus reglas operacionales (estado en STATUS.md, commit por feature)
2. prompt-maestrp.md        → arquitectura completa (stack, schema, reglas de desarrollo)
3. STATUS.md                → estado REAL y ADRs; léelo COMPLETO, especialmente los ADRs
```

⚠️ **La fuente de verdad es el repo.** Lo que este prompt afirme sobre el código es
orientación, no garantía. Verifica antes de actuar.

---

## PASO 2 — Sistema de trabajo: jerarquía de agentes

Trabajas como **orquestador**. Tu rol tiene dos modos:

**Modo PLANIFICADOR** (tú solo, antes de delegar):
- Lees archivos, entiendes el contexto, detectas dependencias y riesgos.
- Redactas el prompt exacto que le darás al subagente ejecutor.
- Defines qué archivos leerá, qué creará, qué no tocará.

**Modo REVISOR** (tú solo, después de que el ejecutor entregue):
- Lees el diff completo.
- Verificas: tipado, seguridad, rendimiento, consistencia con patrones del repo.
- Apruebas o corriges antes de hacer commit.

**Subagentes ejecutores** (invocados con `claude -p` o via SDK):

| Cuándo usar | Modelo | Propósito |
|-------------|--------|-----------|
| Componente nuevo > 50 líneas | `claude-sonnet-4-6` | Implementación |
| Tests de integración | `claude-sonnet-4-6` | Verificación |
| Smoke test HTTP / curl | `claude-sonnet-4-6` | E2E ligero |
| Edición < 20 líneas, loading.tsx | `claude-haiku-4-5-20251001` | Cambio mecánico |
| Decisión arquitectónica, revisión final, commit, ADR | **tú (Opus 4.8)** | Criterio |

**Regla de oro:** el ejecutor nunca hace commit, nunca toca el schema, nunca instala
dependencias sin notificarlo. Tú decides y tú firmas cada cambio.

### Cómo invocar un subagente

```bash
# Guardar el prompt de subtarea en .claude/ (no commitear — añadir a .gitignore)
# Luego invocar:
claude -p "$(cat .claude/subtask-NOMBRE.md)" \
  --model claude-sonnet-4-6 \
  --output-format text
```

### Plantilla de prompt para subagentes (llénala antes de delegar)

```markdown
## ROL
Eres un ejecutor de código senior en TypeScript / Next.js 15.
Tu único trabajo: implementar exactamente lo descrito. Sin decisiones de arquitectura.
Ante ambigüedad: usa el patrón más conservador que ya exista en el repo.

## CONTEXTO (solo lo relevante)
- Monorepo Turborepo. Stack: Next.js 15 App Router + tRPC + Prisma 5 + PostgreSQL 16.
- TypeScript strict. Sin `any` implícito. Server Components por defecto.
- "use client" solo si hay interactividad real.
- Rendimiento: toda ruta nueva lleva `loading.tsx`. Toda acción async:
  spinner con `useTransition` + `Loader2`.
- Comentarios de lógica de negocio en español.
- Paleta: naranja #F5A623, teal #2E7D6B, crema #F9EDD5, verde noche #1A3A35.
- Convención de commits: Conventional Commits (feat/fix/test/chore/refactor).

## GOTCHAS OBLIGATORIOS
- Tras cambiar cualquier router de @amatla/api:
  `npx turbo run build --filter=@amatla/api`
  (si no, Next usa el dist viejo → "procedure not found").
- NO hagas migraciones de Prisma. Avísame si crees que necesitas una.
- Las respuestas correctas del quiz NUNCA al cliente antes del envío.
  Usa `quiz.preguntasEstudiante` (no `quiz.preguntas`).
- NO mezcles `next build` y `next dev` sobre el mismo `.next`.
- NO hagas commit.

## ARCHIVOS A LEER ANTES DE ESCRIBIR
[LISTA AQUÍ LOS ARCHIVOS CONCRETOS]

## TU TAREA
[DESCRIPCIÓN PRECISA]

## OUTPUT ESPERADO
- Archivos a crear: [RUTAS EXACTAS]
- Archivos a modificar: [RUTAS EXACTAS, solo los necesarios]
- No tocar nada más.
```

---

## PASO 3 — Estado actual del proyecto (verificado 2026-06-13, sesión 7)

**Fases 1–3 COMPLETAS. Fase 4 EN CURSO. 207 tests en verde.**

| Tarea | Estado |
|-------|--------|
| 4.1 Asignación de curso | ✅ |
| 4.2/4.3 Progreso secuencial + botón "Marcar como terminada" | ✅ |
| 4.4 Editor TEXT con Tiptap + sanitización server-side | ✅ |
| 4.5 Quiz backend (QuizQuestion / QuizAttempt / router quiz) | ✅ |
| 4.6 Quiz UI instructor (gestor preguntas dnd-kit + passingScore) | ✅ |
| **4.7 Quiz UI estudiante** | ⬅️ **TU TAREA** |
| 4.8 Panel de admin | pendiente |
| 4.9 Vista de progreso del estudiante para instructor | pendiente |

**Schema verificado:**
- `QuizQuestion`, `QuizAttempt` y `Lesson.passingScore` **YA EXISTEN** (migración `add_quiz`).
- `QuizAttempt` es `@@unique([enrollmentId, lessonId])` → un solo intento (el último) por
  inscripción+lección; `enviarIntento` lo sobrescribe.
- **No se necesita migración** para la tarea 4.7.

---

## PASO 4 — Cómo levantar el entorno (3 procesos obligatorios)

```bash
# 1. Docker (postgres / redis / pgadmin / clamav)
docker compose up -d
# Verificar antes de subir archivos:
docker compose ps   # STATUS = healthy en todos

# ⚠️ ClamAV: en el PRIMER arranque descarga firmas (cientos de MB).
# Hasta que esté healthy, uploads quedan en PENDING. El volumen persiste → solo 1 vez.

# 2. Dev server web (elige uno)
npm run dev -w @amatla/web              # webpack (más compatible)
npm run dev:turbo                       # Turbopack (más rápido; PDF ya funciona con polyfill)

# 3. Worker de media (OBLIGATORIO — sin él los jobs de escaneo nunca salen de PENDING)
npm run dev -w @amatla/worker-media

# 4. API Fastify (opcional — solo para curl directo)
npm run dev -w @amatla/api             # puerto 4000

# Login de desarrollo (pone cookie httpOnly de sesión)
http://localhost:3000/api/dev-login?como=instructora   # o estudiante / admin

# Seed de datos (bash, NO PowerShell — el pipe de PS corrompe acentos)
docker exec -i amatla-postgres psql -U amatla -d amatla_dev < packages/db/seed-dev.sql
# Usuarios seed: dev-instructor-1 (INSTRUCTOR), dev-student-1 (STUDENT), dev-admin-1 (SUPER_ADMIN)
```

---

## PASO 5 — TU TAREA: 4.7 Quiz UI del Estudiante

La página de lección del estudiante tiene un placeholder para `tipo === 'QUIZ'`
("El examen de esta lección estará disponible muy pronto"). Reemplázalo por la UI real.

**Archivo a editar:**
`apps/web/src/app/(plataforma)/cursos/[id]/lecciones/[leccionId]/page.tsx`

### Lo que debes construir

**1. Componente `quiz-estudiante.tsx`** (client component)
- Ruta sugerida: `apps/web/src/components/cursos/quiz-estudiante.tsx`
- Consume `quiz.preguntasEstudiante` (SIN respuesta correcta — regla de seguridad).
- Una opción A/B/C/D por pregunta (radio buttons).
- Bloquea el botón "Enviar" si hay preguntas sin responder.
- Al enviar: llama `quiz.enviarIntento` (score calculado en SERVIDOR).
- Muestra resultado: score, aprobado/reprobado, feedback por pregunta
  (opción elegida vs correcta + explicación si existe).
  La respuesta correcta es lícita revelarla DESPUÉS del envío.
- Si reprueba: botón "Intentar de nuevo" (el backend sobrescribe el intento).
- Si aprueba: lección completada (el backend ya marca `Progress.completedAt`) →
  llamar `router.refresh()` para que el índice muestre la ✓ y desbloquee la siguiente.
- Spinner (`Loader2` + `useTransition`) al enviar.

**2. Server actions** (en `acciones/quiz-estudiante.ts` o en `acciones/estudiante.ts`)
- `preguntasEstudianteAction(leccionId)` → llama `quiz.preguntasEstudiante`
- `enviarIntentoAction(leccionId, answers)` → llama `quiz.enviarIntento`
- `miIntentoAction(leccionId)` → llama `quiz.miIntento`

**3. Al reabrir la lección**
- Usa `quiz.miIntento` para mostrar el último resultado/feedback sin re-enviar.

**4. Requisito de rendimiento** (permanente, sin excepciones)
- La ruta ya tiene `loading.tsx` global. No agregar uno nuevo.
- El spinner en el submit es obligatorio (`useTransition` + `Loader2`).

### Archivos de referencia (léelos antes de delegar al ejecutor)

```
packages/api/src/routers/quiz.ts
  → procedures del estudiante: preguntasEstudiante, enviarIntento, miIntento

apps/web/src/acciones/estudiante.ts
  → patrón de server actions del estudiante

apps/web/src/components/instructor/gestor-quiz.tsx
  → patrón UI de quiz (formularios, estado, optimismo)

apps/web/src/components/cursos/boton-marcar-terminada.tsx
  → patrón useTransition + router.refresh()

apps/web/src/components/cursos/reproductor-video.tsx
  → patrón cliente con server actions + estado de carga

apps/web/src/app/(plataforma)/cursos/[id]/lecciones/[leccionId]/page.tsx
  → dónde está el placeholder QUIZ a reemplazar
```

### Flujo de ejecución sugerido para esta tarea

```
1. [PLANIFICADOR - tú] Lee los 6 archivos de referencia.
   Entiende exactamente qué procedures existen y qué devuelven.

2. [EJECUTOR - Sonnet] subtask-4.7a.md
   → Crea quiz-estudiante.tsx (solo el componente, sin server actions aún).
   → Muestra estado "cargando" si no hay intento previo y las preguntas están llegando.

3. [REVISOR - tú] Revisa el componente:
   - ¿Tipado correcto en todos los props?
   - ¿correctOption NUNCA visible antes del envío?
   - ¿Spinner en submit?
   - ¿Feedback con correcta vs elegida + explicación post-envío?
   - ¿router.refresh() al aprobar?

4. [EJECUTOR - Sonnet] subtask-4.7b.md
   → Crea las server actions en acciones/quiz-estudiante.ts

5. [EJECUTOR - Haiku] subtask-4.7c.md
   → Edita page.tsx: reemplaza el placeholder QUIZ por <QuizEstudiante .../>
     pasando los props correctos (ya resueltos en el server component).

6. [EJECUTOR - Sonnet] subtask-4.7d.md
   → Smoke test: dev-login como estudiante, curl a la lección QUIZ,
     verificar render 200 + envío de intento + score devuelto.

7. [REVISOR - tú] Revisa todo el diff final.

8. [PLANIFICADOR - tú] git commit + actualizar STATUS.md con el ADR.
```

---

## PASO 6 — Pendientes conocidos (NO trabajar a menos que el usuario lo pida)

### 🔴 Problema conocido — Video sin soporte Range requests
El mock dev `apps/web/src/app/api/stream-dev/[uid]/route.ts` no implementa
HTTP Range → el `<video>` no puede hacer seek y `player.currentTime = X` (salto
desde notas) no funciona. Fix: parsear header `Range`, responder 206 con
`Content-Range` / `Accept-Ranges: bytes`. En prod Cloudflare ya soporta Range.
**Tocar solo cuando se trabaje en video/notas.**

### 🟡 Pendiente menor — Dashboard del estudiante usa arte generativo CSS
Las cards de cursos muestran arte generativo en lugar del thumbnail real.
Tocar cuando el usuario lo pida.

### 🟡 Pendiente menor — Asignación de cursos solo por SQL
No hay UI de asignación disponible aún para el admin. Tocar en tarea 4.8.

---

## PASO 7 — GOTCHAs permanentes (aplican a cualquier tarea)

```
1. Cambiar cualquier router de @amatla/api → rebuild obligatorio:
   npx turbo run build --filter=@amatla/api

2. prisma migrate/generate con EPERM en Windows → detener todos los procesos
   node del proyecto antes de migrar/generar.

3. NO mezclar `next build` y `next dev` sobre el mismo .next.
   Si pasa: parar dev, borrar apps/web/.next, relevantar.

4. Las respuestas correctas del quiz NUNCA viajan al estudiante antes del envío.

5. Curl en Windows:
   - PowerShell 5.1 descarta el header Cookie → usar curl -b
   - Body JSON con acentos → usar --data-binary @archivo (no -d)
   - URLs en HTML: &amp; / en RSC: &
   - git commit -m con comillas dobles → rompe PowerShell 5.1;
     usar git commit -F - <<'EOF' ... EOF en bash

6. next dev --turbopack ignora la regla webpack de pdfjs → si necesitas
   probar el visor PDF, usa npm run dev (sin turbopack).
```

---

## Formato de cierre de tarea (protocolo)

Al terminar cada tarea, reporta exactamente así:

```
✅ Tarea [4.7] completada.
STATUS.md actualizado (ADR añadido).
Tests: [N] en verde.
Lo que sigue es [4.8 — Panel de admin].
¿Procedo?
```

---

*Sesión 8 · 2026-06-13 · Amatla E-Learning · Fase 4 en curso*