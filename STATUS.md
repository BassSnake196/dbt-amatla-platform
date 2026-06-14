# 📌 Estado del Proyecto: Plataforma E-Learning
- **Última actualización:** 2026-06-14 (sesión 10 — REDISEÑO) — Arranque de la sesión de rediseño visual. **Bloque 5 cerrado: Explorar in-shell (`/explorar`) + rediseño del catálogo público `/general` (hero de marca) + búsqueda funcional del catálogo público (redisenio §13,§14 + decisión §3.2).** Bloque 4: home (hero + Descubrir) + login solo-Google. Bloque 3: sidebar + topbar + avatar real + 3 stubs. Bloque 2: tokens (§1). Bloque 1: FIX §15. Decisiones de flujo tomadas con el usuario: Inicio = mis cursos + descubrir público (sin muro vacío); Explorar dentro del shell; quitar "Mis cursos" del sidebar; stubs "Próximamente" para Calendario/Notificaciones/Configuración. Antes (sesión 9): catálogo público "General" + visibilidad (público/privado), migración `add_course_public`, 237 tests.
- **Fase Actual:** Fase 4 ✅ (features del MVP completas). **Pendiente para usar el MVP de punta a punta en local: AUTH REAL (Google login / Magic Link) — hoy solo se entra con `/api/dev-login`.** Ver "Pendientes del prompt maestro" más abajo. Siguiente: cerrar auth real → Fase 5 (calidad/CI).
- **Objetivo del Sprint:** Cerrar el MVP: asignación, progreso secuencial, quiz, editor TEXT, panel admin, progreso por estudiante (certificado/email/granular/móvil DIFERIDOS)

## 📋 Roadmap Global (v3.0 — MVP sin chatbot IA)
- [x] Fase 1: Infraestructura y Auth ✅ (2026-06-11)
- [x] Fase 2: Gestión de Cursos ✅ (2026-06-12)
- [x] Fase 3: Experiencia del Estudiante ✅ (2026-06-13)
- [x] Fase 4: MVP Completo — Asignación + Progreso Secuencial + Quiz + Panel admin + Progreso ✅ (2026-06-13) — features cerradas; falta auth real para uso e2e
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
- [x] **4.8** Panel de admin: tabla de usuarios, cambiar rol, activar/desactivar ✅ (2026-06-13)
- [x] **4.9** Vista de progreso del estudiante para el instructor (lección por lección) ✅ (2026-06-13)

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

### ADR — 2026-06-14 (sesión 10, rediseño) — Bloque 5: Explorar in-shell + rediseño /general + búsqueda pública (redisenio §13,§14 + decisión §3.2)
**Alcance:** frontend (ejecutor Sonnet 4.6; orquestador planificó/revisó/verificó/commiteó). Sin cambios de
schema ni routers → no se recompiló la API. **Búsqueda reutilizable (§14, nuevo `components/publico/
explorador-publico.tsx`, client):** input de búsqueda + pills de categoría, filtra client-side por
título/categoría/instructora sobre `catalogo.publicos` ya cargado; renderiza el grid vía el `CatalogoPublico`
existente (autoinscripción + modal de login del Bloque 4 intactos). Maneja estados vacíos (sin cursos / sin
coincidencias). Único cambio a `catalogo-publico.tsx`: se EXPORTA el tipo `CursoPublico` para reusarlo.
**Explorar in-shell (decisión §3.2, nueva `(plataforma)/explorar/page.tsx`, server):** el catálogo público
se renderiza ahora DENTRO del shell (sidebar+topbar) para logueados; cabecera "Explorar" + `<ExploradorPublico
sesionActiva={true}>`. **Sin dedupe** (Explorar = catálogo completo; el clic en uno ya inscrito reinscribe
idempotente y abre). El dedupe sigue solo en "Descubrir" de la home (teaser). **Sidebar:** la entrada
"Explorar" se repuntó de `/general` → `/explorar` (única línea). **`/general` queda solo para anónimos**
(sigue top-level sin gate, con cabecera propia; el gate de `(plataforma)` ya manda allí al anónimo):
rediseño hero-céntrico (§13, fundamentado con ui-ux-pro-max landing) — fondo crema (`bg-fondo`), cabecera
con logo + CTA (Google si anónimo / "Ir a mi plataforma" si logueado), HERO de marca `bg-sidebar` con
motivo Ψ decorativo, eyebrow naranja, titular tesis ("Habilidades que se practican, no solo se aprenden."),
subtítulo y UN CTA dominante; debajo "Cursos disponibles" + `<ExploradorPublico sesionActiva={!!session}>`.
Sin estadísticas inventadas (§13). **Verificación:** `type-check -w @amatla/web` en verde + smoke HTTP con
dev server real: `/general` (anónimo) → 200 con hero (tesis), buscador y CTA Google; `/explorar`
(dev-login estudiante) → 200 con título "Explorar", buscador, dentro del shell, y el sidebar con
`href="/explorar"`. 237 tests siguen en verde (solo UI, sin tests nuevos). Commit `feat:` (añade ruta
Explorar in-shell + búsqueda del catálogo público).

