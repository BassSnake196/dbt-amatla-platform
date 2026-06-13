# 🚀 Prompt de arranque — próxima sesión (Fase 4, tarea 4.7)

> Copia todo este bloque al iniciar Claude Code en una sesión nueva.

---

Lee primero `protocoloia.md` para asimilar tus reglas operacionales (sistema de
estado en STATUS.md, una tarea a la vez, commit por feature, formato de cierre).
Luego lee `prompt-maestrp.md` (ojo: con typo; es **v3.0**) para la arquitectura
y las fases. Después lee `STATUS.md` COMPLETO — sobre todo la sección de ADRs, que
documenta decisiones y trampas conocidas.

> ⚠️ NO confíes en lo que este prompt afirme sobre el código o el schema:
> VERIFÍCALO en los archivos antes de actuar. La fuente de verdad es el repo.

## 🧠 REQUISITO PERMANENTE — Rendimiento percibido (decisión del usuario 2026-06-13)
La app debe sentirse rápida; los cambios de pantalla NO deben congelarse.
- Toda ruta nueva del App Router lleva `loading.tsx` (hay uno global en
  `apps/web/src/app/(plataforma)/` + el componente `Cargando` en
  `components/layout/cargando.tsx` — reúsalo).
- Toda acción async del cliente (server action, upload, envío) muestra spinner /
  estado deshabilitado (`useTransition` + `Loader2`).
- No metas dependencias pesadas (BullMQ/ioredis, jsdom) en el grafo síncrono que
  compila cada página. Paraleliza queries con `Promise.all`.

## Contexto operativo (cómo levantar todo) — 3 procesos
- **Docker Desktop corriendo.** `docker compose up -d` levanta postgres/redis/
  pgadmin/clamav. **OJO ClamAV:** en su PRIMER arranque `freshclam` descarga las
  firmas (cientos de MB) y `clamd` no escanea hasta cargarlas (healthcheck
  `start_period: 5m`). Hasta entonces las subidas quedan en PENDING y el cliente
  llega a su timeout de 90 s. El volumen `clamav_data` persiste, así que es de una
  sola vez. Verifica con `docker compose ps` (STATUS = healthy) antes de subir.
- **Dev server web:** `npm run dev -w @amatla/web` (puerto 3000).
  - Alternativa rápida: `npm run dev:turbo` (Turbopack, compila mucho más rápido;
    el visor PDF ya funciona ahí gracias al polyfill de `Promise.withResolvers`).
- **Worker de media (OBLIGATORIO):** `npm run dev -w @amatla/worker-media`. Sin él,
  los jobs de escaneo/video se quedan en Redis y las subidas NUNCA salen de PENDING.
- **API Fastify** (opcional, curl con `x-dev-user-id`): `npm run dev -w @amatla/api`
  (puerto 4000). La web NO la usa (llama tRPC in-process vía `apiServer()`).
- **Entrar (navegador):** `http://localhost:3000/api/dev-login?como=instructora`
  (o `estudiante` / `admin`). Pone la cookie httpOnly de sesión.
- **Datos de prueba:** `packages/db/seed-dev.sql`. Aplícalo con **bash**, NO
  PowerShell (el pipe corrompe acentos):
  `docker exec -i amatla-postgres psql -U amatla -d amatla_dev < packages/db/seed-dev.sql`
- Usuarios seed: `dev-instructor-1` (INSTRUCTOR), `dev-student-1` (STUDENT),
  `dev-admin-1` (SUPER_ADMIN).
- Claves de cifrado dev ya están en `packages/api/.env` y `apps/web/.env.local`.

## Estado actual (verificado 2026-06-13, sesión 7)
- **Fases 1-3 COMPLETAS. Fase 4 EN CURSO: 4.1 → 4.6 hechas. 207 tests en verde.**
  - 4.1 ✅ Asignación de curso completo.
  - 4.2/4.3 ✅ Progreso secuencial + "Marcar como terminada" (TEXT).
  - 4.4 ✅ Editor TEXT con Tiptap + sanitización server-side.
  - 4.5 ✅ Quiz BACKEND: `QuizQuestion`/`QuizAttempt`/`Lesson.passingScore`
    (migración `add_quiz`), router `quiz` con score calculado en SERVIDOR.
  - 4.6 ✅ Quiz UI INSTRUCTOR: gestor de preguntas con dnd-kit + passingScore
    (`/instructor/cursos/[id]/lecciones/[leccionId]/quiz`).
