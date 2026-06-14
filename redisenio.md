# 🎨 PROMPT MAESTRO DE REDISEÑO VISUAL — Amatla E-Learning
> Pega esto DESPUÉS del prompt maestro de arquitectura y del arranque de sesión.
> La fuente de verdad es el repo. Verifica antes de actuar.
> Este prompt cubre TODAS las vistas. Trabajarás una por una en el orden indicado.

---

## 0) QUIÉN ERES EN ESTA TAREA

Eres el ORQUESTADOR. No escribes código de implementación.
Planificas → redactas subtarea → ejecutor implementa → tú revisas diff → commit.
Una subtarea a la vez. Nunca dos ejecutores en paralelo.

**Regla de oro de toda esta tarea:**
Si un elemento visual del mockup NO tiene su correspondiente model en Prisma
o procedure en tRPC, NO lo implementes. Omítelo silenciosamente.
Antes de cada subtarea, verifica en el schema qué campos existen realmente.

---

## 0.5) SKILLS DE DISEÑO A USAR (obligatorio)

Tienes DOS skills instaladas; úsalas en TODA decisión visual:

- **`ui-ux-pro-max`** (`.claude/skills/ui-ux-pro-max/`): motor de diseño con base de
  datos (paletas, tipografías, estilos, guidelines UX, product types). Inclúyela
  para decidir layout, color, tipografía, jerarquía y patrones de interacción.
  Tiene scripts Python (Python 3 disponible): consulta la base con, p. ej.
  `python .claude/skills/ui-ux-pro-max/scripts/search.py --domain product "e-learning"`
  o `--domain color`, `--domain typography`, `--stack nextjs`. Úsalo para fundamentar
  el diseño del catálogo público y las vistas nuevas.
- **`frontend-design`** (`.claude/skills/frontend-design/`): criterio de dirección
  de arte para que NO se vea templated. Aplica una voz visual propia de DBT.Amatla
  (clínica, cálida, profesional), no defaults genéricos.

Flujo: como ORQUESTADOR, antes de redactar cada subtarea consulta `ui-ux-pro-max`
(y corre `search.py` si aplica) para fijar tokens/patrón, y resume al ejecutor las
decisiones concretas (no le pidas que "diseñe", dale el patrón ya decidido).
Respeta SIEMPRE la paleta de marca de la sección 1 (es la fuente de verdad del color).

---

## 1) SISTEMA DE DISEÑO UNIFICADO

Estas variables se usan en TODAS las vistas. Defínelas como CSS custom properties
o como tokens de Tailwind en `tailwind.config.ts`. No hardcodees hex en componentes.

### Paleta

```css
--color-fondo:        #F9EDD5;   /* crema, fondo global de todas las páginas */
--color-sidebar:      #1A3A35;   /* verde noche, sidebar y headers oscuros */
--color-teal:         #2E7D6B;   /* acentos, checks, progress activo */
--color-teal-suave:   #E8F4F0;   /* fondos de iconos/badges teal */
--color-naranja:      #F5A623;   /* CTA principal, item activo, highlight */
--color-naranja-suave:#FEF3DC;   /* fondos de iconos/badges naranja */
--color-blanco:       #FFFFFF;   /* superficies de cards */
--color-texto:        #1A1A1A;   /* texto principal */
--color-texto-suave:  #6B6B6B;   /* texto secundario */
--color-borde:        #E5E0D8;   /* bordes de cards y separadores */
--color-crema-hover:  #F2E4C4;   /* hover suave en items */
```

### Tipografía

```
Display (H1 de páginas):    font-size 32-40px, font-weight 700, color texto
Heading  (H2 de secciones): font-size 22-24px, font-weight 600
Subheading (eyebrows):      font-size 11px, font-weight 600,
                            letter-spacing 0.08em, uppercase, color teal
Body:    font-size 15px, line-height 1.6, color texto-suave
Caption: font-size 13px, color texto-suave
```

