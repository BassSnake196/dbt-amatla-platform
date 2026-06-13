# PROMPT MAESTRO v3.0 — Plataforma E-Learning de Psicología Clínica
> MVP enfocado: plataforma tipo Udemy para subir cursos, consumirlos y medir progreso.
> La IA conversacional (chatbot) se eliminó del MVP — se retoma en una fase futura opcional.
> Copia este prompt completo al iniciar Claude Code. No omitas ninguna sección.

---

## 🧠 CONTEXTO DEL PROYECTO

Eres el arquitecto principal y desarrollador senior de una **plataforma de cursos en línea especializada en psicología clínica**, pensada para terapeutas, pacientes en entrenamiento y estudiantes del área de salud mental. El cliente principal es **DBT.Amatla**, un centro de entrenamiento en habilidades DBT (Terapia Dialéctico Conductual) con modalidad RO (Radically Open), dirigido por psicólogas clínicas certificadas en México.

La plataforma debe funcionar en **web (escritorio y móvil-web)** con una **app nativa iOS/Android** prevista para una fase posterior al MVP. Debe sentirse cálida, profesional y accesible. La identidad visual usa la paleta de DBT.Amatla: naranja cálido `#F5A623`, verde teal oscuro `#2E7D6B`, crema suave `#F9EDD5`, verde noche `#1A3A35`.

**Escala real del proyecto al arranque:** < 100 estudiantes, 5 instructores. El diseño debe ser robusto pero sin sobredimensionar la infraestructura. Cada decisión debe justificarse por necesidad real, no por aspiración técnica.

**Alcance del MVP (qué se construye ahora):**
- Instructor sube cursos con secciones y lecciones (texto enriquecido, video, PDF/PPTX)
- Estudiante consume el contenido, marca lecciones como terminadas y ve su progreso
- Progreso secuencial: no se puede avanzar a la siguiente lección sin completar la actual
- El video recuerda la posición exacta del estudiante y no permite saltar hacia adelante
- Lecciones tipo QUIZ: el instructor crea preguntas de opción múltiple (A/B/C/D) con respuesta correcta; el estudiante debe aprobar para marcar la lección como completada
- El instructor asigna cursos a estudiantes y puede ver su progreso
- **La IA conversacional (chatbot de estudio) NO es parte del MVP** — se planifica para una fase futura

---

## 🏗️ STACK TECNOLÓGICO FIJO

No propongas alternativas. Usa exactamente este stack:

```
MONOREPO:        Turborepo
FRONTEND WEB:    Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
APP MÓVIL:       React Native con Expo SDK 52 + Expo Router + Expo Video  [Post-MVP]
BACKEND:         Node.js 22 + Fastify + tRPC + Zod
ORM:             Prisma 5 con PostgreSQL 16
CACHE / COLAS:   Redis 7 (Upstash en prod) + BullMQ
AUTENTICACIÓN:   NextAuth.js v5 (web) + JWT refresh tokens (móvil)
STORAGE VIDEO:   Cloudflare Stream (HLS adaptativo, signed URLs)
STORAGE FILES:   Cloudflare R2 (PDFs, imágenes, materiales — compatible S3)
PROCESAMIENTO:   BullMQ workers + Sharp.js (imágenes) + FFmpeg (thumbnails)
CIFRADO:         Node.js crypto (AES-256-GCM) para field-level encryption
ANÁLISIS PDF:    pdf-parse + ClamAV (sanitización antes de R2)
IA:              [RESERVADO — Post-MVP] Anthropic SDK — claude-sonnet-4-20250514
SAFETY IA:       [RESERVADO — Post-MVP] Pipeline de clasificación de contenido sensible
CORREO:          Resend (transaccional)
NOTIF. PUSH:     Expo Notifications + Firebase FCM  [Post-MVP]
MONITOREO:       Sentry (errores) + Axiom (logs estructurados)
PRUEBAS:         Vitest (unit) + Playwright (E2E web) + k6 (carga)
DEV/STAGING:     Railway + Docker Compose local
PROD FRONTEND:   Vercel
PROD BACKEND:    Railway Pro o Fly.io
PROD DB:         Supabase (PostgreSQL managed + backups automáticos)
CI/CD:           GitHub Actions (workflows separados web / mobile / backend)
```

---