### ADR — 2026-06-14 (sesión 10, rediseño) — Bloque 4: home (hero + Descubrir) + login solo-Google (redisenio §4,§13,§14 + decisión §3.1)
**Alcance:** frontend (ejecutor Sonnet 4.6; orquestador planificó/revisó/verificó/commiteó). Sin cambios de
schema ni routers → no se recompiló la API. **Home (`(plataforma)/page.tsx`):** trae en `Promise.all`
`estudiante.dashboard()` + `catalogo.publicos()` (rendimiento). **Progreso global REAL (§14)** calculado en
la página, ponderado por nº de lecciones (`Σ progreso·lecciones / Σ lecciones`) — sin tocar el router
(dashboard no expone un % global directo). **Hero de bienvenida (§4 A1, nuevo `hero-bienvenida.tsx`):**
card BLANCA, eyebrow teal "Bienvenido de nuevo", "Hola, {nombre}" (nombre en teal), línea con el % real,
botón outline teal "Continuar: {curso} →" (solo si hay `enCurso`), y anillo SVG de progreso global (arco
naranja, track `var(--color-borde)`, 120px) conservando la animación `anillo-respira`. Reemplaza el uso de
`HeroContinuar`; **`hero-continuar.tsx` ELIMINADO** (grep confirmó que ya no se importaba). **Sección
"Descubrir" inline (decisión §3.1, nuevo `descubrir.tsx`):** cabecera con icono Compass + reusa
`CatalogoPublico` con `sesionActiva=true`; **dedupe** excluyendo los cursos ya inscritos (cruce de ids con
`cursos`); si queda vacío no se renderiza. **Fix muro vacío (§3.1):** la home solo renderiza el `Catalogo`
de asignados si hay inscripciones; sin inscripciones muestra un banner de bienvenida cálido (NUNCA el viejo
"tu terapeuta te asignará"). `SesionesVivo`/`LineaAyuda` intactos. **Aviso de login amistoso (§13, a
petición del usuario):** en `catalogo-publico.tsx` se sustituyó el `window.alert` del clic anónimo por un
MODAL accesible (`role=dialog`, `aria-modal`, cierre por X/overlay) con copy de marca DBT.Amatla, icono
`Sparkles` en `bg-naranja-suave`, y UN solo CTA "Continuar con Google" → `/iniciar-sesion`. (Este componente
es compartido: en la home el usuario está logueado → el modal nunca aparece ahí; aplica a `/general`
anónimo, adelantando trabajo del Bloque 5.) **Login solo-Google (a petición del usuario, `iniciar-sesion/
page.tsx`):** se eliminó de la UI el formulario de magic link (input de correo + botón) y el separador "o";
queda solo el botón "Continuar con Google" (ahora CTA primario) + subtítulo nuevo. El server action
`enviarEnlaceMagico` (`acciones/auth.ts`) NO se tocó (sigue disponible, solo oculto de la UI); la página
`enlace-enviado` queda huérfana pero inofensiva. **OJO:** Google OAuth aún requiere credenciales locales
para funcionar (ver PENDIENTES.md); en local se prueba el lado logueado con `/api/dev-login`. **Verificación:**
`type-check -w @amatla/web` en verde + smoke HTTP con dev server real: `/iniciar-sesion` muestra "Continuar
con Google" y YA NO el botón/input de magic link (subtítulo nuevo presente); `/` (dev-login estudiante) →
200 con "Progreso global" y "Descubrir", sin el muro vacío. 237 tests siguen en verde (sin tests nuevos:
solo UI). Commit tipo `feat:` (añade la sección Descubrir y el progreso global real). (Entorno: un `next dev`
viejo seguía en el 3000 dando 500; el server fresco corrió en 3001.)

