# 🚀 Prompt de arranque — próxima sesión (v3.0)

> Copia todo este bloque al iniciar Claude Code en una sesión nueva.

---

Lee primero `protocoloia.md` para asimilar tus reglas operacionales (sistema de
estado en STATUS.md, una tarea a la vez, commit por feature, formato de cierre).
Luego lee `prompt-maestrp.md` (ojo: con typo) para la arquitectura técnica y las
fases. Después lee `STATUS.md` COMPLETO — sobre todo la sección de ADRs, que
documenta decisiones y trampas conocidas.

> ⚠️ NO confíes en lo que este prompt afirme sobre el código o el schema:
> VERIFÍCALO en los archivos antes de actuar. Este documento describe el plan;
> la fuente de verdad es el repo. (Ver la sección "Estado REAL del schema".)

## Contexto operativo (cómo levantar todo)
- **Docker Desktop debe estar corriendo.** `docker compose up -d` levanta
  postgres/redis/pgadmin/clamav.
- **Dev server web:** `npm run dev -w @amatla/web` (puerto 3000).
- **Worker de media:** `npm run dev -w @amatla/worker-media` — **OBLIGATORIO**
  para que los uploads de thumbnail/PDF/video terminen de procesarse. Si no
  corre, los uploads quedan en `scanStatus: PENDING` para siempre (el job se
  queda en la cola `media` de Redis sin procesar). Esto ya causó el bug del
  "thumbnail que no sale".
- **API Fastify** (opcional, para probar con curl + header `x-dev-user-id`):
  `npm run dev -w @amatla/api` (puerto 4000).
- **Entrar al sistema (navegador):** `http://localhost:3000/api/dev-login?como=instructora`
  (también `estudiante` o `admin`). Crea/renueva sesión y pone la cookie httpOnly.
- **Datos de prueba:** `packages/db/seed-dev.sql`. Aplícalo con **bash**, NO
  PowerShell (el pipe de PowerShell corrompe acentos):
  `docker exec -i amatla-postgres psql -U amatla -d amatla_dev < packages/db/seed-dev.sql`
- Usuarios seed: `dev-instructor-1` (INSTRUCTOR), `dev-student-1` (STUDENT),
  `dev-admin-1` (SUPER_ADMIN). Cookies de sesión para curl:
  `dev-session-instructor`, `dev-session-student`.
- Claves de cifrado dev (`ENCRYPTION_MASTER_KEY`/`ENCRYPTION_SALT`) ya están en
  `packages/api/.env` y `apps/web/.env.local` (gitignoreados). Sin ellas, las
  notas personales (y cualquier dato cifrado) fallan al guardarse.

## Estado actual
- **Fases 1, 2 y 3 COMPLETAS** (177 tests en verde). El portal del estudiante
  está cerrado: dashboard, vista de curso con candado granular, reproductor de
  video (Vidstack), visor PDF (react-pdf) y notas personales por timestamp
  **cifradas** (primer uso real de `@amatla/crypto`). Las cards del estudiante
  muestran el thumbnail real del curso.
- **La IA conversacional (chatbot) se eliminó del MVP.** El módulo
  `packages/ai-safety` está scaffolded pero no forma parte de ninguna fase activa.
  La Fase 6 (IA) se retoma una vez el MVP esté en producción.
- **Pendientes conocidos NO bloqueantes:** ESLint real (los scripts `lint` son
  placeholders), repo GitHub + CI activo, `npm audit` (6 vulns, todas de
  tooling/dev), trigger de inmutabilidad de AuditLog en Postgres, recuperación
  de uploads PENDING al arrancar el worker.

## ⚠️ Estado REAL del schema (verificado 2026-06-13 — NO asumas, esto es la verdad)
Los "cambios de arquitectura" de abajo describen el ESTADO-OBJETIVO. A día de hoy
en `packages/db/prisma/schema.prisma`:
- **`Lesson.content` NO existe.** El único `content @db.Text` del schema es
  `ClinicalNote.content`. Las lecciones TEXT siguen sin campo de contenido (es el
  pendiente abierto desde la sesión 3). → Se crea en la tarea 4.4.
- **`QuizQuestion` y `QuizAttempt` NO existen** (ni en schema ni en migraciones).
  → Se crean en la tarea 4.5.
- **`passingScore` NO existe.** → Se crea con los modelos de quiz (4.5).
- `QUIZ` SÍ existe, pero solo como valor del enum `LessonType`.
- **Recomendación (alineada con el prompt maestro "no sobredimensionar"):** crea
  cada modelo en la tarea que lo usa (content en 4.4, quiz en 4.5), NO de forma
  especulativa antes. Es el patrón ya establecido (VideoUpload nació con el router
  de videos, FileUpload con archivos). Si decides consolidar migraciones, que sea
  una decisión explícita documentada en un ADR.