## 📁 ESTRUCTURA DEL MONOREPO

```
/
├── apps/
│   ├── web/                      # Next.js 15 — plataforma web
│   └── mobile/                   # Expo React Native — iOS / Android [Post-MVP]
├── packages/
│   ├── api/                      # tRPC router + Fastify server
│   ├── db/                       # Prisma schema + cliente compartido
│   ├── crypto/                   # Módulo de cifrado AES-256-GCM (field-level)
│   ├── ai-safety/                # [RESERVADO Post-MVP] Pipeline de clasificación
│   ├── shared/                   # Types, utils, constantes compartidas
│   ├── ui/                       # Componentes compartidos (shadcn base)
│   └── config/                   # ESLint, TypeScript, Tailwind, env configs
├── workers/
│   ├── media/                    # BullMQ — procesamiento video/imágenes
│   └── ai/                       # [RESERVADO Post-MVP] tareas asíncronas de IA
├── tests/
│   ├── integration/              # Vitest — flujos críticos de negocio
│   ├── e2e/                      # Playwright — flujos de interfaz
│   └── load/                     # k6 — simulaciones de carga y estrés
├── .github/
│   └── workflows/
│       ├── ci-web.yml            # CI/CD para Next.js → Vercel
│       ├── ci-backend.yml        # CI/CD para Fastify → Railway/Fly.io
│       ├── ci-mobile.yml         # CI/CD para Expo → EAS Build [Post-MVP]
│       └── security-scan.yml     # Escaneo SAST + dependencias (Snyk/CodeQL)
├── docker-compose.yml            # PostgreSQL 16 + Redis 7 + pgAdmin + ClamAV
├── turbo.json
└── package.json
```

---

## 👥 SISTEMA DE ROLES Y PERMISOS (RBAC)

Implementar middleware de autorización en **cada** endpoint tRPC mediante un `protectedProcedure` tipado. Los roles son:

| Rol | Descripción | Permisos clave |
|-----|-------------|----------------|
| `SUPER_ADMIN` | Dueño/a de la plataforma | Todo. Usuarios, configuración global, dashboard de uso |
| `INSTRUCTOR` | Terapeuta / creador de contenido | CRUD de sus propios cursos. Analytics de sus cursos. Asignar estudiantes |
| `MODERATOR` | Co-terapeuta / asistente | Ver contenido, ver progreso de estudiantes asignados |
| `STUDENT` | Paciente / alumno | Solo ve módulos asignados. Progreso secuencial. Descargar materiales. Certificados |

**Reglas críticas de negocio — validar en CADA resolver, no solo en middleware:**
- Un `STUDENT` solo accede a módulos que su terapeuta le asignó explícitamente en tabla `Enrollment`
- Videos: generar signed URL ON-DEMAND, TTL máximo 30 min, NUNCA almacenar la URL en BD
- Un `INSTRUCTOR` no puede leer ni escribir recursos de otro instructor — verificar `instructorId === session.user.id` en cada query
- Un `MODERATOR` no puede crear ni editar contenido de cursos
- Invalidar todos los tokens de un usuario al cambiar su rol o al desactivar la cuenta
- **Progreso secuencial:** un estudiante no puede acceder a la lección N+1 si la lección N no está completada (salvo lecciones marcadas como `isPreview`)

---

## 🗄️ ESQUEMA DE BASE DE DATOS (Prisma)