### ADR — 2026-06-14 (sesión 10, rediseño) — Bloque 3: rediseño de sidebar + topbar + avatar real + stubs (redisenio §2,§3,§14)
**Alcance:** SOLO frontend (ejecutor Sonnet 4.6; orquestador planificó/revisó/verificó/commiteó). Sin
cambios de schema ni routers → no se recompiló la API. **Avatar real (§14):** `session.user.image` se
propaga `layout → app-shell (UsuarioShell.imagen) → sidebar (48px) + topbar (36px)`; sin foto → iniciales
en `bg-naranja-suave text-naranja`. **Topbar (§3, `header.tsx`):** se ELIMINÓ `MOCK_PROGRESS=35` y la
barra de progreso falsa (decisión del usuario: el progreso global real vive en el anillo del hero de la
home, Bloque 4 — no se mete un `estudiante.dashboard()` por navegación porque `apiServer()` no está
cacheado y choca con el requisito de rendimiento percibido). Topbar nuevo = hamburguesa móvil + search
pill DECORATIVO (`<div>` no interactivo "Buscar cursos…"; la búsqueda funcional §14 irá en Bloque 4 home
y Bloque 5 explorar, donde están los datos cargados) + iconos decorativos Bell/Bookmark (regla de oro:
decoración sin lógica permitida, `aria-hidden`) + avatar; si `SUPER_ADMIN` muestra nombre + "Administrador"
a la izquierda del avatar. **Sidebar (§2, `sidebar.tsx`):** header con avatar + wordmark `DBT.Amatla`
(link a `/`) + subtítulo. Nav reestructurado (§3.3/§3.4): se QUITÓ "Mis cursos" (ruta inexistente);
base = Inicio (`/`) + Explorar (`/general`); +Panel de instructor (`/instructor`) para INSTRUCTOR/
SUPER_ADMIN; +Administración (`/admin/usuarios`) para SUPER_ADMIN; grupo inferior tras `flex-1` con los
3 stubs Calendario/Notificaciones/Configuración. Estado activo §2 = `bg-white/10 border-l-[3px]
border-naranja pl-[13px]` (antes era teal sólido). Se OMITIÓ el botón CTA "Continuar" de §2 (sin destino
real a nivel de layout → regla de oro, nada de botones muertos). **Explorar sigue → `/general`** por ahora
(Bloque 5 lo repuntará a la versión in-shell). **Fondo crema global (§1):** `<main>` del shell pasa a
`bg-fondo` — resuelve el pendiente del Bloque 2 sin tocar `body` (sidebar oscuro + topbar blanco +
contenido crema). **Stubs "Próximamente":** componente compartido `components/layout/proximamente.tsx`
(server, presentacional: card + icono en `bg-teal-suave`, eyebrow, H1 `text-display`, body) + 3 páginas
server `(plataforma)/{calendario,notificaciones,configuracion}/page.tsx`. **Verificación:**
`type-check -w @amatla/web` en verde + smoke HTTP con dev server real (dev-login): `/`, `/calendario`,
`/notificaciones`, `/configuracion`, `/admin/usuarios` → 200; confirmado en el HTML que el admin ve
"Administración"/"Administrador"/search pill y la stub "Próximamente"; que `35% completado` (mock) y
"Mis cursos" YA NO aparecen; y que el estudiante NO ve "Administración" ni "Panel de instructor" pero sí
"Inicio". (Nota de entorno: un proceso `next dev` viejo ocupaba el 3000 dando 500; el dev server fresco
con estos cambios corrió en 3001.) Sin tests nuevos (solo visual). 237 tests siguen en verde.

