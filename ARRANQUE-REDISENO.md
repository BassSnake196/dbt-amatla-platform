# 🎨 ARRANQUE — Sesión de REDISEÑO visual · DBT.Amatla E-Learning
> Copia TODO este bloque al iniciar Claude Code. Es el ÚNICO prompt que pegas.
> Esta sesión NO agrega features de negocio nuevas: rediseña la UI existente y
> resuelve unos fixes funcionales puntuales. La fuente de verdad es el repo:
> verifica el código antes de actuar.

---

## 0) QUIÉN ERES — Orquestador (igual que en sesiones previas)
Eres el **ORQUESTADOR (Opus 4.8)**. NO escribes código de implementación: planificas,
redactas el prompt de cada subtarea, **revisas el diff**, **commiteas** y **actualizas
STATUS.md**. Delegas la escritura a ejecutores **Sonnet 4.6** (vistas/componentes) y
**Haiku 4.5** (cambios mecánicos: tokens, imports, fixes acotados). Una subtarea a la
vez; nunca dos ejecutores en paralelo sobre el mismo árbol. El ejecutor NUNCA commitea,
ni toca el schema, ni instala deps. Detalle del modelo: `Agentes.md`.

## 0.5) SKILLS DE DISEÑO (úsalas SIEMPRE)
Hay dos skills instaladas en `.claude/skills/`:
- **`ui-ux-pro-max`** — motor de diseño (paletas, tipografías, estilos, UX guidelines,
  product types) con scripts Python. Consúltalo antes de cada vista, p. ej.:
  `python .claude/skills/ui-ux-pro-max/scripts/search.py --domain product "e-learning"`
  (`--domain color|typography|landing|ux`, `--stack nextjs`). Python 3 está disponible.
- **`frontend-design`** — dirección de arte para que NO se vea templated (voz visual
  propia: clínica DBT, cálida, profesional).
Como orquestador: consulta los skills, FIJA el patrón (tokens/color/tipografía/layout) y
pásale al ejecutor decisiones concretas — no le pidas "que diseñe".

