# 📌 Estado del Proyecto: Plataforma E-Learning
- **Última actualización:** 2026-06-13 (sesión 8) — Fase 4: 4.7 (quiz UI estudiante) COMPLETA, en modo orquestador (ejecutor Sonnet implementó, orquestador revisó/verificó/commiteó). 210 tests.
- **Fase Actual:** Fase 4 (MVP completo) — 4.0–4.7 ✅; siguiente: 4.8 (panel de admin)
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
- [x] **4.0** Migración schema: modelos QuizQuestion + QuizAttempt + campo passingScore en Lesson ✅ (2026-06-13 — migración `add_quiz`)
- [x] **4.1** Asignación de curso completo: UI + router ✅ (2026-06-13 — desbloquea la demo e2e)
- [x] **4.2** Progreso secuencial: bloqueo server-side de lección N+1 + límite scrubbing video ✅ (2026-06-13)
- [x] **4.3** Botón "Marcar como terminada" para lecciones TEXT ✅ (2026-06-13)
- [x] **4.4** Editor de contenido TEXT con Tiptap (instructor) + vista renderizada (estudiante) ✅ (2026-06-13)
- [x] **4.5** Quiz backend: router quiz, procedures CRUD preguntas + enviar intento ✅ (2026-06-13)
- [x] **4.6** Quiz UI instructor: gestión de preguntas + passingScore ✅ (2026-06-13)
- [x] **4.7** Quiz UI estudiante: formulario + feedback + reintento ✅ (2026-06-13)
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

### ADR — 2026-06-13 — Fix "InvalidPDFException: Invalid PDF structure" (seed de media)
**Síntoma:** abrir la lección PDF del seed (`lec-dev-3`) lanzaba en consola
`InvalidPDFException: Invalid PDF structure` (react-pdf/pdfjs). **Diagnóstico:** NO es
del bundler (eso ya estaba resuelto con el polyfill + regla .mjs); el archivo almacenado
era un placeholder MALFORMADO de 77 bytes (cabecera `%PDF-1.4` + `%%EOF` pero SIN `/Pages`
ni tabla `xref`), creado en una sesión previa. Los PDFs reales subidos por el usuario
(~426 KB) son válidos y renderizan bien. **Fix:** script `packages/db/seed-media.mjs`
(`npm run db:seed-media -w @amatla/db`) que recorre las lecciones PDF y, para las que su
archivo en `.almacen-dev` falte o esté malformado (sin `/Pages`/`xref`), escribe un PDF de
una página VÁLIDO con la tabla `xref` de offsets calculados en bytes; NO toca los PDFs
reales (se detectan válidos y se omiten). Verificado: `lec-dev-3` pasó de 77 → 610 bytes,
`startxref` apunta exacto a `xref`, offsets de objeto correctos. El visor ya degradaba bien
ante error (`onLoadError` → tarjeta de fallback); este fix corrige el dato de origen y deja
los PDF del seed funcionando out-of-the-box tras correr el script. (El binario vive en
`.almacen-dev`, gitignorado; lo reproducible es el script.)