### Componentes base reutilizados en todas las vistas

**Card superficie:**
background blanco, border 1px solid borde, border-radius 12px,
padding 20px 24px. Sin sombra. Hover en cards clickeables: scale(1.01),
box-shadow 0 4px 16px rgba(0,0,0,0.06), transition 200ms ease.

**Badge de estado:**
- Publicado / Activo:  bg teal-suave, color teal, font-size 11px, uppercase
- Borrador / Inactivo: bg #F0EDE8, color texto-suave
- En Progreso:         bg naranja-suave, color naranja
- Bloqueado:           bg #F0EDE8, color texto-suave
- border-radius 6px, padding 3px 10px

**Botón primario (CTA):**
bg naranja, color blanco, font-weight 600, border-radius 8px,
padding 10px 20px. Hover: bg #E09610. Active: scale(0.98).

**Botón secundario (outline):**
bg transparente, border 1.5px solid borde, color texto, border-radius 8px.
Hover: bg crema-hover.

**Barra de progreso:**
height 6px, bg #E5E0D8, fill naranja (en progreso) o teal (completado),
border-radius 3px.

**Icono contenedor:**
width/height 40px, border-radius 10px, bg teal-suave o naranja-suave.
Ícono dentro: 20px, color teal o naranja según el bg.

**Input de texto:**
bg blanco, border 1px solid borde, border-radius 8px, padding 10px 14px,
font-size 14px. Focus: border-color teal, outline none.

**Tabla:**
Header: font-size 11px, uppercase, letter-spacing 0.06em, color texto-suave,
border-bottom 1.5px solid borde.
Filas: padding 16px 0, border-bottom 1px solid borde, hover bg crema-hover.

---

## 2) SIDEBAR GLOBAL (layout compartido, todas las vistas)

**Archivo:** layout de `(plataforma)`

### Estructura visual

```
┌─────────────────────────┐
│  [avatar circular 48px] │  ← foto de perfil del usuario o iniciales
│  Amatla                 │  ← nombre de la plataforma, 18px bold
│  Clinical DBT Learning  │  ← subtítulo, 12px, rgba(blanco, 0.6)
├─────────────────────────┤
│  🏠 Dashboard           │
│  📖 Modules             │
│  📋 Resources           │
│  📊 Progress            │
│  👥 Community           │
├─────────────────────────┤  ← spacer flex-grow
│  [botón CTA naranja]    │  ← "Continue Learning" full-width
├─────────────────────────┤
│  ⚙  Settings           │
│  ❓ Support             │
└─────────────────────────┘
```

### Estilos del sidebar

