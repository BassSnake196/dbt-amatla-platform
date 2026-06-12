-- Datos de desarrollo — idempotente (ON CONFLICT DO NOTHING).
-- Uso: docker exec -i amatla-postgres psql -U amatla -d amatla_dev < packages/db/seed-dev.sql

INSERT INTO "User" (id, email, name, role, "updatedAt") VALUES
  ('dev-instructor-1', 'instructora@test.dev', 'Dra. Mariana Cepeda', 'INSTRUCTOR', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Course" (id, title, description, status, "instructorId", category, "totalDuration", "updatedAt") VALUES
  ('curso-dev-1', 'Habilidades DBT: Regulación Emocional',
   'Módulo completo de regulación emocional: identificar, nombrar y cambiar respuestas emocionales con habilidades DBT.',
   'PUBLISHED', 'dev-instructor-1', 'Regulación emocional', 12600, now()),
  ('curso-dev-2', 'RO-DBT: Apertura Radical — Fundamentos',
   'Introducción a la terapia dialéctico conductual radicalmente abierta para sobrecontrol.',
   'DRAFT', 'dev-instructor-1', 'RO-DBT', 0, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Section" (id, "courseId", title, "order", description) VALUES
  ('sec-dev-1a', 'curso-dev-1', 'Entender la emoción', 1, 'Qué es una emoción y para qué sirve'),
  ('sec-dev-1b', 'curso-dev-1', 'Verificar los hechos', 2, NULL),
  ('sec-dev-2a', 'curso-dev-2', 'Sobrecontrol y subcontrol', 1, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Lesson" (id, "sectionId", title, "order", type, duration, "isPreview") VALUES
  ('lec-dev-1', 'sec-dev-1a', 'El modelo de la emoción', 1, 'VIDEO', 1800, true),
  ('lec-dev-2', 'sec-dev-1a', 'Funciones de las emociones', 2, 'VIDEO', 2100, false),
  ('lec-dev-3', 'sec-dev-1a', 'Material de apoyo: hoja de registro', 3, 'PDF', NULL, false),
  ('lec-dev-4', 'sec-dev-1b', 'Verificar los hechos: paso a paso', 1, 'VIDEO', 2400, false),
  ('lec-dev-5', 'sec-dev-1b', 'Práctica guiada', 2, 'TEXT', NULL, false),
  ('lec-dev-6', 'sec-dev-2a', '¿Qué es el sobrecontrol?', 1, 'VIDEO', 1500, false),
  ('lec-dev-7', 'sec-dev-2a', 'Señalización social', 2, 'TEXT', NULL, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Enrollment" (id, "studentId", "courseId", "assignedBy") VALUES
  ('enr-dev-1', 'dev-student-1', 'curso-dev-1', 'dev-instructor-1')
ON CONFLICT (id) DO NOTHING;

-- Sesión de desarrollo para probar vistas autenticadas con cookie:
--   Cookie: authjs.session-token=dev-session-instructor
INSERT INTO "Session" ("sessionToken", "userId", expires, "updatedAt") VALUES
  ('dev-session-instructor', 'dev-instructor-1', now() + interval '7 days', now())
ON CONFLICT ("sessionToken") DO NOTHING;