Los campos marcados con `[ENCRYPTED]` deben almacenarse cifrados con AES-256-GCM via `packages/crypto` antes de persistir en BD.

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  role          Role      @default(STUDENT)
  image         String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Course {
  id            String        @id @default(cuid())
  title         String
  description   String        @db.Text
  thumbnail     String?       // key en R2 (NO la URL)
  status        CourseStatus  @default(DRAFT)
  instructorId  String
  category      String
  totalDuration Int           @default(0)  // segundos
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Section {
  id          String   @id @default(cuid())
  courseId    String
  title       String
  order       Int
  description String?
}

model Lesson {
  id           String      @id @default(cuid())
  sectionId    String
  title        String
  order        Int
  type         LessonType  // VIDEO | PDF | TEXT | QUIZ
  content      String?     @db.Text  // para lecciones TEXT (HTML enriquecido)
  videoId      String?     // ID en Cloudflare Stream (NO la URL)
  fileKey      String?     // Key en R2 (NO la URL firmada)
  duration     Int?        // segundos (para VIDEO — controla el 80% de completado)
  isPreview    Boolean     @default(false)
  allowDownload Boolean    @default(true)  // solo aplica a PDF
}

// Preguntas de un QUIZ — una lección tipo QUIZ tiene N preguntas
model QuizQuestion {
  id            String   @id @default(cuid())
  lessonId      String
  order         Int
  stem          String   @db.Text   // texto de la pregunta
  optionA       String
  optionB       String
  optionC       String
  optionD       String
  correctOption String   // 'A' | 'B' | 'C' | 'D'
  explanation   String?  @db.Text   // explicación opcional de la respuesta correcta
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Intento de un estudiante en un quiz (se guarda el último intento por enrollment+lesson)
model QuizAttempt {
  id           String   @id @default(cuid())
  enrollmentId String
  lessonId     String
  answers      Json     // { questionId: 'A' | 'B' | 'C' | 'D' }
  score        Int      // % de aciertos (0-100)
  passed       Boolean  // score >= passingScore del quiz (default 70)
  attemptedAt  DateTime @default(now())
  @@index([enrollmentId, lessonId])
}

model Enrollment {
  id            String    @id @default(cuid())
  studentId     String
  courseId      String
  enrolledAt    DateTime  @default(now())
  assignedBy    String    // userId del instructor o admin
  completedAt   DateTime?
  certificateId String?
  @@unique([studentId, courseId])
}

model ModuleAccess {
  // Asignación granular: sin filas = acceso al curso completo; con filas = solo esas secciones
  id           String   @id @default(cuid())
  enrollmentId String
  sectionId    String
  grantedAt    DateTime @default(now())
  grantedBy    String
  @@unique([enrollmentId, sectionId])
}

model Progress {
  id             String    @id @default(cuid())
  enrollmentId   String
  lessonId       String
  watchedSeconds Int       @default(0)   // máximo alcanzado — nunca retrocede
  completedAt    DateTime?               // pegajoso: una vez completada, siempre completada
  lastPosition   Int       @default(0)   // segundos — para reanudar; se actualiza libre
  updatedAt      DateTime  @updatedAt
  @@unique([enrollmentId, lessonId])
}

model LessonNote {
  // Notas personales del estudiante por timestamp de video [ENCRYPTED]
  id             String   @id @default(cuid())
  enrollmentId   String
  lessonId       String
  positionSeconds Int
  body           String   @db.Text  // [ENCRYPTED] AES-256-GCM
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([enrollmentId, lessonId])
}

model ClinicalNote {
  // Almacena respuestas a escalas clínicas y notas libres — DATOS SENSIBLES
  id           String   @id @default(cuid())
  studentId    String
  enrollmentId String
  type         String   // 'GHQ12' | 'DASS21' | 'FREE_NOTE' | 'SCALE_OVERCONTROL'
  content      String   @db.Text  // [ENCRYPTED] AES-256-GCM
  score        String?            // [ENCRYPTED] resultado numérico si aplica
  createdAt    DateTime @default(now())
  createdBy    String
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String
  readAt    DateTime?
  createdAt DateTime  @default(now())
}

model Certificate {
  id           String   @id @default(cuid())
  enrollmentId String   @unique
  url          String   // URL pública en R2
  issuedAt     DateTime @default(now())
  verifyCode   String   @unique @default(cuid())
}

model CalendarEvent {
  id        String   @id @default(cuid())
  courseId  String?
  title     String
  startAt   DateTime
  endAt     DateTime
  meetUrl   String?
  createdBy String
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // catálogo cerrado en @amatla/db — ver AUDIT_ACTIONS
  resource   String   // 'Course:abc123' | 'User:xyz789'
  metadata   Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())
}

model FileUpload {
  id          String   @id @default(cuid())
  uploadedBy  String
  r2Key       String   @unique
  fileName    String
  mimeType    String
  sizeBytes   Int
  scanStatus  String   @default("PENDING")  // PENDING | CLEAN | INFECTED | ERROR
  scanResult  String?
  createdAt   DateTime @default(now())
}

enum Role {
  SUPER_ADMIN
  INSTRUCTOR
  MODERATOR
  STUDENT
}

enum CourseStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum LessonType {
  VIDEO
  PDF
  TEXT
  QUIZ
}
```

---

## 🔐 MÓDULO DE CIFRADO — `packages/crypto`

Implementar como la ÚNICA forma de cifrar/descifrar datos sensibles. Nunca cifrar/descifrar inline en los resolvers.

```typescript
// packages/crypto/src/index.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
// Derivación perezosa con caché — scrypt corre una sola vez
let _key: Buffer | null = null
function getKey(): Buffer {
  if (_key) return _key
  const master = process.env.ENCRYPTION_MASTER_KEY
  const salt   = process.env.ENCRYPTION_SALT
  if (!master || !salt) throw new Error('ENCRYPTION_MASTER_KEY / ENCRYPTION_SALT no configurados')
  _key = scryptSync(master, salt, 32)
  return _key
}
export function __resetKeyCache() { _key = null }  // solo para tests

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8')
}

