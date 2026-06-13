# 🚀 ARRANQUE DE SESIÓN — DBT.Amatla E-Learning (modelo multi-agente)
> Copia TODO este bloque al iniciar Claude Code. Es el ÚNICO prompt que necesitas pegar.
> Léelo entero y NO actúes hasta llegar a "TU TAREA". La fuente de verdad es el repo:
> lo que este prompt afirme sobre el código es orientación, VERIFÍCALO antes de actuar.

---

## 0) QUIÉN ERES — Orquestador de una jerarquía de agentes

Trabajas como **ORQUESTADOR (Opus 4.8)**. NO escribes código de implementación tú mismo:
planificas, redactas los prompts de subtarea, **revisas el diff**, **commiteas** y
**actualizas STATUS.md**. Delegas la escritura a **ejecutores** más baratos.

```
NIVEL 1 — ORQUESTADOR (tú, Opus 4.8)
   • Lee contexto · planifica · decide arquitectura/seguridad/schema
   • Redacta el prompt de cada subtarea · revisa el output · commitea · ADR
        │ delega (una subtarea a la vez)
        ▼
NIVEL 2 — EJECUTORES
   • Sonnet 4.6  → componentes nuevos, tests de integración, smoke tests
   • Haiku 4.5   → ediciones < 20 líneas, loading.tsx, imports, refactor acotado
```

**Reglas del orquestador (innegociables):**
1. **Lee primero, delega después.** Verifica los archivos reales antes de redactar una subtarea.
2. **Una subtarea a la vez.** Lanza un ejecutor, espera su output, revísalo, decide. Nunca dos
   ejecutores en paralelo sobre el mismo árbol de archivos.
3. **Tú redactas el prompt de subtarea** (usa la plantilla de abajo): rol sin decisión,
   contexto mínimo, archivos a leer, output exacto, qué NO tocar.
4. **Tú haces la revisión final del diff:** `any` implícito, imports rotos, `"use client"`
   sobrante/faltante, archivos tocados de más, tests que prueban lo correcto, seguridad.
5. **El ejecutor NUNCA:** hace commit, toca el schema de Prisma, corre migraciones, ni instala
   dependencias sin avisar. **Tú** firmas cada cambio (commit) y actualizas STATUS.md (ADR).

> Detalle completo del sistema multi-agente: **`Agentes.md`** (léelo si tienes dudas del flujo).

### Cómo invocar un ejecutor
```bash
# Guarda el prompt de subtarea en .claude/ (NO commitear → está/va en .gitignore)
claude -p "$(cat .claude/subtask-NOMBRE.md)" --model claude-sonnet-4-6 --output-format text
# Ediciones menores:
claude -p "$(cat .claude/subtask-NOMBRE.md)" --model claude-haiku-4-5-20251001 --output-format text
```
(Dentro de Claude Code también puedes usar la herramienta de subagentes/Task con el mismo
prompt y `subagent_type`; el contrato es idéntico: el ejecutor solo implementa.)

### Plantilla de prompt de subtarea (llénala antes de delegar)
```markdown
## ROL
Eres un ejecutor de código senior en TypeScript/Next.js 15. Implementa EXACTAMENTE lo
descrito. NO tomes decisiones de arquitectura. Ante ambigüedad, usa el patrón más
conservador que YA exista en el repo.

## CONTEXTO (solo lo relevante a esta subtarea)
- Monorepo Turborepo. Next.js 15 App Router + tRPC + Prisma 5 + PostgreSQL 16.
- TS strict, sin `any` implícito. Server Components por defecto; "use client" solo si hay
  interactividad real. Comentarios de lógica de negocio en español.
- Rendimiento (obligatorio): toda ruta nueva lleva loading.tsx; toda acción async muestra
  spinner (`useTransition` + `Loader2`). Reutiliza el componente `Cargando`.
- Paleta: naranja #F5A623, teal #2E7D6B, crema #F9EDD5, verde noche #1A3A35.

## GOTCHAS OBLIGATORIOS
- Tras cambiar cualquier router de @amatla/api: `npx turbo run build --filter=@amatla/api`.
- NO migraciones de Prisma (avísame si crees que hace falta una). NO commits. NO instalar deps.
- Respuestas correctas del quiz NUNCA al cliente antes del envío → usa
  `quiz.preguntasEstudiante` (no `quiz.preguntas`).
- NO mezclar `next build` con `next dev` sobre el mismo `.next`.

## ARCHIVOS A LEER ANTES DE ESCRIBIR
[rutas exactas]

## TU TAREA
[descripción precisa]

## OUTPUT ESPERADO
- Crear: [rutas exactas]   · Modificar: [solo lo necesario]   · No tocar nada más.
```