### ADR — 2026-06-14 (sesión 10, rediseño) — Bloque 2: tokens del sistema de diseño (redisenio §1)
**Alcance:** SOLO tokens, cambio 100% aditivo (ejecutor Haiku 4.5; orquestador revisó/verificó/commiteó).
2 archivos. **Decisión de naming (orquestador, aprobada por el usuario):** se CONSERVAN los tokens
previos (`brand.*`, `neutral.*`, `danger`) para no romper vistas existentes (se rediseñan en bloques
3–9) y se AÑADE el set semántico de §1 para que los ejecutores siguientes usen clases intuitivas.
**globals.css** (`:root`): nuevos `--color-teal-suave #e8f4f0`, `--color-naranja-suave #fef3dc`,
`--color-blanco #ffffff`, `--color-texto #1a1a1a`, `--color-texto-suave #6b6b6b`, `--color-borde
#e5e0d8`, `--color-crema-hover #f2e4c4`; y alias `--color-fondo/sidebar/teal/naranja` que apuntan a
los `--color-brand-*` ya existentes (misma fuente de verdad del color, sin hex duplicado divergente).
**tailwind.config.ts** (`theme.extend.colors`): `fondo`, `sidebar`, `teal{DEFAULT,suave}`,
`naranja{DEFAULT,suave}`, `blanco`, `texto{DEFAULT,suave}`, `borde`, `crema-hover` → habilitan
`bg-naranja-suave`, `border-borde`, `text-texto-suave`, etc. **Tipografía:** se MANTIENEN las familias
(Inter sans + Lora serif — ya profesionales/legibles para la voz clínica adulta; el skill ui-ux-pro-max
solo sugería pares "playful/kids", descartados); se AÑADE `theme.extend.fontSize` con las escalas de §1:
`display` (36px/700), `heading` (24px/600), `eyebrow` (11px/600 +tracking uppercase), `body` (15px),
`caption` (13px). `extend.fontSize` se MERGEA con los defaults de Tailwind (text-sm/base/lg… siguen
válidos). **Skill ui-ux-pro-max (color):** validó la dirección — el arquetipo "Online Course/E-learning"
es exactamente teal=progreso + naranja=logro; guardrail WCAG anotado (el naranja va como fondo/acento
con texto oscuro o blanco, nunca como texto pequeño sobre blanco — los tokens naranja vs naranja-suave
ya lo reflejan). **NO se tocó `body`** (decisión: el fondo crema global de §1 se resuelve en Bloque 3
sidebar/shell y Bloque 4 home; este bloque solo deja el token disponible). **Verificación:**
`npm run type-check -w @amatla/web` en verde (cambios aditivos → clases `brand-*` existentes intactas).
Sin tests nuevos (solo tokens). 237 tests siguen en verde. Pendiente bloques siguientes: §3.1–§3.4
(navegación: home con "Descubrir", Explorar en shell, quitar "Mis cursos", stubs "Próximamente").