export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null
  return encrypt(value)
}

export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null
  try { return decrypt(value) } catch { return null }
}
```

**Campos que DEBEN cifrarse antes de persistir:**
- `ClinicalNote.content` y `ClinicalNote.score`
- `LessonNote.body` (notas personales del estudiante)
- Cualquier campo de texto libre donde el estudiante escriba sobre su estado emocional

---

## 📤 PIPELINE DE SUBIDA DE ARCHIVOS — Sanitización obligatoria

**Nunca subir un archivo a R2 sin pasarlo por este pipeline:**

```
1. Cliente solicita presigned URL al backend (nombre + tipo MIME)
2. Backend valida:
   - Extensión permitida: .pdf | .pptx | .docx | .jpg | .jpeg | .png | .mp4 | .mov
   - Tamaño máximo: 500MB videos, 50MB documentos, 10MB imágenes
   - MIME real verificado con magic bytes (npm: 'file-type'), no solo extensión declarada
3. Backend registra FileUpload con scanStatus: 'PENDING'
4. Cliente sube directo a R2 con la presigned URL (el archivo NUNCA pasa por el backend)
5. BullMQ job dispara el worker de media:
   - Descarga temporal → ClamAV INSTREAM scan por TCP
   - INFECTED → eliminar de R2, FileUpload.scanStatus = 'INFECTED',
                 Notification al uploader + AuditLog DELETE_FILE (automatico: true)
   - CLEAN     → FileUpload.scanStatus = 'CLEAN', enlazar recurso a lección/curso
6. La lección permanece en PROCESSING hasta scanStatus = 'CLEAN'
7. Los PDFs adicionalmente se verifican como PDFs válidos sin JavaScript embebido (pdf-parse)
```

---

## 🎯 REGLAS DE NEGOCIO DEL MVP — Progreso secuencial y quiz

### Progreso secuencial de lecciones

```
REGLA CORE: una lección está BLOQUEADA si la lección inmediatamente anterior
(orden - 1, dentro de la misma sección o la última de la sección anterior)
NO está completada, EXCEPTO si:
  a) la lección tiene isPreview = true
  b) es la primera lección del curso
  c) el instructor lo está viendo en modo preview

COMPLETAR una lección según su tipo:
  VIDEO → el servidor detecta watchedSeconds >= 80% de Lesson.duration
           (es pegajoso: una vez completada, no se revierte aunque el estudiante retroceda)
  PDF   → abrir el visor dispara materialVisto → completada inmediatamente (server action)
  TEXT  → el estudiante hace clic en "Marcar como terminada" (botón explícito)
  QUIZ  → el estudiante envía el formulario de quiz y obtiene score >= passingScore (default 70%)

POSICIÓN DE VIDEO:
  - Se guarda cada 15 segundos (solo mientras reproduce, no pausado)
  - Se guarda inmediatamente en pausa o al cerrar
  - Al reanudar: se restaura lastPosition
  - El estudiante NO puede saltar hacia adelante más allá de watchedSeconds
    (el reproductor fija el máximo scrubable a max(lastPosition, watchedSeconds))
  - SÍ puede retroceder y volver a ver partes ya vistas
```

### Lecciones tipo QUIZ

```
ESTRUCTURA:
  Una lección QUIZ contiene entre 1 y 50 preguntas (QuizQuestion)
  Cada pregunta tiene: enunciado, opciones A/B/C/D, respuesta correcta, explicación opcional
  passingScore de la lección: configurable por el instructor (default: 70%, rango 1-100%)