- **Rendimiento:** `loading.tsx` global + `Cargando`; BullMQ sacado del grafo
  síncrono (`cola-media` se importa diferido en `archivos.ts`, fuera del índice de
  `@amatla/api`, expuesto por subpath `@amatla/api/cola-media`). Script `dev:turbo`.
- **Visor PDF arreglado:** polyfill de `Promise.withResolvers`
  (`apps/web/src/lib/polyfill-promise-withresolvers.ts`, importado PRIMERO en
  `visor-pdf.tsx`); regla webpack `.mjs`→`javascript/auto` SOLO fuera de Turbopack
  (`next.config.ts` condicional con `process.env.TURBOPACK`).
- **La IA conversacional (chatbot) está FUERA del MVP** (Fase 6, post-MVP).

## ⚠️ Estado REAL del schema (verificado)
- `QuizQuestion`, `QuizAttempt` y `Lesson.passingScore` **YA EXISTEN** (migración
  `add_quiz`). `datosLeccion` (router lecciones) ya acepta `QUIZ`.
- `QuizAttempt` es **`@@unique([enrollmentId, lessonId])`** → un solo intento (el
  último) por inscripción+lección; `enviarIntento` lo sobrescribe.

## TU TAREA (4.7): Quiz — UI del ESTUDIANTE
Hoy la página de lección del estudiante
(`apps/web/src/app/(plataforma)/cursos/[id]/lecciones/[leccionId]/page.tsx`) tiene
un **placeholder** para `tipo === 'QUIZ'` ("El examen de esta lección estará
disponible muy pronto"). Reemplázalo por la UI real:
1. **Formulario de quiz** (client component, p. ej.
   `components/cursos/quiz-estudiante.tsx`): consume `quiz.preguntasEstudiante`
   (NO trae la respuesta correcta — regla #13) vía server action en
   `acciones/estudiante.ts` (o nuevo `acciones/quiz-estudiante.ts`). Una opción
   A/B/C/D por pregunta (radios). No deja enviar con preguntas sin responder.
2. **Enviar intento:** llama `quiz.enviarIntento` (score en SERVIDOR). Muestra
   resultado: score, passed/no passed, y **feedback por pregunta** (correcta vs
   elegida, con la explicación) — la correcta ya es lícita DESPUÉS del envío.
3. **Reintento:** si no aprueba, permite reintentar (el backend sobrescribe el
   intento). Si aprueba, la lección queda completada (el backend ya marca
   `Progress.completedAt`) → refresca para que el índice muestre la ✓ y desbloquee
   la siguiente (progreso secuencial).
4. **Al reabrir:** usa `quiz.miIntento` para mostrar el último resultado/feedback.
5. **Loading + estados:** spinner al enviar; respeta el requisito de rendimiento.
6. **Tests:** no hay backend nuevo (4.5 ya está testeado); si agregas server
   actions, valida el flujo. Smoke test por HTTP como en 4.6 (crear lección QUIZ +
   preguntas por SQL, dev-login estudiante, verificar render y envío).

**Patrón de referencia:** mira cómo `gestor-quiz.tsx` (instructor) y
`boton-marcar-terminada.tsx` / `reproductor-video.tsx` (estudiante) usan server
actions + `useTransition` + `router.refresh()`.

## 🐞 PROBLEMAS CONOCIDOS / DETALLES FINALES
1. **PENDIENTE — Video no se puede adelantar/atrasar y la barra de tiempo falla.**
   Causa: el mock dev de streaming `apps/web/src/app/api/stream-dev/[uid]/route.ts`
   (GET) NO soporta **HTTP Range requests** (lo dice su propio comentario). Sin 206/
   `Accept-Ranges`, el `<video>` no puede hacer seek y `player.currentTime = X`
   (salto desde una nota) no funciona → **rompe el seek Y las notas por timestamp**.
   FIX: implementar Range en ese GET (parsear header `Range`, responder 206 con
   `Content-Range`/`Accept-Ranges: bytes` y el slice de bytes). Es solo el mock de
   dev; en prod Cloudflare ya soporta Range. Hacerlo cuando se toque video/notas.
2. **RESUELTO (sesión 7) — Finalizar lección manualmente.** Se añadió
   `estudiante.completarLeccion` + botón "Finalizar lección" en VIDEO (además del
   auto al 80%) y en PDF (aparece SOLO en la última página; ya NO autocompleta al
   abrir). TEXT sigue con su botón. QUIZ se completa aprobándolo. Ver ADR en STATUS.

## Orden restante del MVP (Fase 4)
- **4.7** Quiz UI estudiante ← TU TAREA
- **4.8** Panel de admin: tabla de usuarios, cambiar rol, activar/desactivar
  (al desactivar: borrar filas Session de NextAuth para invalidar la sesión)
- **4.9** Vista de progreso del estudiante para el instructor (última del MVP)
- (sugerido) arreglar el problema conocido #1 (Range del video) cuando toques video.

## ⏸️ DIFERIDO — fuera del MVP actual (NO trabajar hasta nuevo aviso)
Certificado PDF, notificaciones email (Resend), asignación granular por secciones
(ModuleAccess) y app móvil (Expo). No los implementes.

## Archivos clave
- `packages/api/src/routers/quiz.ts` — procedures de estudiante:
  `preguntasEstudiante` (sin correcta), `enviarIntento` (score server-side +
  completa la lección), `miIntento`.
- `packages/api/src/routers/estudiante.ts` — `leccionAccesible` (exportado),
  cómo se marca Progress, patrón de procedures de estudiante.
- `apps/web/src/components/instructor/gestor-quiz.tsx` — patrón UI de quiz (dnd-kit,
  formularios, optimista).
- `apps/web/src/acciones/estudiante.ts` — server actions del estudiante.
- `apps/web/src/app/(plataforma)/cursos/[id]/lecciones/[leccionId]/page.tsx` — la
  página a editar (rama QUIZ).
- `apps/web/src/components/cursos/reproductor-video.tsx` — patrón cliente + notas.

## GOTCHAs que SÍ o SÍ vas a pisar
- Tras cambiar cualquier router: `npx turbo run build --filter=@amatla/api` — si no,
  el dev de Next usa el dist viejo ("procedure not found" → 404).
- `prisma migrate`/`generate` falla con **EPERM** si el dev de Next o la API están
  corriendo (bloquean el DLL del query engine en Windows). Detén esos procesos node
  del proyecto antes de migrar/generar (no puedes matarlos tú: pídeselo al usuario).
- **NO mezcles `next build` y `next dev` en el mismo `.next`** (desincroniza chunks/
  manifest). Si pasa: parar dev, `Remove-Item -Recurse -Force apps\web\.next`, relevantar.
- **Las respuestas correctas del quiz NUNCA viajan al estudiante** antes del envío.
- Verificación con curl: URLs en HTML llevan `&amp;`, en RSC `&`. Body JSON con
  acentos por `curl -d` da `FST_ERR_CTP_INVALID_CONTENT_LENGTH` → usa
  `--data-binary @archivo` o ASCII.
- **Comillas dobles dentro de `git commit -m @'...'@`** rompen PowerShell 5.1 → evita
  `"` en el mensaje (o usa heredoc de bash `git commit -F - <<'EOF'`).

**Flujo de trabajo:** una tarea a la vez, verifica todo (tests + smoke e2e con
dev-login real), commit por feature, y actualiza `STATUS.md` (con un ADR) antes de
reportar. Termina con el formato del protocolo ("✅ Tarea [X] completada.
STATUS.md actualizado. Lo que sigue es [Y]. ¿Procedo?").
