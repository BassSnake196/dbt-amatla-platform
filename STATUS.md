# 📌 Estado del Proyecto: Plataforma E-Learning
- **Última actualización:** 2026-06-13 (sesión 6) — Fase 4: 4.1 (asignación) + 4.2/4.3 (progreso secuencial + botón TEXT) COMPLETAS. 190 tests.
- **Fase Actual:** Fase 4 (MVP completo) — 4.1/4.2/4.3 ✅; siguiente: 4.4 (editor TEXT Tiptap)
- **Objetivo del Sprint:** Cerrar el MVP: asignación, progreso secuencial, quiz, editor TEXT, panel admin, progreso por estudiante (certificado/email/granular/móvil DIFERIDOS)

## 📋 Roadmap Global (v3.0 — MVP sin chatbot IA)
- [x] Fase 1: Infraestructura y Auth ✅ (2026-06-11)
- [x] Fase 2: Gestión de Cursos ✅ (2026-06-12)
- [x] Fase 3: Experiencia del Estudiante ✅ (2026-06-13)
- [ ] Fase 4: MVP Completo — Asignación + Progreso Secuencial + Quiz + Certificado (EN CURSO)
- [ ] Fase 5: Calidad + CI/CD completo + App Móvil base
- [ ] Fase 6: IA con Claude — chatbot de estudio (Post-MVP, fecha a decidir)

> **Decisión de roadmap (2026-06-13):** La IA conversacional (chatbot) se eliminó del MVP.
> El módulo `packages/ai-safety` está scaffolded pero no tiene tareas activas.
> El objetivo es sacar a producción un MVP funcional (tipo Udemy) antes de añadir IA.
> Ver ADR completo al final de este archivo.

## 🎯 Fase 3 — Experiencia del Estudiante ✅
- [x] Dashboard de estudiante: cursos asignados (Enrollment), progreso general
- [x] Vista de curso con sidebar: secciones colapsables, estado por lección (✓ / en progreso / 🔒)
- [x] Reproductor de video Vidstack: URL firmada renovable, posición cada 15s, completar al 80%, velocidades
- [x] Visor PDF inline (react-pdf) con URL firmada y control de descarga por instructor
- [x] Notas personales por timestamp en el video (texto cifrado AES-256-GCM en BD)
- [x] Barra de progreso por curso (cabecera de la vista de curso + cards del dashboard)

## 🎯 Fase 4 — MVP Completo (Tareas del Día)
- [ ] **4.0** Migración schema: modelos QuizQuestion + QuizAttempt + campo passingScore en Lesson
      (verificar si ya existen antes de crear; si no, migrar primero)
- [x] **4.1** Asignación de curso completo: UI + router ✅ (2026-06-13 — desbloquea la demo e2e)
- [x] **4.2** Progreso secuencial: bloqueo server-side de lección N+1 + límite scrubbing video ✅ (2026-06-13)
- [x] **4.3** Botón "Marcar como terminada" para lecciones TEXT ✅ (2026-06-13)
- [ ] **4.4** Editor de contenido TEXT con Tiptap (instructor) + vista renderizada (estudiante)
- [ ] **4.5** Quiz backend: router quiz, procedures CRUD preguntas + enviar intento
- [ ] **4.6** Quiz UI instructor: gestión de preguntas + passingScore
- [ ] **4.7** Quiz UI estudiante: formulario + feedback + reintento
- [ ] **4.8** Panel de admin: tabla de usuarios, cambiar rol, activar/desactivar
- [ ] **4.9** Vista de progreso del estudiante para el instructor (lección por lección)