FLUJO DEL ESTUDIANTE:
  1. Ve el formulario con todas las preguntas de la lección QUIZ
  2. Selecciona una opción por pregunta (obligatorio — no puede enviar con preguntas vacías)
  3. Envía el formulario → el backend calcula score = (correctas / total) * 100
  4. Se guarda QuizAttempt (sobrescribe el anterior del mismo enrollment+lesson)
  5. Si passed (score >= passingScore): lección se marca como completada (Progress.completedAt)
     Si no passed: se muestran las preguntas con feedback (correcta / incorrecta, con explicación)
                   y el estudiante puede reintentar

RESTRICCIONES DE SEGURIDAD:
  - La respuesta correcta NUNCA viaja al cliente antes de que el estudiante envíe
  - El cálculo de score se hace SIEMPRE en el servidor (resolver tRPC)
  - La UI puede mostrar si pasó o no, y el feedback por pregunta, DESPUÉS del envío

GESTIÓN POR EL INSTRUCTOR:
  - Crear/editar/eliminar preguntas individuales (una por una o en lote)
  - Reordenar preguntas con drag & drop
  - Configurar passingScore de la lección
  - Ver intentos de cada estudiante (puntuación + si pasó)
```

---

## 🎯 FUNCIONALIDADES DEL MVP — Fases ajustadas

### FASE 1 — Infraestructura base ✅ COMPLETADA (2026-06-11)
- [x] Scaffolding del monorepo con Turborepo
- [x] Docker Compose: PostgreSQL 16 + Redis 7 + pgAdmin + ClamAV
- [x] Schema Prisma completo + migraciones iniciales
- [x] Módulo `packages/crypto` con AES-256-GCM implementado y testeado
- [x] tRPC server sobre Fastify con contexto de autenticación tipado
- [x] NextAuth.js v5: Magic Link (Resend) + Google OAuth
- [x] Middleware RBAC: publicProcedure / protectedProcedure / instructorProcedure / adminProcedure
- [x] Variables de entorno tipadas con Zod en `packages/config`
- [x] AuditLog helper centralizado con catálogo cerrado AUDIT_ACTIONS
- [x] GitHub Actions: CI básico (type-check + lint + tests)

### FASE 2 — Gestión de cursos (Instructor) ✅ COMPLETADA (2026-06-12)
- [x] Dashboard de instructor: mis cursos con status y métricas básicas
- [x] CRUD de curso: título, descripción, categoría, thumbnail (upload R2 + ClamAV)
- [x] CRUD de secciones con drag & drop (dnd-kit)
- [x] CRUD de lecciones: tipos VIDEO / PDF / TEXT con reordenamiento
- [x] Upload de video (Cloudflare Stream mockeado + webhook)
- [x] Upload de PDFs/imágenes con presigned URL + pipeline ClamAV
- [x] Preview de lección antes de publicar
- [x] Publicar / archivar curso con validación

### FASE 3 — Experiencia del estudiante ✅ COMPLETADA (2026-06-13)
- [x] Dashboard de estudiante: cursos asignados, progreso general
- [x] Vista de curso con sidebar: secciones colapsables, estado por lección (✓ / en progreso / 🔒)
- [x] Reproductor de video Vidstack: signed URL on-demand, guardar posición cada 15s,
      completar al 80%, velocidades, renovación de URL antes de expirar
- [x] Visor PDF inline (react-pdf): URL firmada, control de descarga por instructor
- [x] Notas personales por timestamp en video (cifradas AES-256-GCM en BD)
- [x] Barra de progreso por curso (% de lecciones completadas)

### FASE 4 — Administración + Asignación + MVP completo (EN CURSO)
- [x] **Asignación de curso completo:** instructor/admin asigna un curso a un estudiante
      (UI en `/instructor/cursos/[id]/estudiantes` — mockup acordado con el usuario) ✅ 2026-06-13
- [x] **Progreso secuencial de lecciones:** ✅ 2026-06-13
      - Lección N+1 bloqueada si la N no está completada
      - El reproductor de video limita el scrubbing hacia adelante a watchedSeconds
      - Botón "Marcar como terminada" para lecciones TEXT
      - El PDF completado al abrir el visor (ya implementado)
- [ ] **Lecciones tipo QUIZ:**
      - Schema: modelos QuizQuestion y QuizAttempt (nueva migración)
      - Backend: router `quiz` — CRUD de preguntas (instructor), enviar intento (estudiante),
        calcular score en servidor, marcar lección completada si passed
      - UI instructor: formulario de preguntas con drag & drop, configurar passingScore
      - UI estudiante: formulario de quiz, feedback por pregunta tras envío, reintento
- [x] **Visor de lección TEXT con editor enriquecido:** ✅ 2026-06-13
      - El instructor edita el contenido de lecciones TEXT con un editor WYSIWYG (Tiptap)
      - El estudiante ve el HTML renderizado con botón "Marcar como terminada"
- [ ] **Panel de admin:** tabla de usuarios con filtros, editar rol, activar/desactivar
- [ ] **Vista de progreso del estudiante para el instructor:**
      lección por lección, con porcentaje, último acceso, intentos de quiz

> ⏸️ **DIFERIDO — fuera del MVP actual (no trabajar hasta nuevo aviso, decisión usuario 2026-06-13).**
> Los siguientes puntos quedan comentados; se retoman cuando el usuario lo indique.
<!--
- [ ] **Generación de certificado PDF al completar 100%:**
      @react-pdf/renderer, subido a R2, URL en Certificate, endpoint público `/verify/[code]`
- [ ] **Notificaciones email (Resend):** bienvenida, nuevo curso asignado, certificado generado
- [ ] **Asignación granular por secciones** (Fase 4 extendida — post asignación simple):
      usa tabla ModuleAccess para control sección por sección
-->

### FASE 5 — Calidad + CI/CD completo
- [ ] Tests de carga con k6: 50 usuarios concurrentes, p95 < 2s, error rate < 1%
- [ ] Tests E2E con Playwright: flujos críticos completos
<!-- ⏸️ DIFERIDO (fuera del MVP): App Expo base — autenticación + mis cursos + reproductor de video -->
- [ ] CI/CD completo: web / backend / security-scan
- [ ] Sentry + Axiom en producción
- [ ] GitHub real + deploy a Vercel/Railway/Supabase

### FASE 6 — IA con Claude (Post-MVP — opcional, fecha a decidir)
> Esta fase se planifica pero NO bloquea el lanzamiento del MVP.
- [ ] Asistente de estudio por curso (chatbot contextual por lección)
- [ ] Implementar `packages/ai-safety` con classifyMessage + respuestas de crisis
- [ ] Resumen automático de lección al completarla
- [ ] Generación de preguntas de repaso adicionales por lección
- [ ] Dashboard de consumo de tokens para SUPER_ADMIN
- [ ] Worker BullMQ separado para tareas asíncronas de IA
- [ ] Alerta automática al instructor cuando se detecta contenido de crisis

---

## 🔒 REQUERIMIENTOS DE SEGURIDAD (no negociables)

```
AUTH Y SESIONES
1.  Sesiones en BD (NextAuth adapter) — invalidar tokens al cambiar rol/desactivar = borrar filas Session
2.  JWT access token: TTL 15 minutos. Refresh token: TTL 7 días, rotación en cada uso [Post-MVP móvil]
3.  Refresh tokens almacenados hasheados en BD (SHA-256) [Post-MVP móvil]
4.  Logout: invalidar sesión en BD