---

## 1) Orden de lectura (hazlo antes de planificar)
```
1. Agentes.md         → el sistema multi-agente (cómo delegar) — si necesitas el detalle
2. protocoloia.md     → reglas operacionales (estado en STATUS.md, una tarea a la vez, commit por feature)
3. prompt-maestrp.md  → arquitectura completa (stack, schema, reglas de desarrollo) — v3.0
4. STATUS.md          → estado REAL + ADRs; léelo COMPLETO (los ADRs documentan trampas)
```

---

## 2) Estado actual (verificado 2026-06-13, sesión 7) — 210 tests en verde (API: 109)

**Fases 1-3 COMPLETAS. Fase 4 EN CURSO.**

| Tarea | Estado |
|-------|--------|
| 4.1 Asignación de curso completo | ✅ |
| 4.2/4.3 Progreso secuencial + "Marcar como terminada" (TEXT) | ✅ |
| 4.4 Editor TEXT con Tiptap + sanitización server-side | ✅ |
| 4.5 Quiz BACKEND (QuizQuestion/QuizAttempt/passingScore, router `quiz`, score en SERVIDOR) | ✅ |
| 4.6 Quiz UI INSTRUCTOR (gestor de preguntas dnd-kit + passingScore) | ✅ |
| **4.7 Quiz UI ESTUDIANTE** | ⬅️ **TU TAREA** |
| 4.8 Panel de admin (usuarios, rol, activar/desactivar) | pendiente |
| 4.9 Vista de progreso del estudiante para el instructor | pendiente |

**Trabajo transversal ya hecho (sesión 7):**
- **Rendimiento:** `loading.tsx` global en `(plataforma)/` + componente `Cargando`; BullMQ fuera
  del grafo síncrono (`cola-media` por subpath `@amatla/api/cola-media`, import diferido en
  `archivos.ts`); script `dev:turbo`.
- **Visor PDF arreglado:** polyfill de `Promise.withResolvers`
  (`apps/web/src/lib/polyfill-promise-withresolvers.ts`, importado PRIMERO en `visor-pdf.tsx`);
  regla webpack `.mjs`→`javascript/auto` SOLO fuera de Turbopack (`next.config.ts` condicional
  con `process.env.TURBOPACK`).
- **"Finalizar lección" manual:** procedure `estudiante.completarLeccion` (rechaza QUIZ) + botón
  en VIDEO (además del auto al 80%) y en PDF (aparece SOLO en la última página; ya no
  autocompleta al abrir). TEXT sigue con su botón.

**Schema verificado:** `QuizQuestion`, `QuizAttempt` y `Lesson.passingScore` YA EXISTEN
(migración `add_quiz`). `QuizAttempt` es `@@unique([enrollmentId, lessonId])` (el último intento
sobrescribe). **No se necesita migración para 4.7.**

---

## 3) Entorno (3 procesos obligatorios)
```bash
docker compose up -d            # postgres/redis/pgadmin/clamav — verifica: docker compose ps (healthy)
#   ⚠️ ClamAV: el PRIMER arranque descarga firmas (cientos de MB) → uploads en PENDING hasta
#   que esté healthy. El volumen persiste, así que es de una sola vez.
npm run dev -w @amatla/web      # web :3000  (o `npm run dev:turbo` = Turbopack, más rápido)
npm run dev -w @amatla/worker-media   # OBLIGATORIO: sin él, escaneo/video se quedan en PENDING
# Login dev: http://localhost:3000/api/dev-login?como=instructora   (o estudiante / admin)
# Seed (bash, NO PowerShell): docker exec -i amatla-postgres psql -U amatla -d amatla_dev < packages/db/seed-dev.sql
# Seed users: dev-instructor-1 (INSTRUCTOR) · dev-student-1 (STUDENT) · dev-admin-1 (SUPER_ADMIN)
```

---

## 4) TU TAREA — 4.7 Quiz UI del ESTUDIANTE
Hoy `apps/web/src/app/(plataforma)/cursos/[id]/lecciones/[leccionId]/page.tsx` tiene un
**placeholder** para `tipo === 'QUIZ'`. Reemplázalo por la UI real, orquestando ejecutores.