> ⏸️ **DIFERIDO — fuera del MVP actual (no trabajar hasta nuevo aviso, decisión usuario 2026-06-13):**
> certificado PDF, notificaciones email (Resend), asignación granular por secciones (ModuleAccess)
> y app móvil (Expo). Quedan comentados; se retoman cuando el usuario lo indique.
<!--
- [ ] **4.10** Generación de certificado PDF al completar 100% (@react-pdf/renderer + R2)
- [ ] **4.11** Notificaciones email (Resend): bienvenida, curso asignado, certificado
- [ ] Asignación granular por secciones (ModuleAccess) — Fase 4 extendida
-->


## 🎯 Tareas del Día (Daily Tasks — Fase 1 completada)
- [x] Inicializar monorepo con Turborepo
- [x] Configurar Docker Compose (PostgreSQL base)
- [x] Crear schema.prisma inicial
- [x] Configurar Fastify + tRPC (Endpoints base)
- [x] Crear layout visual (Next.js 15)

## 🎯 Fase 1 — Infraestructura ✅
- [x] Implementar y testear `packages/crypto` (AES-256-GCM)
- [x] Implementar stub `packages/ai-safety` (scaffolded — activo en Fase 6)
- [x] Variables de entorno tipadas con Zod en `packages/config`
- [x] Helper centralizado de AuditLog con catálogo cerrado AUDIT_ACTIONS
- [x] NextAuth.js v5: Magic Link (Resend) + Google OAuth
- [x] GitHub Actions: CI básico (type-check + lint + tests)

## 🎯 Fase 2 — Gestión de Cursos ✅
- [x] Dashboard de instructor: mis cursos con status y métricas
- [x] CRUD de curso: crear/editar título, descripción, categoría
- [x] CRUD de secciones con reordenamiento (dnd-kit)
- [x] CRUD de lecciones: VIDEO/PDF/TEXT con reordenamiento
- [x] Upload de thumbnail/PDFs (presigned R2 + pipeline ClamAV)
- [x] Upload de video (Cloudflare Stream mockeado + webhook)
- [x] Preview de lección + publicar/archivar con validación

## 🧠 Memoria de Decisiones (ADRs)

### ADR — 2026-06-13 — Progreso secuencial (Fase 4, tareas 4.2 + 4.3)
Regla MVP: no se puede abrir la lección N+1 sin completar la N (salvo `isPreview`).
**Server-side (fuente de verdad):** helper `idsNavegables(secuencia, completadas)`
en `estudiante.ts` — sobre las lecciones ACCESIBLES en orden, navegable = preview
|| completada || es la PRIMERA no completada (la "frontera"); todo lo posterior se
bloquea. `bloqueadaPorSecuencia()` aplica esto en `leccionAccesible` → **todos los
procedures de contenido** (leccion, videoLeccion, pdfLeccion, progresoVideo,
materialVisto, marcarTextoVisto, notas) devuelven NOT_FOUND si la lección está
bloqueada por secuencia (mismo trato que sin acceso ModuleAccess — no se distingue).
**Vista (`estudiante.curso`):** nuevo campo `navegable` por lección (false = sin
acceso ModuleAccess O bloqueo secuencial). Diferencia clave en UI: el bloqueo
secuencial muestra el título COMPLETO (el estudiante ve qué viene) con candado y no
abrible; el bloqueo por ModuleAccess sigue enmascarando el título. `IndiceCurso` usa
`navegable` (Link vs div + ícono Lock). **Límite de scrubbing del video:**
`estudiante.leccion` expone `maxVisto` (= `watchedSeconds`, o duración si ya
COMPLETADA = avance libre en repaso); `ReproductorVideo` lo aplica con
`onTimeUpdate`/`onSeeking`/`onSeeked` (el límite crece con la reproducción normal;
un salto adelante > maxVisto+1.5s se revierte; rebobinar es libre). **Lecciones
TEXT completables:** procedure `marcarTextoVisto` (pegajoso) + componente
`BotonMarcarTerminada` — NECESARIO porque sin él una lección TEXT trabaría la
secuencia (el editor de contenido real es 4.4). **GOTCHA conocido (no resuelto, es
de configuración):** una lección VIDEO publicada SIN video procesado no se puede
completar (progresoVideo da NOT_FOUND) → trabaría la secuencia; el instructor debe
completar el contenido antes de publicar. Verificado e2e (curso-dev-2): sin
progreso solo la 1ª navegable; abrir la 2ª → NOT_FOUND/404; completar la 1ª
desbloquea la 2ª (la 3ª sigue bloqueada). 5 tests nuevos — **190 totales**. Los
tests existentes que abrían lecciones intermedias ahora completan las previas con
el helper `completar()`.

