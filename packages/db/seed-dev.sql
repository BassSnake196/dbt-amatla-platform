-- Datos de desarrollo — idempotente (ON CONFLICT DO NOTHING).
-- Uso: docker exec -i amatla-postgres psql -U amatla -d amatla_dev < packages/db/seed-dev.sql

INSERT INTO "User" (id, email, name, role, "updatedAt") VALUES
  ('dev-instructor-1', 'instructora@test.dev', 'Dra. Mariana Cepeda', 'INSTRUCTOR', now()),
  ('dev-student-1', 'estudiante@test.dev', 'Valentina Prueba', 'STUDENT', now())
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

-- Progreso de ejemplo del estudiante en curso-dev-1 (1 de 5 lecciones
-- completada = 20%; la lección 2 quedó a medias — alimenta el hero "Continuar")
INSERT INTO "Progress" (id, "enrollmentId", "lessonId", "watchedSeconds", "completedAt", "lastPosition", "updatedAt") VALUES
  ('prog-dev-1', 'enr-dev-1', 'lec-dev-1', 1800, now() - interval '2 days', 1800, now() - interval '2 days'),
  ('prog-dev-2', 'enr-dev-1', 'lec-dev-2', 900, NULL, 900, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sesiones en vivo: siempre los próximos dos miércoles 18:00 Ciudad de México
-- (UTC-6 → se guardan como jueves 00:00 UTC). Re-ejecutar el seed las refresca.
INSERT INTO "CalendarEvent" (id, "courseId", title, "startAt", "endAt", "meetUrl", "createdBy")
SELECT * FROM (
  SELECT 'evt-dev-1'::text, 'curso-dev-1'::text, 'Práctica grupal: Verificar los hechos'::text,
         proximo_miercoles + interval '18 hours' + interval '6 hours',
         proximo_miercoles + interval '19 hours 30 minutes' + interval '6 hours',
         'https://meet.google.com/dev-amatla-1'::text, 'dev-instructor-1'::text
  FROM (SELECT date_trunc('day', now())
          + ((((3 - extract(dow FROM now())::int) % 7 + 6) % 7 + 1) || ' days')::interval
          AS proximo_miercoles) p
  UNION ALL
  SELECT 'evt-dev-2', 'curso-dev-1', 'Círculo de práctica: regulación en la vida diaria',
         proximo_miercoles + interval '7 days' + interval '18 hours' + interval '6 hours',
         proximo_miercoles + interval '7 days' + interval '19 hours 30 minutes' + interval '6 hours',
         'https://meet.google.com/dev-amatla-2', 'dev-instructor-1'
  FROM (SELECT date_trunc('day', now())
          + ((((3 - extract(dow FROM now())::int) % 7 + 6) % 7 + 1) || ' days')::interval
          AS proximo_miercoles) p
) eventos(id, "courseId", title, "startAt", "endAt", "meetUrl", "createdBy")
ON CONFLICT (id) DO UPDATE SET "startAt" = EXCLUDED."startAt", "endAt" = EXCLUDED."endAt";

-- Sesiones de desarrollo para probar vistas autenticadas con cookie:
--   Cookie: authjs.session-token=dev-session-instructor | dev-session-student
INSERT INTO "Session" ("sessionToken", "userId", expires, "updatedAt") VALUES
  ('dev-session-instructor', 'dev-instructor-1', now() + interval '7 days', now()),
  ('dev-session-student', 'dev-student-1', now() + interval '7 days', now())
ON CONFLICT ("sessionToken") DO NOTHING;