### ADR — 2026-06-14 (sesión 10, rediseño) — Bloque 1: FIX §15 sección/lección sin reload
**Bug:** al crear una sección, el estado optimista de `components/instructor/estructura-secciones.tsx`
usaba un id temporal (`tmp-${Date.now()}`). Crear una lección en esa sección recién creada fallaba
("Sección no encontrada") hasta recargar, porque ese id no era el real de BD. **Diagnóstico:** el
procedure `secciones.crear` YA devolvía `{ id }` (sin cambios de backend); el de lecciones
(`crearLeccionAction` + `lecciones-seccion.tsx`) YA propagaba y usaba el id real → ese flujo ya
estaba bien. El fallo era solo en el camino de secciones. **Fix (solo frontend, 2 archivos):**
(1) `acciones/secciones.ts` — `crearSeccionAction` captura `seccion.id` y lo devuelve en
`ResultadoSeccion` (`{ error, id? }`); (2) `estructura-secciones.tsx` — el optimista usa
`r.id ?? tmp-...`. **Verificación:** `type-check -w @amatla/web` en verde + revisión de código
(el patrón idéntico ya funciona desde antes en la creación de lecciones). No requirió tests nuevos
ni tocar tRPC/schema. **Decidido en esta sesión (pendiente de implementar en bloques siguientes):**
modelo de navegación — Inicio muestra cursos inscritos + sección "Descubrir" (catálogo público
inline) para que el usuario nuevo nunca vea muro vacío; Explorar se renderiza dentro del shell (con
sidebar) para logueados, `/general` queda standalone solo para anónimos; se elimina "Mis cursos"
como ítem del sidebar; Calendario/Notificaciones/Configuración pasan a páginas stub "Próximamente"
(sin lógica, sin 404). Favoritos NO se implementa (sin modelo en el schema).

### ADR — 2026-06-14 — Catálogo público "General" + visibilidad de curso (modo orquestador)
**Decisión de producto:** los cursos tienen un eje de visibilidad independiente del status:
`Course.isPublic` (migración `add_course_public`; default false). **Privado** (default) = solo
inscritos via Enrollment (comportamiento histórico, "ocultos"). **Público** = aparece en el
catálogo "General" para cualquier visitante; solo cuenta si `status = PUBLISHED`. Un usuario
logueado que abre un curso público se **auto-inscribe** (reusa Enrollment + progreso); lo privado
sigue requiriendo asignación del instructor.
**Backend** — router `catalogo`: `publicos` (**publicProcedure**, SIN login → cards de cursos
PUBLISHED+isPublic) e `inscribirme` (protectedProcedure, autoinscripción idempotente, NOT_FOUND si
el curso no es público/publicado, audita ASSIGN_COURSE { autoinscripcion:true }). `cursos`: `esPublico`
en `obtener`/`misCursos` + `cambiarVisibilidad` (instructor, ownership, audita UPDATE_COURSE). 8 tests.
**Frontend** — página pública `/general` (TOP-LEVEL, fuera de `(plataforma)`, SIN gate) con cabecera
propia (logo + "Continuar con Google" si anónimo / "Ir a mi plataforma" si logueado) y grid de cards
(`components/publico/catalogo-publico.tsx`): clic anónimo → `alert` "inicia sesión" + push a
`/iniciar-sesion`; clic logueado → `inscribirme` + navega al curso. El gate de `(plataforma)` ahora
redirige a los anónimos a `/general` (antes a `/iniciar-sesion`). Toggle "Hacer público/privado" en
`AccionesCurso` (instructor) + badge Público/Privado en "Mis cursos" + enlace "Explorar" en el sidebar.
**Verificación:** 136 tests API + type-check web + `next build` OK (la ruta `/general` compila como
dinámica). **237 tests** en total. **OJO:** el botón "Continuar con Google" aún no funciona hasta
configurar credenciales OAuth (ver PENDIENTES.md / guía); para probar el lado logueado en local usa
`/api/dev-login`.