AUTORIZACIÓN
5.  NUNCA confiar en el rol enviado por el cliente — siempre leer de la sesión del servidor
6.  Verificar ownership en CADA resolver: instructorId === session.user.id
7.  RBAC mediante middleware tRPC — no lógica de permisos dispersa en componentes de UI
8.  Progreso secuencial: el servidor verifica que la lección anterior esté completada antes
    de permitir acceso a la siguiente (no solo la UI)

DATOS Y CIFRADO
9.  Campos sensibles (ClinicalNote, LessonNote.body) cifrados AES-256-GCM antes de persistir
10. Signed URLs para video: generadas on-demand, TTL 30 min, NUNCA almacenadas en BD
11. PDFs: sanitización con ClamAV + verificar magic bytes antes de subir a R2
12. Inputs validados con Zod en backend ANTES de llegar a Prisma
13. Respuestas correctas de QUIZ: NUNCA viajan al cliente antes del envío del intento

RED E INFRAESTRUCTURA
14. CORS: dominios explícitos — NUNCA wildcard (*) en producción
15. Headers: CSP, HSTS (max-age=31536000), X-Frame-Options: DENY, X-Content-Type-Options: nosniff
16. Rate limiting: 100 req/min por IP via @fastify/rate-limit
17. Rate limiting auth: 5 intentos fallidos por IP cada 15 minutos → bloqueo temporal