**Qué construir:**
1. **`components/cursos/quiz-estudiante.tsx`** (client): consume `quiz.preguntasEstudiante`
   (SIN la correcta — regla #13). Radios A/B/C/D; no deja enviar con preguntas vacías.
   Al enviar llama `quiz.enviarIntento` (score en SERVIDOR). Muestra score, aprobado/
   reprobado y **feedback por pregunta** (elegida vs correcta + explicación — lícito DESPUÉS
   del envío). Si reprueba → "Intentar de nuevo" (el backend sobrescribe). Si aprueba → la
   lección queda completada (el backend marca `Progress.completedAt`) → `router.refresh()`.
   Spinner (`useTransition` + `Loader2`) en el submit.
2. **Server actions** (`acciones/quiz-estudiante.ts` o dentro de `acciones/estudiante.ts`):
   `preguntasEstudianteAction`, `enviarIntentoAction`, `miIntentoAction`.
3. **Al reabrir:** usa `quiz.miIntento` para mostrar el último resultado/feedback sin reenviar.
4. **Rendimiento:** la ruta ya tiene `loading.tsx` global (no agregues otro); spinner en submit.

**Archivos de referencia (léelos como ORQUESTADOR antes de delegar):**
```
packages/api/src/routers/quiz.ts                         → preguntasEstudiante / enviarIntento / miIntento
apps/web/src/acciones/estudiante.ts                      → patrón de server actions del estudiante
apps/web/src/components/instructor/gestor-quiz.tsx       → patrón UI de quiz (formularios/estado)
apps/web/src/components/cursos/boton-marcar-terminada.tsx→ patrón useTransition + router.refresh()
apps/web/src/app/(plataforma)/cursos/[id]/lecciones/[leccionId]/page.tsx → placeholder QUIZ a reemplazar
```

**Flujo de delegación sugerido:**
```
1. [TÚ] Lee los 5 archivos. Confirma qué devuelven los procedures.
2. [Sonnet] subtask-4.7a → quiz-estudiante.tsx (componente, sin server actions aún).
3. [TÚ] Revisa: tipado · correcta NUNCA antes del envío · spinner · feedback · router.refresh.
4. [Sonnet] subtask-4.7b → acciones de quiz del estudiante.
5. [Haiku]  subtask-4.7c → integrar <QuizEstudiante/> en page.tsx (reemplazar placeholder).
6. [Sonnet] subtask-4.7d → smoke test (dev-login estudiante + crear lección QUIZ y preguntas
            por SQL + verificar render 200 y envío con score).
7. [TÚ] Revisa el diff final → commit → ADR en STATUS.md.
```

---

## 5) Pendientes conocidos (NO trabajar salvo que el usuario lo pida)
- 🔴 **Video sin HTTP Range:** el mock `apps/web/src/app/api/stream-dev/[uid]/route.ts` (GET) no
  soporta Range → el `<video>` no puede hacer seek y `player.currentTime = X` (salto desde una
  nota) no funciona. Fix: parsear header `Range`, responder 206 con `Content-Range`/
  `Accept-Ranges: bytes`. En prod Cloudflare ya lo soporta. **Tocar solo al trabajar video/notas.**
- 🟡 Dashboard del estudiante usa arte generativo CSS en vez del thumbnail real.
- 🟡 Asignación de cursos a estudiantes solo por SQL (UI de admin llega en 4.8).

---

## 6) GOTCHAs permanentes (aplican a cualquier tarea, recuérdalos al ejecutor)
```
1. Cambiar cualquier router de @amatla/api → `npx turbo run build --filter=@amatla/api`
   (si no, Next usa el dist viejo → "procedure not found" → 404).
2. prisma migrate/generate da EPERM en Windows si el dev de Next/API corre → detén esos
   procesos node ANTES (no puedes matarlos tú: pídeselo al usuario).
3. NO mezcles `next build` y `next dev` sobre el mismo `.next` (desincroniza chunks/manifest).
   Si pasa: parar dev → `Remove-Item -Recurse -Force apps\web\.next` → relevantar.
4. Respuestas correctas del quiz NUNCA al estudiante antes del envío.
5. Curl en Windows: PowerShell descarta Cookie → usa `curl -b`; body JSON con acentos →
   `--data-binary @archivo`; URLs HTML llevan `&amp;`, RSC `&`.
6. git commit con comillas dobles rompe PowerShell → usa `git commit -F - <<'EOF' … EOF` (bash).
7. `next dev --turbopack` ignora la regla webpack de pdfjs (Turbopack maneja los .mjs nativo +
   el polyfill cubre withResolvers, así que el PDF funciona igual).
```

---

## 7) Formato de cierre (protocolo — úsalo SIEMPRE al terminar)
```
✅ Tarea [X] completada.
STATUS.md actualizado (ADR añadido).
Tests: [N] en verde.
Lo que sigue es [Y].
¿Procedo?
```

*Arranque multi-agente · 2026-06-13 · Amatla E-Learning · Fase 4 en curso (4.7 siguiente)*