## Cambios de arquitectura de esta versión (v3.0) — PLANEADOS, aún no implementados
1. **Progreso secuencial obligatorio:** la lección N+1 está bloqueada si la N no
   está completada. El servidor verifica esto en cada acceso (mismo NOT_FOUND que
   una lección bloqueada) — la UI solo lo refleja. El reproductor de video también
   limita el scrubbing hacia adelante a `max(lastPosition, watchedSeconds)`.
2. **Lecciones TEXT con editor enriquecido (Tiptap):** crear `Lesson.content
   @db.Text` (migración). Instructor edita WYSIWYG; HTML sanitizado server-side
   (isomorphic-dompurify); estudiante ve el HTML renderizado + botón "Marcar como
   terminada".
3. **Lecciones tipo QUIZ:** agregar modelos `QuizQuestion` y `QuizAttempt`. El
   instructor crea preguntas A/B/C/D con respuesta correcta. El estudiante envía y
   el SERVIDOR calcula el score (nunca el cliente). La respuesta correcta NUNCA
   viaja al cliente antes del envío.
4. **La IA conversacional queda fuera del MVP** — ver Fase 6 del prompt maestro.

## TU TAREA (4.1): Asignación de curso completo
El usuario confirmó el alcance: **asignación de CURSO COMPLETO** (no granular por
secciones todavía). Es el BLOQUEANTE para que el flujo instructor→estudiante sea
demostrable: hoy el portal del estudiante solo muestra cursos con `Enrollment`, y
el único que existe lo puso el seed a mano. No hay UI para asignar.

> Nota sobre el orden: el prompt v3.0 original sugería crear `QuizQuestion`/
> `QuizAttempt` como "sub-tarea 0" antes de la asignación. Recomendación: NO lo
> hagas — la asignación no los necesita, y crear schema muerto va contra el
> principio "no sobredimensionar". Crea esos modelos en la tarea 4.5. Si el
> usuario insiste en consolidar, confírmalo primero.

**Qué construir:**
1. Router (instructor/admin): procedures para listar estudiantes asignables,
   asignar un curso a un estudiante (crear `Enrollment`) y quitar la asignación.
   Ownership: el instructor solo sobre SUS cursos (reusa `cursoPropio` de
   `cursos.ts`); SUPER_ADMIN sobre cualquiera. Auditoría con `auditFromRequest`
   (agrega `ASSIGN_COURSE` / `UNASSIGN_COURSE` al catálogo `AUDIT_ACTIONS` en
   `packages/db/src/audit.ts`). `Enrollment.assignedBy` = `ctx.user.id`.
2. UI: página `/instructor/cursos/[id]/estudiantes` (server component) con un
   selector de estudiante + botón "Asignar curso", y la lista de asignados con
   acción "quitar". Server actions en `apps/web/src/acciones/`. Enlaza a esta
   página desde la estructura del curso (`/instructor/cursos/[id]/page.tsx`).
3. Mockup acordado con el usuario:
   ```
   /instructor/cursos/[id]/estudiantes
   ┌─────────────────────────────┐
   │ Asignar estudiante      [v] │
   │  • Valentina Prueba         │
   │         [ Asignar curso ]   │
   ├─────────────────────────────┤
   │ Asignados:                  │
   │  Valentina Prueba   [quitar]│
   └─────────────────────────────┘
   ```

**Decisiones ya tomadas:**
- El modelo `Enrollment` YA existe con `@@unique([studentId, courseId])`.
  **NO hace falta migración** para la asignación de curso completo.
- Para "curso completo" NO crees filas de `ModuleAccess` (sin filas = acceso
  total; ver `seccionesAccesibles` en `estudiante.ts`). La granularidad por
  secciones es tarea posterior de Fase 4.
- Estudiantes asignables: **todos los usuarios con rol STUDENT activos**
  (`isActive: true`). Un `instructorProcedure` que devuelva STUDENTs. Documenta
  en un ADR.
- Verifica e2e: tras asignar, loguéate como `estudiante` y confirma que el curso
  aparece en el dashboard (el backend ya respeta `Enrollment`).

## Orden de tareas de Fase 4 (después de la asignación)
- **4.2 — Migración: `QuizQuestion` + `QuizAttempt` + `Lesson.passingScore`**
  (solo cuando se llegue a la tarea de quiz; ver 4.5).
- **4.3 — Progreso secuencial:** en `estudiante.leccion`/`videoLeccion` verificar
  que la lección anterior (orden−1 en la sección, o última de la sección previa)
  esté completada → si no, NOT_FOUND. En `ReproductorVideo` fijar el máximo
  scrubable a `max(lastPosition, watchedSeconds)`. Procedure
  `estudiante.marcarTextoVisto` + botón "Marcar como terminada" para TEXT.