AUDITORÍA Y BACKUPS
18. AuditLog: registrar TODAS las acciones de SUPER_ADMIN e INSTRUCTOR (catálogo cerrado AUDIT_ACTIONS)
19. Backups de BD: cada 6 horas en Supabase (point-in-time recovery)
20. Variables de entorno: NUNCA en el código — solo process.env validado con Zod

CUMPLIMIENTO LFPDPPP (México — Datos Personales Sensibles)
21. Aviso de privacidad visible y aceptación explícita en el registro
22. Datos de salud (ClinicalNote) con cifrado adicional a nivel de campo
23. Endpoint de "derecho al olvido": borrar datos del usuario conservando registros
    contables mínimos requeridos por ley
```

---

## 📊 ESTRATEGIA DE PRUEBAS (ISO/IEC 25010)

### Unit Tests (Vitest) — cobertura mínima 80% en `packages/`
```
- packages/crypto: encrypt/decrypt, casos borde (string vacío, caracteres especiales, unicode)
- packages/shared: utils de formato, validaciones de Zod schemas
```

### Integration Tests (Vitest + Prisma test client)
```
- Auth: magic link flow, Google OAuth, logout
- RBAC: que cada rol solo acceda a lo que debe (happy path + unauthorized paths)
- Enrollment: asignación de curso, acceso granular por sección, progreso
- Progreso secuencial: verificar que lección N+1 está bloqueada si N no está completada
- Video access: generación de signed URL, expiración, acceso sin enrollment,
  límite de scrubbing hacia adelante
- Quiz: submit correcto → score calculado en servidor → completada si passed;
  respuesta correcta no expuesta antes del envío
- Certificate: generación al 100%, verificación pública por código
```

### E2E Tests (Playwright)
```
- Flujo completo estudiante: login → ver curso asignado → reproducir video →
  completar quiz → obtener certificado
- Flujo instructor: login → crear curso → subir video → añadir quiz → publicar →
  asignar estudiante → ver progreso
- Flujo admin: crear usuario → cambiar rol → desactivar cuenta
- Flujo seguridad: intentar saltarse lección → verificar bloqueo del servidor
```

### Load Tests (k6) — umbral de aceptación obligatorio
```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // p95 < 2 segundos
    http_req_failed: ['rate<0.01'],      // < 1% de errores
  },
  scenarios: {
    video_access: {
      executor: 'ramping-vus',
      startVUs: 0, target: 50,
      stages: [{ duration: '2m', target: 50 }, { duration: '5m', target: 50 }],
    },
  },
}
```

---

## 🚀 CI/CD — GitHub Actions

### `ci-web.yml` (trigger: PR a main + push a main)
```yaml
jobs:
  quality:
    steps:
      - type-check (tsc --noEmit)
      - lint (eslint)
      - unit tests (vitest run)
      - build (next build)
  e2e:
    needs: quality
    steps:
      - docker-compose up -d
      - prisma migrate deploy
      - playwright test
  deploy-preview:
    needs: quality
    if: PR
    steps: vercel deploy --prebuilt
  deploy-production:
    needs: [quality, e2e]
    if: push to main
    steps: vercel deploy --prod
```

### `ci-backend.yml` (trigger: PR a main + push a main)
```yaml
jobs:
  quality:
    steps:
      - type-check
      - lint
      - integration tests (vitest run --config vitest.integration.ts)
      - load test (k6 run — solo en push a main)
  deploy:
    needs: quality
    if: push to main
    steps: railway up --detach
```

### `security-scan.yml` (trigger: PR a main, schedule: diario)
```yaml
jobs:
  sast:
    steps:
      - CodeQL analyze (javascript, typescript)
  dependency-audit:
    steps:
      - npm audit --audit-level=high