### ADR — 2026-06-13 — Asignación de curso completo (Fase 4, tarea 4.1)
Router nuevo `inscripciones` (`packages/api/src/routers/inscripciones.ts`),
montado en `root.ts`. **Reutiliza el catálogo existente:** `ASSIGN_COURSE` y
`REVOKE_ENROLLMENT` YA estaban en `AUDIT_ACTIONS` (no se inventaron acciones).
Procedures (`instructorProcedure`, ownership via `cursoPropio` → SUPER_ADMIN
sobre cualquiera; NOT_FOUND no revela cursos ajenos):
- `estudiantesCurso({ cursoId })` → `{ asignados, disponibles }` en una llamada.
  `disponibles` = usuarios `role: STUDENT, isActive: true` que NO están inscritos
  (decisión: el instructor puede asignar a cualquier STUDENT activo — MVP simple,
  documentado). Nombre mostrado = `name ?? email` (el alta por Magic Link puede no
  tener nombre).
- `asignar({ cursoId, studentId })` → valida que el destinatario sea STUDENT
  activo (no confiar en el cliente), crea `Enrollment` (`assignedBy = ctx.user.id`)
  + audit `ASSIGN_COURSE` en transacción. El `@@unique([studentId, courseId])`
  captura la doble inscripción (P2002 → BAD_REQUEST legible).
- `revocar({ cursoId, studentId })` → borra el `Enrollment` + audit
  `REVOKE_ENROLLMENT`. **OJO (documentado en UI con confirm):** el cascade del
  schema borra también progreso/notas/ModuleAccess de ese estudiante en el curso.