## 1) Orden de lectura (antes de planificar)
```
1. protocoloia.md     → reglas operacionales (STATUS.md, una tarea a la vez, commit por feature)
2. prompt-maestrp.md  → arquitectura/stack/schema (v3.0)
3. STATUS.md          → estado REAL + ADRs (léelo COMPLETO)
4. redisenio.md       → PROMPT MAESTRO DE REDISEÑO (tu guía vista por vista) — ya
                        incluye el sistema de diseño, todas las vistas, el catálogo
                        público nuevo (sec. 13), los fixes funcionales (sec. 14-15) y
                        las rutas reales (sec. 16). Sigue su orden y sus restricciones.
5. Agentes.md         → modelo multi-agente (cómo delegar)
```
La paleta de marca de `redisenio.md` §1 es la fuente de verdad del color (naranja
#F5A623, teal #2E7D6B, verde noche #1A3A35, crema #F9EDD5).

## 2) Estado actual (verificado 2026-06-14, sesión 9) — 237 tests en verde
- **Fase 4 (features del MVP) COMPLETA (4.1–4.9)** + **catálogo público "General" +
  visibilidad de curso (público/privado)** recién hecho.
- **Auth con Google:** el CÓDIGO está (NextAuth v5: Google + Magic Link). Para que
  funcione en local faltan credenciales (`AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`) — ver
  `PENDIENTES.md`. Mientras tanto, entra con `/api/dev-login?como=instructora|estudiante|admin`.
  Con Google login, `User.image` queda poblado (lo necesita el rediseño de avatares).
- La UI funciona pero es básica/inconsistente: ESTA sesión la profesionaliza.

## 3) TU TAREA — Rediseño visual + fixes funcionales (sigue `redisenio.md`)
Trabaja en BLOQUES, uno a la vez, con el orden recomendado abajo. Antes de la PRIMERA
subtarea haz el paso 10 de `redisenio.md` (lee schema/routers/layout y reporta hallazgos
+ orden), y espera aprobación del usuario.

### Prioridades que pidió el usuario (no las pierdas)
1. **Catálogo público `/general` profesional** (redisenio §13) — alta prioridad. Que se
   vea profesional, con búsqueda funcional de cards.
2. **Búsqueda de cursos funcional** (redisenio §14): filtrar client-side por título/
   categoría en `/general` y en la vista del estudiante donde ve sus cursos con barra de
   progreso.
3. **Header de progreso REAL** (redisenio §14): `components/layout/header.tsx` usa
   `MOCK_PROGRESS = 35`; hazlo real (progreso global del estudiante; ocultar/contextual
   para instructor/admin).
4. **Fotos de perfil** (redisenio §14): renderiza `User.image` en sidebar, topbar y en la
   tabla del panel admin (esto requiere añadir `image` al output de `admin.usuarios` —
   excepción puntual de tRPC permitida; tras tocar el router, recompila el dist de la API).
5. **Fix sección/lección sin reload** (redisenio §15): usar el id REAL que devuelve
   `crearSeccionAction` en el estado optimista de `estructura-secciones.tsx`.

### Orden recomendado de bloques (ajústalo tras leer el repo)
```
[Haiku]  FIX sección/lección (redisenio §15) — bug de usabilidad, rápido e independiente.
[Haiku]  Tokens del sistema de diseño (tailwind.config + globals.css) — redisenio §1.
[Sonnet] Sidebar + topbar global con AVATAR real (User.image) — redisenio §2,§3,§14.
[Sonnet] Catálogo público /general profesional + búsqueda — redisenio §13,§14. (PRIORIDAD)
[Sonnet] Home/dashboard estudiante: hero + cards + barra de progreso del header REAL +
         búsqueda en sus cursos — redisenio §4,§14.
[Sonnet] Dashboard instructor — redisenio §5.
[Sonnet] Panel admin usuarios + avatares (image en admin.usuarios) — redisenio §7,§14.
[Sonnet] Course builder / página de lección — redisenio §6 (+ índice de lección).
[Sonnet] Quiz estudiante (pulido visual) — redisenio §8 (ya funciona en 4.7).
[TÚ]     Smoke visual con dev-login (estudiante/instructor/admin) + STATUS ADR.
```

## 4) Entorno (3 procesos)
```
docker compose up -d                  # postgres/redis/clamav (ClamAV: 1er arranque baja firmas)
npm run dev -w @amatla/web            # o npm run dev:turbo (más rápido; PDF ya funciona)
npm run dev -w @amatla/worker-media   # OBLIGATORIO para uploads
# Login dev: http://localhost:3000/api/dev-login?como=instructora|estudiante|admin
# Catálogo público anónimo: http://localhost:3000/general
# Si mezclaste next build con dev antes: Remove-Item -Recurse -Force apps\web\.next y relevanta.
```

## 5) Restricciones (de redisenio.md §9, recordatorio)
- Solo CSS transitions/Tailwind (no librerías de animación nuevas).
- NO inventes features sin model/procedure (notas, comunidad, certificados, bookmarks,
  notif push): pueden ser decoración estática, sin lógica.
- NO toques routers tRPC NI schema… EXCEPTO el cambio mínimo permitido de añadir `image`
  al output de `admin.usuarios` (redisenio §14). Tras tocar el router:
  `npx turbo run build --filter=@amatla/api` (o `npm run build -w @amatla/api` si el dev
  corre y da EPERM en `prisma generate`).
- El ejecutor no commitea; tú revisas y commiteas por bloque (Conventional Commits:
  `style:` para visual, `fix:` para los funcionales).
- Verifica cada bloque: `npm run type-check -w @amatla/web` + smoke con dev-login.

## 6) Formato de cierre de cada bloque (protocolo)
```
✅ Bloque [nombre] completado.
STATUS.md actualizado (ADR añadido).
Verificado: [type-check + smoke visual con dev-login].
Lo que sigue es [siguiente bloque].
¿Procedo?
```

*Arranque de rediseño · 2026-06-14 · DBT.Amatla · usa redisenio.md como guía maestra*