- Fondo: verde noche (#1A3A35)
- Width: 240px, fijo
- Todos los textos e íconos: color blanco
- Item inactivo: padding 10px 16px, border-radius 8px, color rgba(blanco, 0.75)
  Hover: bg rgba(blanco, 0.07), transition 150ms
- Item activo: bg rgba(blanco, 0.10), border-left 3px solid naranja,
  padding-left 13px (compensa el border), color blanco, font-weight 500
- Avatar: círculo 48px, object-fit cover.
  Sin foto: iniciales en bg naranja-suave, color naranja, font-weight 600
- Botón CTA: bg naranja, color blanco, width 100%, border-radius 8px,
  padding 12px, text-align center, font-weight 600, margin 0 0 16px

### Restricciones

- NO implementes lógica de notificaciones en el sidebar.
- Usa solo los items de nav que YA tienen ruta real en Next.js según el rol.
- No agregues items sin ruta existente.

---

## 3) TOPBAR GLOBAL

**Archivo:** mismo layout de `(plataforma)` que el sidebar

### Estructura visual

```
[SearchBar pill]                   [🔔 notif]  [🔖 bookmark]  [avatar/nombre]
```

- Fondo: blanco, border-bottom 1px solid borde
- SearchBar: bg blanco, border 1px solid borde, border-radius 999px,
  padding 8px 16px, placeholder gris, ícono lupa izquierda. Width 320px max.
  Solo visual — NO implementes lógica de búsqueda.
- Íconos notif y bookmark: 20px, color texto-suave. Sin lógica real.
- Avatar derecha: foto → círculo 36px; sin foto → iniciales bg naranja-suave.
- Si el usuario es SUPER_ADMIN: muestra nombre y rol a la izquierda del avatar.

---

## 4) DASHBOARD DEL ESTUDIANTE

**Archivo:** `apps/web/src/app/(plataforma)/dashboard/page.tsx`

### A1 — Hero de bienvenida (card blanca, border-radius 12px)

Layout dos columnas:

```
Izquierda:                              Derecha:
[eyebrow teal: "BIENVENIDO DE NUEVO"]  [Círculo SVG progreso]
[H1: "Hola,"]                               70%
[H1 teal bold: nombre del usuario]     [PROGRESO GLOBAL caption]
[body: texto motivacional con % real]
[botón outline teal: "Continuar X →"]
```

- % global: lecciones completadas / total lecciones de todos los enrollments activos.
- Sin enrollment activo: no renderizar este bloque.
- Círculo SVG: stroke-dasharray para el arco. Arco: naranja. Fondo: #E5E0D8. Tamaño 120px.

### A2 — Cards de módulos/cursos ("Tus Módulos")

- Grid 3 columnas desktop, 1 columna mobile
- Cada card:
  - Imagen superior (thumbnail si existe en schema; si no: fondo teal sólido)
  - Badge de estado superpuesto arriba izquierda (En Progreso / Completado / Bloqueado)
  - Título y descripción corta (truncada 2 líneas)
  - Si tiene progreso real: barra horizontal + porcentaje numérico
  - En Progreso: botón "Continuar Lección" outline teal
  - Bloqueado: texto italic gris "Completa el anterior para desbloquear"
  - Completado: badge teal + enlace "Revisar Materiales →"
- Hover cards no bloqueadas: scale(1.01) + sombra suave, 200ms ease

---

## 5) DASHBOARD DEL INSTRUCTOR

**Archivo:** ruta real del rol INSTRUCTOR en `(plataforma)`

### B1 — Header de página

- H1 bold 40px: "Instructor Dashboard"
- Subtítulo body descriptivo

### B2 — Cards de métricas (grid 3 columnas)

Cada card:
- Ícono en contenedor teal-suave o naranja-suave (40px, border-radius 10px)
- Badge de variación arriba derecha: "+2 this month" (si el dato existe)
- Label caption: "Active Courses" / "Total Students" / "Avg. Completion Rate"
- Número grande: font-size 32px, font-weight 700
- "Avg. Completion Rate": barra de progreso naranja debajo del número

Datos reales desde procedures existentes. Si el procedure NO existe: mostrar "—".

### B3 — Lista "Mis Cursos" (grid 2 columnas)

Cada card horizontal (imagen izquierda + contenido derecha):
- Imagen del curso (thumbnail si existe; si no: bg crema con ícono placeholder)
- Badge: PUBLISHED (teal) / DRAFT (gris)
- Título H3, 2 líneas max
- Descripción corta truncada, color texto-suave
- Publicado: "X Estudiantes" con ícono de personas
- Borrador: "Last edited X ago" en naranja (solo si existe el campo `updatedAt`)
- Ícono de lápiz para editar, color texto-suave
- Hover: sombra suave, scale(1.005)

---

## 6) COURSE BUILDER (vistas del instructor)

**Archivos:** páginas de creación/edición de cursos del instructor

### C1 — Breadcrumb + Header

- Breadcrumb: "Modules › Create Module" (13px, color texto-suave, › en naranja)
- H1 bold: "Course Builder"
- Subtítulo body
- Botones alineados a la derecha:
  - "Save Draft" outline + ícono disquete
  - "Publish Module" primario naranja + ícono upload

### C2 — Stepper de pasos (General Info / Structure / Quizzes)

- Línea horizontal conectora, color borde
- Paso completado: círculo teal sólido + ✓ blanco
- Paso activo: círculo con número, border teal 2px, bg blanco, texto teal bold
- Paso pendiente: círculo con número, border borde, bg blanco, texto texto-suave
- Label debajo: font-size 12px
- Línea completado→activo: color teal. Línea activo→pendiente: color borde.

### C3 — Panel izquierdo: Module Structure

Card blanca:
- Header: ícono + "Module Structure" + botón "+ Add Section" (outline teal, derecha)
- Descripción pequeña gris
- Lista de secciones con drag handle ⠿ + nombre + íconos editar/visibilidad
  - Sección: bg ligeramente distinto, border-radius 8px, padding 12px 16px
  - Lección dentro de sección: indentada, badge del tipo en naranja-suave/naranja, 11px
  - Botón "+ Add Lesson" debajo de cada sección: dashed border, color teal

### C4 — Panel derecho: Lesson Settings

Card blanca:
- Header: ícono + "Lesson Settings"
- Campo "Title": input de texto
- "Content Type": grid 2×2 de botones seleccionables
  - Ícono arriba + label abajo, border 1px borde, border-radius 8px
  - Seleccionado: border teal 2px, bg teal-suave, color teal
  - Solo los tipos que existen en tu enum de Prisma (VIDEO, TEXT, QUIZ, PDF)
  - NO agregues tipos que no estén en el schema
- Campo condicional según tipo (URL de video, etc.): input text placeholder "https://"
- Botones: "Cancel" outline + "Save Details" teal sólido
- Card inferior "Clinical Flow Tip": ícono 💡 naranja + texto gris

---

## 7) PANEL DE ADMIN — Gestión de Usuarios (tarea 4.8)

**Archivo:** ruta real del rol SUPER_ADMIN en `(plataforma)`

### D1 — Header de página

- H1 bold: "Gestión de Usuarios"
- Subtítulo descriptivo
- Botón primario naranja derecha: "+ Nuevo Usuario" con ícono de persona
  (solo si el procedure de crear usuario existe; si no, omitir el botón)

### D2 — Cards de métricas (grid 4 columnas)

Cada card:
- Ícono en contenedor naranja-suave (40px, border-radius 10px)
- Label caption: "Total Usuarios" / "Activos (30 días)" / "Instructores" / "Estudiantes"
- Número grande 32px bold
- Datos reales desde procedures del router de admin. Sin procedure: mostrar "—".

### D3 — Filtros

- Dropdown "Todos los roles" (select estilizado, border 1px borde, border-radius 8px)
- Dropdown "Estado: Todos"
- Texto derecha: "Mostrando 1-N de X resultados" (caption gris)

### D4 — Tabla de usuarios

Columnas: USUARIO / EMAIL / ROL DE ACCESO / ESTADO / ÚLTIMO ACCESO / ACCIONES

**Header:** uppercase, 11px, letter-spacing 0.06em, color texto-suave,
border-bottom 1.5px solid borde.

**Fila:**
- USUARIO: avatar circular (foto o iniciales bg naranja-suave) + nombre bold
  + "ID: AM-XXXX" caption gris (solo si el campo ID existe y es visible)
- EMAIL: 14px
- ROL: dropdown select inline, border 1px borde, border-radius 6px
  (solo si el procedure de cambiar rol existe)
- ESTADO: badge "Activo" (punto verde + teal-suave) o "Inactivo" (punto rojo + rojo-suave)
- ÚLTIMO ACCESO: caption gris ("Hoy, HH:MM" / "Ayer" / "Hace X días")
  Solo si existe el campo `lastLoginAt` o equivalente en el schema. Si no: omitir columna.
- ACCIONES: ícono lápiz teal (si existe la ruta de edición)

**Paginación:**
"< Anterior" outline + números de página (activo: bg naranja, color blanco) + "Siguiente >"
Solo si el procedure devuelve paginación real. Si no: omitir.

---

## 8) QUIZ UI DEL ESTUDIANTE (parte visual de la tarea 4.7)

**Componente:** `apps/web/src/components/cursos/quiz-estudiante.tsx`

### E1 — Header del quiz

- Eyebrow uppercase teal: nombre del módulo
- Badge derecha: "Requiere X%" con el passingScore real del schema
- H2: "Evaluación: [nombre de la lección]"
- Barra de progreso naranja + "Pregunta N de Total"

### E2 — Cards de opción (NO radios nativos del browser)

- Card blanca, border 1px solid borde, border-radius 10px, padding 16px 20px
- Izquierda: círculo radio custom (20px) + letra bold teal (A. B. C. D.)
- Derecha: texto de la opción, font-size 15px
- Estado seleccionado: border 2px solid naranja, bg naranja-suave,
  círculo relleno naranja con punto blanco interior
- Hover (no seleccionada): bg crema-hover, transition 150ms
- Gap entre cards: 12px

### E3 — Navegación

- "Anterior" outline gris, izquierda
- "Siguiente →" naranja sólido, derecha
- Última pregunta: "Enviar" en lugar de "Siguiente"
- "Enviar" deshabilitado si hay preguntas sin responder:
  opacity 0.5, cursor not-allowed (no solo el atributo disabled)

### E4 — Pantalla de resultado (post-envío)

- Score grande centrado: "X / Y"
- "Aprobado ✓" en teal bold / "Reprobado" en rojo suave
- Por pregunta: indicador visual correcta (verde suave) vs incorrecta (rojo suave)
  con texto de la opción correcta visible DESPUÉS del envío
- Si reprueba: botón "Intentar de nuevo" outline naranja
- Si aprueba: mensaje de éxito teal + router.refresh()

---

## 9) RESTRICCIONES ABSOLUTAS (aplican a todo el rediseño)

1. NO instales librerías de animación. Solo CSS transitions y clases Tailwind.
2. NO cambies schema de Prisma. NO toques routers tRPC.
3. NO implementes features sin model en el schema:
   notas cifradas, comunidad, certificados, bookmarks, búsqueda real,
   notificaciones push. La UI de esos íconos puede existir como decoración
   estática, pero sin lógica.
4. NO hagas commit. El orquestador decide cuándo.
5. NO mezcles `next build` con `next dev` sobre el mismo `.next`.
6. Tras cambiar cualquier router de @amatla/api:
   `npx turbo run build --filter=@amatla/api`
7. Una subtarea a la vez. Espera aprobación del orquestador entre cada una.

---

## 10) ANTES DE CREAR LA PRIMERA SUBTAREA

Como orquestador, lee estos archivos en este orden:

```
packages/db/prisma/schema.prisma
  → qué modelos y campos existen (thumbnail, lastLoginAt, status, etc.)

packages/api/src/routers/
  → qué procedures existen por rol (admin, instructor, estudiante)

apps/web/src/app/(plataforma)/layout.tsx
  → cómo está el sidebar y topbar actualmente

apps/web/src/app/(plataforma)/dashboard/page.tsx
  → qué datos ya se cargan en el dashboard

apps/web/src/components/cursos/
  → qué componentes de lección ya existen
```

Después de leer, reporta:
1. Qué campos del schema corresponden a cada sección del diseño
2. Qué vistas tienen procedures listos y cuáles no
3. Qué elementos de los mockups debes omitir porque no tienen soporte en el schema
4. El orden exacto en que vas a trabajar los bloques y por qué

**Espera aprobación antes de redactar la primera subtarea de ejecutor.**

---

## 11) ORDEN DE EJECUCIÓN SUGERIDO

```
[TÚ]     Lee los 5 archivos del paso 10. Reporta hallazgos.
         → Aprobación del usuario

[Haiku]  subtask-diseño-tokens.md
         → tailwind.config.ts: agregar tokens de color y tipografía
         → globals.css: CSS custom properties del sistema de diseño
         commit: "style: tokens sistema de diseño Amatla"

[Haiku]  subtask-diseño-sidebar.md
         → layout (plataforma): sidebar + topbar con estilos reales
         commit: "style: sidebar y topbar global"

[Sonnet] subtask-diseño-dashboard-estudiante.md
         → dashboard/page.tsx: hero + círculo SVG + cards de módulos
         commit: "style: dashboard estudiante"

[Sonnet] subtask-diseño-dashboard-instructor.md
         → instructor dashboard: métricas + lista de cursos
         commit: "style: dashboard instructor"

[Haiku]  subtask-diseño-course-builder.md
         → course builder: stepper + panel estructura + lesson settings
         commit: "style: course builder"

[Sonnet] subtask-diseño-admin-usuarios.md
         → admin usuarios: métricas + tabla + paginación
         commit: "style: panel admin gestión usuarios"

[Sonnet] subtask-diseño-leccion.md
         → página de lección: sidebar índice + estados visuales
         commit: "style: layout lección con índice visual"

[Sonnet] subtask-diseño-quiz.md
         → quiz-estudiante.tsx: radios estilizados + pantalla de resultado
         (ejecutar después de que la tarea 4.7 esté funcionando)
         commit: "style: quiz UI diseño final"

[TÚ]     Smoke test visual: recorre cada vista con dev-login
         como estudiante, instructor y admin. Reporta inconsistencias.

[TÚ]     STATUS.md: ADR del sistema de diseño implementado.
```

---

## 12) FORMATO DE CIERRE DE CADA BLOQUE (protocolo)

Al terminar cada bloque de diseño, reporta exactamente así:

```
✅ Bloque [nombre] completado.
STATUS.md actualizado (ADR añadido).
Tests visuales: [descripción breve de lo verificado].
Lo que sigue es [siguiente bloque].
¿Procedo?
```

---

## 13) CATÁLOGO PÚBLICO "GENERAL" (NUEVO — prioridad alta)

**Archivos:** `apps/web/src/app/general/page.tsx` (página pública, sin gate) +
`apps/web/src/components/publico/catalogo-publico.tsx`. Ya FUNCIONA (lista
`catalogo.publicos`, autoinscripción al abrir si logueado, alerta si anónimo),
pero la interfaz es básica. Rediséñala para que se vea **profesional**.

- **Top bar pública:** logo Amatla a la izquierda; a la derecha "Continuar con
  Google" (anónimo) o "Ir a mi plataforma" (logueado). Aplica el sistema de diseño.
- **Hero (landing):** abre con una tesis de la marca (no un hero template). Usa
  `ui-ux-pro-max` (`--domain product "e-learning"` / `landing`) + `frontend-design`
  para una propuesta distintiva, cálida y clínica. Titular + subtítulo + CTA. Nada
  de stats inventadas: solo contenido real.
- **Grid de cards:** cards profesionales con thumbnail (o arte generativo de
  respaldo), eyebrow de categoría, título, instructora, "N lecciones · duración",
  hover scale+sombra. Coherente con la "Card superficie" de la sección 1.
- **Búsqueda funcional:** campo de búsqueda que filtra las cards client-side por
  título/categoría (sobre lo ya cargado). Ver sección 14.
- **Clic anónimo:** conserva la lógica (debe iniciar sesión) pero cámbiala de
  `window.alert` a un aviso/modal/toast estilizado dentro del sistema de diseño.
- **Estado vacío:** mensaje + ilustración simple cuando no hay cursos públicos.
- **Restricción:** solo `PUBLISHED && isPublic` (procedure `catalogo.publicos`, ya
  existe). NO requiere backend nuevo.

---

## 14) FIXES FUNCIONALES (no solo estética — IMPLEMENTAR)

Estos son funcionales y son EXCEPCIÓN explícita a "no toques lógica": hazlos.

- **Búsqueda de cursos (funcional):** la search del topbar y la del catálogo deben
  filtrar de verdad. En la vista del estudiante donde ve sus cursos asignados con
  barra de progreso (`(plataforma)/page.tsx` / catálogo del estudiante) y en
  `/general`, filtra client-side por título/categoría sobre los cursos YA cargados.
  No implementes búsqueda server-side global; solo filtra lo que ya se trae.
- **Header de progreso REAL:** hoy `components/layout/header.tsx` usa
  `MOCK_PROGRESS = 35`. Hazlo real: progreso GLOBAL del estudiante (lecciones
  completadas / total de sus enrollments). Cárgalo donde corresponda (el layout o un
  procedure existente del estudiante). Para INSTRUCTOR/ADMIN (sin "progreso de
  curso") oculta la barra o cámbiala por contexto apropiado. No inventes datos.
- **Fotos de perfil (avatar real):** el schema tiene `User.image` (lo llena Google
  OAuth) y la sesión ya expone `image`. Renderiza la foto:
  - Sidebar y topbar: si `session.user.image` → `<img>` círculo (object-fit cover);
    si no → iniciales en bg naranja-suave.
  - **Panel admin (tabla de usuarios):** muestra el avatar de cada usuario. Esto
    REQUIERE añadir `image` al output de `admin.usuarios` y pasarlo a
    `gestion-usuarios.tsx`. **Excepción puntual permitida** a "no toques routers":
    es el cambio mínimo de tRPC para mostrar el avatar (tras tocar el router:
    `npx turbo run build --filter=@amatla/api`, ojo EPERM si hay dev corriendo).

---

## 15) FIX FUNCIONAL — sección/lección sin reload

**Bug:** en `components/instructor/estructura-secciones.tsx`, al crear una sección
se mete al estado optimista con un id temporal (`tmp-${Date.now()}`). Al intentar
crear una lección en esa sección recién creada, falla ("no hay secciones") hasta
recargar, porque ese id no es el real de BD.
**Fix:** usa el `id` REAL que devuelve `crearSeccionAction` (`{ error, id }`) en el
estado optimista en vez del id temporal. Verifica que la acción devuelva el id (si
no, ajústala) y que crear una lección en una sección recién creada funcione SIN
reload. Revisa el mismo patrón en la creación de lecciones por si aplica.

---

## 16) RUTAS REALES (verificado — corrige las que el prompt asuma distinto)

- Home del estudiante: `apps/web/src/app/(plataforma)/page.tsx` (NO existe `/dashboard`).
- Dashboard instructor: `apps/web/src/app/(plataforma)/instructor/page.tsx`.
- Admin usuarios: `apps/web/src/app/(plataforma)/admin/usuarios/page.tsx` + `components/admin/gestion-usuarios.tsx`.
- Quiz estudiante: `apps/web/src/components/cursos/quiz-estudiante.tsx` (ya funciona — tarea 4.7).
- Sidebar/topbar/shell: `apps/web/src/components/layout/{sidebar,header,app-shell}.tsx`.
- Catálogo público: `apps/web/src/app/general/page.tsx` + `apps/web/src/components/publico/catalogo-publico.tsx`.
- Progreso instructor: `(plataforma)/instructor/cursos/[id]/progreso/...`.
VERIFICA siempre en el repo antes de editar.

---

*Prompt de rediseño visual completo · Amatla E-Learning*
*Basado en los 6 mockups de referencia del proyecto + catálogo público (sesión 9)*
*Generado: 2026-06-13 · Actualizado: 2026-06-14 (skills UI/UX + catálogo público + fixes funcionales)*