**Curso completo = Enrollment SIN filas de ModuleAccess** (la regla "sin filas =
acceso total" ya existía en `estudiante.ts`); la asignación granular por secciones
queda para después (tarea Fase 4 extendida). **NO hizo falta migración** —
`Enrollment` ya existía. UI: página server `/instructor/cursos/[id]/estudiantes`
(`exigirInstructor` + `cursos.obtener` para 404 de ownership) + client
`GestionEstudiantes` (selector de disponibles + lista de asignados con "Quitar"
confirmado); server actions en `acciones/inscripciones.ts`; enlace "Estudiantes"
añadido en la estructura del curso. Verificado e2e (resuelve la queja "publico un
curso y no aparece"): asignar `curso-dev-2` → el estudiante lo ve en su dashboard
de inmediato; revocar → desaparece; doble asignación → BAD_REQUEST; instructor
ajeno → NOT_FOUND. 8 tests nuevos — **185 totales**.

### ADR — 2026-06-13 — Eliminación del chatbot IA del MVP
**Contexto:** El prompt maestro v2.0 incluía una Fase 5 completa de IA conversacional
(chatbot de estudio, resúmenes automáticos, preguntas de repaso generadas por Claude,
dashboard de tokens, alertas de crisis). El módulo `packages/ai-safety` ya estaba
scaffolded con `classifyMessage` (32 tests).

**Decisión:** La IA conversacional se mueve a Fase 6 (Post-MVP). No forma parte del
lanzamiento inicial. El MVP se define como: subida de cursos → consumo de contenido
→ progreso secuencial → quiz → certificado.

**Motivos:**
1. Prioridad de lanzamiento: el flujo instructor→estudiante no es demostrable sin asignación
   (Fase 4 tarea 4.1). La IA es valiosa pero no desbloquea el negocio core.
2. Complejidad operativa: el chatbot requiere gestión de tokens, costos variables,
   rate limiting de IA, y el pipeline de seguridad clínica — todo eso DESPUÉS de que
   la plataforma base funcione bien.
3. El módulo `packages/ai-safety` se mantiene scaffolded y sus 32 tests siguen en verde.
   Cuando llegue la Fase 6, estará listo para activar.

**Consecuencias:**
- La regla #7 del prompt maestro v2.0 ("AI Safety como puerta de entrada — toda llamada
  a Claude pasa por classifyMessage()") solo aplica a partir de Fase 6.
- El modelo `AiSession` del schema se mantiene para no romper el schema existente,
  pero ningún resolver lo usa en el MVP.
- El worker `workers/ai/` existe como directorio vacío scaffolded — no tiene jobs activos.

---

### ADR — 2026-06-13 — Progreso secuencial de lecciones
**Decisión:** Una lección está bloqueada si la lección inmediatamente anterior
(orden-1 en la misma sección, o la última de la sección anterior) no está completada,
excepto lecciones `isPreview = true` o la primera del curso.

**Dónde se verifica:** En el servidor (`estudiante.leccion`, `estudiante.videoLeccion`),
no solo en la UI. El estudiante que intente acceder a una lección bloqueada por URL directa
recibe el mismo NOT_FOUND que una lección que no existe.

**Scrubbing de video limitado:** El reproductor fija el scrubber máximo en
`max(lastPosition, watchedSeconds)` — el estudiante puede volver a ver partes ya vistas
pero no saltar hacia adelante de lo que ha visto. `watchedSeconds` nunca retrocede (regla ya
implementada desde Fase 3).

---

### ADR — 2026-06-13 — Modelo de Quiz
**Decisión:** Las lecciones tipo QUIZ tienen sus preguntas en la tabla `QuizQuestion`
(no en un campo JSON). Cada intento del estudiante se guarda en `QuizAttempt`
(se sobrescribe el anterior del mismo enrollment+lesson — solo se conserva el último).

**passingScore:** campo `Int @default(70)` en la tabla `Lesson` (aplica solo a QUIZ).
No se creó un modelo separado para configuración de quiz — es suficiente para el MVP.

**Seguridad:** La respuesta correcta (`QuizQuestion.correctOption`) NUNCA se incluye
en el output de ningún procedure de listado de preguntas para el estudiante hasta
después del envío del intento. Se verifica en cada procedure del router quiz con
un tipo de output separado para estudiante vs instructor.

---

### ADR — 2026-06-13 — Qué estudiantes puede asignar un instructor
**Decisión:** Un instructor puede asignar su curso a cualquier usuario con
`role: STUDENT` e `isActive: true`. No se filtra por "estudiantes de sus cursos previos"
ni por ninguna otra relación — todos los STUDENTs activos son asignables.

**Motivo:** MVP. Un filtro más fino (p.ej. solo estudiantes que no tienen ya el curso,
o que el SUPER_ADMIN aprobó) complica la UI sin beneficio real a esta escala (< 100 alumnos).
El `@@unique([studentId, courseId])` de Enrollment previene duplicados.

**Pendiente futuro:** Si el negocio crece y el instructor tiene muchos estudiantes de
otros instructores en la lista, añadir un filtro por "ya tiene al menos un curso conmigo"
o una búsqueda por nombre/email.

---

### ADR — 2026-06-13 — DIAGNÓSTICO "no se ve nada" + fix thumbnail
Ver sesión anterior. En resumen: el portal del estudiante solo muestra cursos con
`Enrollment` (regla de negocio). El único con Enrollment es el del seed. La UI de
asignación es la tarea 4.1 y es el BLOQUEANTE real del demo e2e. El thumbnail no
salía porque el worker de media estaba apagado → uploads en PENDING. Fix: `CursoCard`
ahora muestra el thumbnail real si existe.

---

### ADR — 2026-06-13 — Notas personales por timestamp (primer dato cifrado en prod)
Modelo `LessonNote` (enrollmentId + lessonId + positionSeconds + body @db.Text [ENCRYPTED]).
`@amatla/crypto` se estrena en la app real. Ver migración `20260613053901_add_lesson_note`.
OBLIGATORIO: `ENCRYPTION_MASTER_KEY`/`ENCRYPTION_SALT` en ambos `.env` (api y web).

---

### ADR — 2026-06-12 — Visor PDF
`Lesson.allowDownload Boolean @default(true)`. `react-pdf@10.4.1` client-only via
`next/dynamic ssr:false`. Abrir el material = lección completada (dispara en `onLoadSuccess`).
La URL firmada de 30 min no se puede "desactivar" del todo (el visor necesita leer los bytes)
— la protección real es la firma + TTL + acceso por Enrollment.

---

### ADR — 2026-06-12 — Reproductor Vidstack
`@vidstack/react` — el tag `latest` apunta a 0.6 vieja; la versión actual (1.x) está bajo
el tag `next`. Instalar con versión exacta y `--legacy-peer-deps`. Guardar posición cada 15s
(solo reproduciendo), flush inmediato en pause/ended. Completar al 80% en el SERVIDOR.
Renovación de URL 5 min antes de expirar (setTimeout + guardar posición + cambiar src + restaurar).

---

### ADR — 2026-06-11 — Schema Prisma
15 modelos + 3 enums (Role, CourseStatus, LessonType). Migración `20260611225516_init`.
Prisma 5.22 (no actualizar a v7 sin decisión explícita). Relaciones nombradas para múltiples
FKs a User. `onDelete: Cascade` solo en contenido estructural. AuditLog NUNCA en cascada.

---

### ADR — 2026-06-11 — Backend Fastify+tRPC
tRPC v11 sobre Fastify 5. Helmet CSP `default-src 'none'`, HSTS 1 año, rate-limit 100 req/min.
RBAC 4 niveles. `x-dev-user-id` en dev para suplantar usuarios (NO en producción).

---

### ADR — 2026-06-11 — GOTCHA dist de api
La web consume `@amatla/api` COMPILADO. Tras cambiar cualquier router:
`npx turbo run build --filter=@amatla/api` — o el dev server de Next usa la versión vieja.

---

### ADR — 2026-06-11 — GOTCHA Prisma en Windows
`prisma generate` falla con EPERM si el dev server de Next está corriendo
(bloquea el DLL del query engine). Detener `next dev` antes de regenerar.

---

### ADR — 2026-06-11 — GOTCHA curl en Windows
- PowerShell 5.1 descarta el header Cookie en `Invoke-WebRequest` → usar `curl -b`
- Body JSON con acentos por `-d` da `FST_ERR_CTP_INVALID_CONTENT_LENGTH` → usar `--data-binary @archivo`
- URLs en HTML: `&amp;`; en RSC: `&` (o `\u0026`)
- `git commit -m @'...'@` con comillas dobles rompe el parseo de PowerShell 5.1

---

### ADR — 2026-06-11 — Crypto (AES-256-GCM)
Derivación de clave perezosa con caché (`__resetKeyCache()` para tests).
Formato `iv:authTag:ciphertext` (hex). `decryptField` devuelve null ante datos corruptos.
ENCRYPTION_MASTER_KEY + ENCRYPTION_SALT obligatorios en ambos .env (api y web).

---

### ADR — 2026-06-11 — NextAuth v5 (sesiones en BD)
Sesiones en BD (no JWT) — invalidar = borrar filas Session. Callback `session` devuelve
solo `{expires, user: {id, name, email, image, role}}` — no filtra sessionToken.
`/api/dev-login?como=instructora|estudiante|admin` solo disponible fuera de producción.