- **4.4 — Editor TEXT (Tiptap):** crear `Lesson.content @db.Text` (migración).
  Instructor: `@tiptap/react` (Bold/Italic/Heading/BulletList/Link), guardar HTML
  sanitizado (isomorphic-dompurify). Estudiante: renderizar HTML sanitizado +
  "Marcar como terminada".
- **4.5 — Quiz backend:** router `quiz` (`packages/api/src/routers/quiz.ts`):
  `preguntas`/`crearPregunta`/`actualizarPregunta`/`eliminarPregunta`/
  `reordenarPreguntas` (instructor), `configurarPassingScore`,
  `enviarIntento` (estudiante; score en servidor; crea Progress.completedAt si
  aprueba; la correcta nunca en el output previo al envío), `miIntento`.
  Audit `SUBMIT_QUIZ`. Tests: score calculado, correcta no expuesta, aprobado→
  lección completada.
- **4.6 — Quiz UI instructor:** gestor de preguntas con dnd-kit, formulario
  A/B/C/D + correcta + explicación, campo passingScore (1-100, default 70).
- **4.7 — Quiz UI estudiante:** formulario con radios, "Enviar examen"
  deshabilitado si falta responder; tras envío score + ✓/✗ por pregunta +
  explicación + "Reintentar"; si pasa, lección completada (router.refresh()).
- **4.8 — Panel admin usuarios:** `/admin/usuarios` tabla (nombre/email/rol/
  isActive/alta), filtro por rol y búsqueda. `admin.listarUsuarios`/`cambiarRol`/
  `toggleActivo`. Al desactivar: borrar filas Session de NextAuth (invalida sesión).
- **4.9 — Progreso del estudiante (instructor):**
  `/instructor/cursos/[id]/estudiantes/[studentId]` con progreso lección a lección,
  %, último acceso, intentos de quiz. Procedure `instructor.progresoEstudiante`.
- **4.10 — Certificado:** al 100% del curso, generar PDF con @react-pdf/renderer
  (logo, nombre, curso, fecha, QR), subir a R2, guardar URL en `Certificate`,
  notificar. Endpoint público `/verify/[verifyCode]` (sin auth).
- **4.11 — Emails (Resend):** bienvenida, curso asignado, certificado generado.

## Archivos clave
- `packages/api/src/routers/cursos.ts` — helper `cursoPropio` (patrón ownership)
- `packages/api/src/routers/estudiante.ts` — cómo se consume Enrollment/Progress y
  `seccionesAccesibles`/`leccionAccesible`
- `packages/api/src/routers/secciones.ts` — patrón router instructor + audit + dnd
- `packages/db/src/audit.ts` — catálogo cerrado AUDIT_ACTIONS
- `packages/api/src/root.ts` — montar routers
- `apps/web/src/app/(plataforma)/instructor/cursos/[id]/page.tsx` — dónde enlazar
- `apps/web/src/components/instructor/acciones-curso.tsx` — patrón client+action
- `apps/web/src/components/instructor/lecciones-seccion.tsx` — patrón dnd-kit
- `apps/web/src/acciones/cursos.ts` y `acciones/estudiante.ts` — server actions
- `apps/web/src/lib/api-server.ts` (`apiServer()`), `lib/guardia.ts`
  (`exigirInstructor()`)

## GOTCHAs que SÍ o SÍ vas a pisar
- Tras cambiar cualquier router, recompila el dist: `npx turbo run build
  --filter=@amatla/api` — si no, el dev server de Next usa la versión vieja y
  verás "procedure not found" (→ 404).
- `prisma migrate`/`generate` falla con EPERM si el dev server de Next o la API
  están corriendo (bloquean el DLL del query engine en Windows). Detén los
  procesos node del proyecto antes de migrar/generar.
- Las respuestas correctas del quiz NUNCA deben incluirse en el output de ningún
  procedure de listado de preguntas para el estudiante — solo después del envío.
- Verificación con curl: las URLs en HTML llevan `&amp;` (entidad); en el payload
  RSC llevan `&`. Conviértelas a `&` según corresponda. Un body JSON con
  acentos por `curl -d` da `FST_ERR_CTP_INVALID_CONTENT_LENGTH` → usa
  `--data-binary @archivo` o ASCII.
- Comillas dobles dentro de `git commit -m @'...'@` rompen el parseo de
  PowerShell 5.1 → evita `"` en el mensaje de commit.

**Flujo de trabajo:** una tarea a la vez, verifica todo (tests + e2e con
dev-login real), commit por feature, y actualiza `STATUS.md` (incluyendo un ADR
con las decisiones) antes de reportar. Termina con el formato del protocolo
("✅ Tarea [X] completada. STATUS.md actualizado. Lo que sigue es [Y]. ¿Procedo?").