### ADR — 2026-06-13 — Vista de progreso del estudiante para el instructor (Fase 4, tarea 4.9)
Cierra las features del MVP. **Backend** — router `progreso` (`packages/api/src/routers/progreso.ts`,
montado en `root.ts`), `instructorProcedure` + `cursoPropio` (ownership): `curso({ cursoId })`
(resumen por estudiante: % completado, lecciones completadas, último acceso = máx `Progress.updatedAt`)
y `estudiante({ cursoId, studentId })` (detalle por sección/lección: estado COMPLETADA/EN_PROGRESO/
PENDIENTE, `completadaEl`, e `intentoQuiz` {score, passed, fecha} para las QUIZ; NOT_FOUND si el
estudiante no está inscrito). 6 tests (RBAC FORBIDDEN, ownership cruzado NOT_FOUND, cálculo de %,
estados, intento de quiz, no inscrito). **Frontend** (server components, sin cliente): página
`/instructor/cursos/[id]/progreso` (tabla/tarjetas con barra de progreso, % , último acceso, "Ver
detalle") y `/instructor/cursos/[id]/progreso/[studentId]` (detalle por sección con icono de estado,
badge de tipo, fecha de completado y resultado del quiz); enlace "Progreso" (icono BarChart3) en la
cabecera del curso del instructor. **Verificación:** 128 tests API + type-check web + smoke HTTP
(resumen y detalle 200 con curso-dev-1/dev-student-1). **229 tests** en total. Modo orquestador
(2 ejecutores Sonnet: backend+tests y frontend; orquestador revisó/verificó/commiteó).

### ADR — 2026-06-13 — Panel de admin (Fase 4, tarea 4.8) — modo orquestador (2 ejecutores)
**Backend** — router `admin` (`packages/api/src/routers/admin.ts`, montado en `root.ts`), TODO
con `adminProcedure` (solo SUPER_ADMIN): `usuarios({ busqueda? })` (lista con filtro por
nombre/email insensible); `cambiarRol({ userId, rol })`; `cambiarEstado({ userId, activo })`.
**Seguridad:** ambas mutaciones invalidan la sesión del afectado borrando sus filas `Session`
(cambio de rol SIEMPRE; al desactivar) → el acceso se corta de inmediato (regla #1/#5); se
PROHÍBE actuar sobre la propia cuenta (BAD_REQUEST, evita que un admin se bloquee/degrade);
NOT_FOUND si el usuario no existe; auditoría `CHANGE_ROLE`/`ACTIVATE_USER`/`DEACTIVATE_USER`
(ya estaban en el catálogo) en la misma transacción que el update + borrado de sesión. 13 tests
nuevos (RBAC FORBIDDEN/UNAUTHORIZED, borrado de Session verificado con count 0, auto-protección,
NOT_FOUND). **Frontend** — `exigirAdmin()` en `guardia.ts`; página `/admin/usuarios` (server,
`exigirAdmin` + `admin.usuarios`); `components/admin/gestion-usuarios.tsx` (client: búsqueda
local, tabla en desktop / tarjetas en móvil, `<select>` de rol y botón activar/desactivar con
`window.confirm` —avisan que cierran la sesión—, estado optimista con reversión, la FILA PROPIA
va deshabilitada y marcada "(tú)"); `acciones/admin.ts`; entrada "Administración" en el sidebar
solo para SUPER_ADMIN. **Verificación:** 122 tests API (10 archivos) + type-check web + smoke
HTTP (admin ve la tabla 200; un STUDENT es redirigido por `exigirAdmin` y NO recibe la tabla;
backend `adminProcedure` lo bloquea también → defensa en profundidad). **223 tests** en total.
**GOTCHA aplicado:** el `turbo build` de la API falla con EPERM (dev server bloquea el DLL de
Prisma en `prisma generate` de `@amatla/db`); se reconstruyó el dist con `npm run build -w
@amatla/api` (solo `tsc`, sin `prisma generate`) para que la web viera el router `admin`.

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