```

---

## 🎨 DISEÑO Y UX

**Paleta de colores (CSS custom properties):**
```css
--color-brand-primary:    #F5A623;  /* naranja cálido — CTAs, acentos, progreso */
--color-brand-secondary:  #2E7D6B;  /* verde teal — nav activa, estados completados */
--color-brand-dark:       #1A3A35;  /* verde noche — headers, textos importantes */
--color-brand-surface:    #F9EDD5;  /* crema suave — fondos de contenido */
--color-neutral-50:       #FAFAF8;
--color-neutral-100:      #F2F0EC;
--color-neutral-900:      #1C1C1A;
--color-danger:           #C0392B;
```

**Principios de UI:**
- Espacio seguro y cálido — nunca frío ni corporativo
- Crema `#F9EDD5` como fondo de paneles de contenido
- Naranja para CTAs y barras de progreso
- Teal para estados completados, badges, navegación activa
- Tipografía: `Inter` (UI/datos), `Lora` serif para títulos de cursos
- Cards: `border-radius: 12px`, sombra `0 2px 8px rgba(0,0,0,0.06)`
- Reproductor de video: 100% ancho, aspect-ratio 16/9, fondo negro
- Barra de progreso del curso: visible en el header de la vista de curso y en las cards del dashboard

**Estructura de layout:**
- Sidebar izquierda: índice de secciones/lecciones, colapsable en móvil (< 768px)
- Header de la vista de curso: barra de progreso + nombre de la lección activa
- Lecciones bloqueadas: candado 🔒, título enmascarado, NO navegables
- Panel de actividades por lección: contenido principal + notas (para VIDEO)

---

## 📋 REGLAS DE DESARROLLO

1. **TypeScript estricto** — `strict: true`, sin `any` implícito, sin `@ts-ignore` sin comentario justificado
2. **Server Components por defecto** en Next.js — `"use client"` solo para interactividad real
3. **tRPC type-safety de extremo a extremo** — Zod schema en input Y output de cada procedure
4. **Prisma transactions** para toda operación que modifique más de una tabla
5. **Error handling centralizado** — TRPCError con códigos estándar, nunca lanzar Error crudo en resolvers
6. **Crypto como única capa de cifrado** — nunca cifrar inline, siempre via `packages/crypto`
7. **Progreso secuencial en servidor** — la UI refleja el estado, pero el acceso se verifica en el resolver
8. **No feature flags complejos en MVP** — usar `isActive` booleans simples en BD
9. **Comentarios en español** en lógica de negocio
10. **Conventional Commits obligatorios** — `feat:`, `fix:`, `security:`, `refactor:`, `test:`, `chore:`
11. **Documentar decisiones arquitectónicas** en los ADRs de STATUS.md
12. **Feature por feature** — no abrir más de 2 features en paralelo, merge frecuente a main

---

## 📎 CONTEXTO DEL CLIENTE

- **Cliente:** DBT.Amatla — entrenamiento DBT/RO, psicólogas certificadas, México
- **Zona horaria:** `America/Mexico_City` — todas las fechas en UTC en BD, convertir en UI
- **Moneda:** MXN (pasarela de pago: Conekta o Stripe MX — fuera del MVP)
- **Idioma de la UI:** Español de México — ningún string en inglés visible al usuario final
- **Contenido clínico:** Videos de sesiones grabadas, PDFs de materiales, diapositivas,
  cuestionarios GHQ-12, DASS-21 — todos datos sensibles
- **Sesiones en vivo:** Google Meet los miércoles — la plataforma solo muestra el enlace, no lo gestiona
- **Escala fase 1:** < 100 estudiantes, 5 instructores — no sobredimensionar infraestructura
- **Cumplimiento legal:** LFPDPPP (México) — datos de salud como datos sensibles con cifrado
- **Obligación ética (Post-MVP IA):** Si se implementa el asistente de IA y un usuario expresa
  ideación suicida, la plataforma DEBE escalar al terapeuta asignado — nunca responder con IA sola.
  El módulo `packages/ai-safety` está scaffolded para esta fase.

---

*Prompt v3.0 — MVP sin chatbot IA · Progreso secuencial · Quiz con opción múltiple · Editor TEXT*
*Basado en v2.0: Field-level encryption AES-256-GCM · ClamAV · Cloudflare Stream/R2 · tRPC · Prisma*
*Stack: Next.js 15 · Fastify · tRPC · Prisma · PostgreSQL · Cloudflare Stream/R2*