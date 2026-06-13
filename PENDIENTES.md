# 📋 Pendientes del MVP (derivados de prompt-maestrp.md) — 2026-06-13

> Las **features del MVP (Fase 4: 4.1–4.9) están COMPLETAS**. Lo de abajo es lo que
> falta para *usar* el MVP de punta a punta y para cerrar el resto del prompt maestro.
> Estado de tests: 229 en verde.

---

## 🔴 PRIORIDAD — Login real para entrar y probar permisos/monitoreo en local
El **código de auth ya está hecho** (NextAuth v5 en `apps/web/src/auth.ts`: Google +
Magic Link/Resend, sesiones en BD, bloquea cuentas inactivas, mete el rol desde BD; la
página `/iniciar-sesion` ya tiene ambos botones). Hoy solo se entra con `/api/dev-login`
porque **faltan las credenciales** (las vars en `.env.example` están vacías).

**Para activarlo en local (no requiere escribir código):**
1. En `apps/web/.env.local` (gitignoreado):
   - `AUTH_SECRET` → generar con `npx auth secret` (o `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
   - `AUTH_URL="http://localhost:3000"`.
   - **Google OAuth:** crear credenciales en Google Cloud Console → APIs & Services →
     Credentials → OAuth client ID (tipo "Web application"); **Authorized redirect URI:**
     `http://localhost:3000/api/auth/callback/google`. Copiar `GOOGLE_CLIENT_ID` y
     `GOOGLE_CLIENT_SECRET`.
   - (Opcional, Magic Link) `RESEND_API_KEY` + `EMAIL_FROM` con dominio verificado en Resend.
2. **Bootstrap del primer admin:** al entrar con Google te crea como `STUDENT` (rol por
   defecto). Para probar permisos de instructor/admin, promociona tu usuario UNA vez por SQL
   (`UPDATE "User" SET role='SUPER_ADMIN' WHERE email='tu@correo'`); desde ahí el **panel de
   admin (4.8)** ya permite cambiar roles y activar/desactivar desde la UI. (Alternativa:
   añadir tu correo como admin en `seed-dev.sql`.)
3. **Verificación e2e:** login real → la UI respeta el rol (sidebar, guardias, panel admin) →
   monitorear/gestionar usuarios desde `/admin/usuarios`.
4. **Prod:** `/api/dev-login` ya está bloqueado fuera de desarrollo; revisar antes de desplegar.

---

## 🟠 Calidad y operación (Fase 5 del prompt maestro)
- **ESLint real:** los scripts `lint` de los paquetes son placeholders (`echo …`). Configurar ESLint + reglas TS.
- **CI/CD (GitHub Actions):** `ci-web.yml`, `ci-backend.yml`, `security-scan.yml` (type-check + lint + tests + build; CodeQL + `npm audit`). Crear repo en GitHub y activar CI.
- **Tests E2E (Playwright):** flujos completos (estudiante: login→curso→video→quiz; instructor: crear→asignar→ver progreso; admin: rol/desactivar).
- **Tests de carga (k6):** umbral p95 < 2s, error rate < 1% (acceso a video).
- **Monitoreo:** Sentry (errores) + Axiom (logs) — `SENTRY_DSN`/`AXIOM_TOKEN` vacíos.
- **Deploy:** Vercel (web) + Railway/Fly (API/worker) + Supabase (DB) + `npm audit`.

---

## 🟡 Seguridad pendiente (bloque "Requerimientos de seguridad" del prompt maestro)
- **Rate limiting de auth (#17):** 5 intentos fallidos/IP/15 min → bloqueo temporal. (El rate-limit general 100/min ya está en la API Fastify; el de auth corre por NextAuth en Next y aún no existe.)
- **Inmutabilidad de AuditLog (#18):** hoy es por convención (solo INSERT); falta el trigger en Postgres que bloquee UPDATE/DELETE.
- **Aviso de privacidad con aceptación explícita (#21):** hoy es solo texto en el login; falta checkbox/registro de consentimiento.
- **Derecho al olvido (#23, LFPDPPP):** endpoint para borrar datos del usuario conservando lo mínimo legal.
- **Pipeline de subida — validación de PDF/magic bytes:** confirmar que el worker rechaza no-PDF antes de enlazar (relacionado con el fix del seed de PDF inválido).

---

## ⏸️ Diferido por decisión del usuario (NO trabajar hasta nuevo aviso)
- **Certificado PDF** al 100% + endpoint público `/verify/[code]`.
- **Notificaciones email (Resend):** bienvenida, curso asignado, certificado.
- **Asignación granular por secciones (ModuleAccess):** el backend ya respeta "sin filas = acceso total"; falta UI de asignación por sección y recalibrar el % de progreso a "solo accesibles".
- **App móvil (Expo).**
- **Fase 6 — IA con Claude:** chatbot de estudio, resúmenes, generación de preguntas, dashboard de tokens, activar `packages/ai-safety` (scaffolded, 32 tests).

---

## 🐞 Bugs/asuntos conocidos (sesiones recientes)
- 🔴 **Video sin HTTP Range** en el mock dev (`apps/web/src/app/api/stream-dev/[uid]/route.ts`): no se puede hacer seek ni saltar a notas por timestamp. Fix: responder 206 con `Content-Range`/`Accept-Ranges`. En prod Cloudflare ya lo soporta.
- 🟡 **Dashboard del estudiante** usa arte generativo CSS en lugar del thumbnail real del curso.
- 🟡 **Seed de media:** en un `.almacen-dev` limpio, tras `seed-dev.sql` correr `npm run db:seed-media -w @amatla/db` para que los PDF del seed sean válidos.