### ADR — 2026-06-13 — Quiz UI estudiante (Fase 4, tarea 4.7) — primera tarea en modo orquestador
**Modelo de trabajo (nuevo):** se ejecutó con la jerarquía multi-agente (`Agentes.md`): el
ORQUESTADOR (Opus) leyó contexto y contratos, redactó el prompt de subtarea y delegó la
IMPLEMENTACIÓN a un EJECUTOR Sonnet 4.6; el orquestador hizo la revisión del diff, la
verificación (type-check + smoke test), el commit y este ADR. El ejecutor no commiteó ni tocó
backend/schema. **Solo frontend** (consume el router `quiz` de 4.5, sin cambios de backend).
**Archivos:** `acciones/quiz-estudiante.ts` (`enviarIntentoAction` + tipos `FeedbackIntento`/
`ResultadoPregunta`/`OpcionRespuesta`); `components/cursos/quiz-estudiante.tsx` (client);
`page.tsx` (rama QUIZ). **Flujo:** el server component trae `quiz.preguntasEstudiante` (SIN la
correcta) + `quiz.miIntento` (último intento serializado, sin la fecha) y los pasa al componente.
Si hay intento previo → arranca en vista RESULTADO; si no → formulario con radios A/B/C/D, botón
"Enviar respuestas" deshabilitado hasta responder todas + contador "X de N". Al enviar:
`enviarIntento` (score en SERVIDOR) → vista RESULTADO con feedback por pregunta (correcta vs
elegida + explicación, lícito tras el envío); si `passed` → `router.refresh()` (índice marca ✓ y
desbloquea la siguiente); si reprueba → "Intentar de nuevo" (limpia estado, el backend sobrescribe
el intento). Spinner `useTransition`+`Loader2` en el submit. **Seguridad verificada (smoke):** la
página renderiza 200 y `correctOption` NO aparece en el HTML del formulario (regla #13).
**Verificación:** type-check web en verde + smoke HTTP (curso/lección QUIZ + preguntas por SQL,
dev-login estudiante). Sin tests automáticos nuevos (el backend de 4.5 ya está testeado). **210
tests** en total siguen en verde.

### ADR — 2026-06-13 — Botón "Finalizar lección" manual para VIDEO/PDF
**Pedido del usuario:** poder avanzar en el curso marcando la lección como terminada,
sin depender solo del auto-completado. **Backend:** nuevo procedure
`estudiante.completarLeccion({ leccionId })` (genérico, pegajoso, idempotente; respeta
acceso + progreso secuencial vía `leccionAccesible`; **rechaza QUIZ** con BAD_REQUEST —
el quiz se completa aprobándolo, no manualmente). **Frontend:** `BotonMarcarTerminada`
generalizado (ahora usa `completarLeccionAction` + prop `etiqueta`); se usa en TEXT
("Marcar como terminada"), VIDEO ("Finalizar lección", bajo el reproductor, además del
auto-completado al 80%) y PDF. **PDF — cambio de UX:** antes la lección PDF se completaba
automáticamente al ABRIR el visor; ahora el botón "Finalizar lección" aparece SOLO al
llegar a la ÚLTIMA página (`pagina === totalPaginas`) y el estudiante lo pulsa. Se quitó
el auto-completado en `onLoadSuccess` del visor. **Verificado:** 3 tests nuevos de
`completarLeccion` (VIDEO idempotente + desbloqueo secuencial, NOT_FOUND por secuencia/
ownership, QUIZ rechazado) — **109 tests API** + type-check web en verde.

### ADR — 2026-06-13 — Rendimiento percibido (requisito permanente)
**Requisito del usuario:** la app debe sentirse rápida; los cambios de pantalla NO deben
congelarse y toda espera lleva animación de carga. Aplica a TODAS las tareas en adelante.
**Causas detectadas en local:** (1) no existía NINGÚN `loading.tsx` → cada navegación se
congelaba esperando el server component completo (auth + queries) antes de pintar nada;
(2) el índice de `@amatla/api` re-exportaba `cola-media` y el router `archivos` lo importaba
estático → BullMQ + ioredis entraban al grafo síncrono de TODA página que usa `apiServer()`
(de ahí el warning "Critical dependency" de bullmq y compilaciones de dev más pesadas).
**Cambios:**
- `apps/web/src/app/(plataforma)/loading.tsx` global + componente `Cargando`
  (`components/layout/cargando.tsx`, spinner de marca con `role=status`). Cubre todas las
  rutas de la plataforma; muestra carga al instante en cada navegación.
- `archivos.ts`: `encolarEscaneo` ahora se carga con `await import('../cola-media.js')` dentro
  del resolver (chunk diferido, fuera del grafo síncrono).
- `@amatla/api`: se quitó el re-export de `cola-media` del índice; se añadió `exports` map con
  subpath `./cola-media`; el webhook de Stream importa de `@amatla/api/cola-media`.
- Página de estructura del curso (instructor): las 2 queries (curso + secciones) ahora van en
  `Promise.all`.
- Script `dev:turbo` (`next dev --turbopack`) para compilación de dev mucho más rápida (opt-in;
  OJO: Turbopack ignora la regla webpack de pdfjs — probar el visor PDF si se usa).
**Límite conocido:** en dev (webpack) la PRIMERA visita a una ruta siempre compila on-demand;
`loading.tsx` no cubre eso (solo Turbopack). Verificado: 106 tests API verdes (incluido el de
`archivos` que mockea `cola-media`) + `type-check` web en verde. NO se corrió `next build` para
no perturbar el `.next` del dev en marcha.

### ADR — 2026-06-13 — Quiz UI instructor (Fase 4, tarea 4.6)
**Solo frontend** — consume el router `quiz` de 4.5 (sin cambios de backend).
**Página** `/instructor/cursos/[id]/lecciones/[leccionId]/quiz` (server component):
`exigirInstructor()` + `lecciones.preview` (valida ownership → 404; además exige
`tipo === 'QUIZ'`) + `quiz.preguntas` (devuelve las preguntas CON la correcta —es la
vista del instructor). **Componente** `GestorQuiz` (`components/instructor/gestor-quiz.tsx`,
client): config de `passingScore` (input 1-100 + guardar), lista de preguntas con
**dnd-kit** (mismo patrón que `lecciones-seccion`: `PointerSensor`/`KeyboardSensor`, `id`
determinista `dnd-preguntas-${leccionId}` para evitar mismatch SSR), y un `FormularioPregunta`
reutilizado para crear y editar (enunciado, 4 opciones, radio para marcar la correcta —`name`
único con `useId`—, explicación opcional). Estado optimista con revertir en error (reorder y
delete), como el resto del instructor. **Server actions** `acciones/quiz.ts`: crear/actualizar/
eliminar/reordenar pregunta + configurarPassingScore; reusan `mensajeLegible` y revalidan
`/instructor/.../quiz`. **Integración:** `datosLeccion`/`TipoLeccion` ya aceptaban QUIZ (4.5);
añadido al `<select>` de nueva lección, icono `ListChecks` para QUIZ, y enlace al gestor en la
fila de lección QUIZ (junto al patrón del enlace TEXT→editar). **Verificación:** `type-check` +
`next build` en verde; smoke test por HTTP contra el dev server (dev-login como instructora):
el gestor carga 200 con el formulario, una pregunta se renderiza con su opción correcta
resaltada y la explicación, y una lección no-QUIZ en `/quiz` da 404. No se hizo e2e de navegador
(no hay forma de manejar el navegador en esta sesión). La UI del estudiante es 4.7.
**GOTCHA (no del código):** correr `next build` (producción) y luego `next dev` sobre el MISMO
`.next` desincroniza el `react-loadable-manifest` → el único componente con `next/dynamic`+
`ssr:false` (el visor PDF, `visor-pdf-cliente`) revienta con "Object.defineProperty called on
non-object" al evaluar el chunk de `pdf.mjs`, aunque el resto de páginas funcionan. Fix: parar
dev, borrar `apps/web/.next`, relevantar dev. No mezclar build y dev en el mismo `.next`.

### ADR — 2026-06-13 — Quiz backend (Fase 4, tarea 4.5)
**Schema** (migración `add_quiz`, aplicada con dev servers detenidos por el EPERM de Windows):
`Lesson.passingScore Int @default(70)` (solo aplica a QUIZ); modelo `QuizQuestion`
(lessonId, order, stem, optionA-D, `correctOption` 'A'|'B'|'C'|'D', `explanation?`,
timestamps; `onDelete: Cascade` desde Lesson; `@@index([lessonId, order])`); modelo
`QuizAttempt` (enrollmentId, lessonId, `answers` Json `{questionId: 'A'..'D'}`, score,
passed, attemptedAt, updatedAt; cascada desde Enrollment y Lesson; **`@@unique([enrollmentId,
lessonId])`** → el envío SOBRESCRIBE el intento anterior, solo se conserva el último).
Relaciones inversas añadidas en `Lesson` (quizQuestions, quizAttempts) y `Enrollment`
(quizAttempts).
**Router `quiz`** (`packages/api/src/routers/quiz.ts`, montado en `root.ts`):
- *Instructor* (ownership 3 niveles vía `leccionPropia` + helper `leccionQuizPropia` que
  exige type QUIZ; `preguntaPropia` para ops sobre una pregunta): `preguntas` (CON la
  correcta, para editar), `crearPregunta`, `actualizarPregunta`, `eliminarPregunta`,
  `reordenarPreguntas` (patrón `secciones.reordenar`), `configurarPassingScore` (1-100,
  audita como UPDATE_LESSON).
- *Estudiante* (acceso vía `leccionAccesible` de `estudiante.ts` —ahora **exportado**— que
  ya valida Enrollment + ModuleAccess + progreso secuencial): `preguntasEstudiante`
  (**SIN** la correcta ni la explicación — `select` explícito en la query, regla #13),
  `enviarIntento` (**score calculado en el SERVIDOR**: aciertos/total*100; valida que TODAS
  las preguntas estén respondidas y que el quiz tenga ≥1 pregunta; upsert del attempt; si
  `passed` marca `Progress.completedAt` —pegajoso: un intento posterior reprobatorio NO
  des-completa—; audita SUBMIT_QUIZ; devuelve feedback con la correcta, que ya es lícito
  revelar TRAS el envío), `miIntento` (último intento + feedback reconstruido, null si no hay).
**Auditoría:** añadidas `CREATE/UPDATE/DELETE/REORDER_QUIZ_QUESTION(S)` + `SUBMIT_QUIZ` al
catálogo `AUDIT_ACTIONS`, y `QuizQuestion` a `AuditableModel` (`packages/db/src/audit.ts`).
**Lecciones:** `datosLeccion` ahora acepta `QUIZ` (sin esto el instructor no podría crear
lecciones de quiz); se actualizó el test de `lecciones` que asumía el rechazo de QUIZ.
**Seguridad verificada (tests):** la correcta nunca viaja al estudiante antes del envío;
el score es server-side (no se confía en el cliente); aprobar completa la lección y cuenta
en la secuencia; el quiz respeta el bloqueo secuencial; ownership de instructor.
**Alcance:** SOLO backend — la UI es 4.6 (instructor) y 4.7 (estudiante). Verificación a
nivel de integración contra Postgres real (sin e2e HTTP: no hay UI ni transporte nuevo, y
el seed no trae lecciones QUIZ). 15 tests nuevos de quiz — **207 totales**.

### ADR — 2026-06-13 — Editor de contenido TEXT con Tiptap (Fase 4, tarea 4.4) + fix worker PDF
**Schema:** migración `add_lesson_content` — `Lesson.content String? @db.Text` (HTML
enriquecido). **Sanitización server-side (regla #13):** módulo `packages/api/src/sanitize.ts`
con `isomorphic-dompurify` + allowlist alineada con Tiptap (p, h1-h4, strong/em/u/s,
ul/ol/li, blockquote, code/pre, a con href/target/rel; `ALLOWED_URI_REGEXP` solo
https/mailto → bloquea `javascript:`). **SIEMPRE se sanitiza al GUARDAR**, no al leer —
así el HTML en BD ya está limpio. Backend (`lecciones.ts`): `obtenerContenido`
(instructor, ownership 3 niveles via `leccionPropia`, exige type TEXT) y
`guardarContenido` (sanitiza + persiste + audit UPDATE_LESSON). `estudiante.leccion`
expone `contenido` (HTML del TEXT, '' en otros tipos). **UI instructor:** `EditorContenido`
(Tiptap `@tiptap/react` + StarterKit + Link, `immediatelyRender: false` para evitar
hydration mismatch en SSR de Next) con barra de herramientas (negrita/cursiva/H2/H3/
listas/cita/enlace); página `/instructor/cursos/[id]/lecciones/[leccionId]/editar`; enlace
"Editar contenido" (ícono Pencil) en la fila de lección TEXT. **UI estudiante:** la rama
TEXT renderiza el HTML con `dangerouslySetInnerHTML` (ya sanitizado) en `.contenido-rico`
(estilos en globals.css) + el botón "Marcar como terminada" (4.3). **GOTCHA DOMPurify TS:**
`DOMPurify.Config` no es un namespace accesible → no anotar el config con ese tipo; añadir
`RETURN_DOM: false` + `RETURN_DOM_FRAGMENT: false` para que `sanitize` infiera retorno
`string`. **FIX worker pdf.js (resolvía un error del frontend del visor PDF):** el patrón
`new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` NO resuelve en runtime
con el bundler de Next → el visor fallaba al abrir un PDF. Solución: copiar el worker a
`apps/web/public/pdf.worker.min.mjs` (versión EXACTA de pdfjs-dist, hoy 5.4.296) y
`workerSrc = '/pdf.worker.min.mjs'`. Si se actualiza pdfjs-dist hay que recopiarlo (anotado
en el código). Verificado e2e: instructor guarda HTML con `<script>`/`onclick`/`javascript:`
→ se eliminan, formato legítimo (h2/strong/enlace https) se conserva; estudiante recibe y
renderiza el contenido; páginas /editar y de lección 200. 2 tests nuevos (sanitización +
ownership) — **192 totales**.

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