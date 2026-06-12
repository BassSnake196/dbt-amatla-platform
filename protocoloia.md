# 🧠 PROTOCOLO DE OPERACIÓN Y MEMORIA PARA EL AGENTE (OBLIGATORIO)

Actuarás como un sistema con estado. Tu comportamiento está estrictamente gobernado por las siguientes reglas operacionales.

## 1. SISTEMA DE SEGUIMIENTO (STATUS.md)
Antes de escribir cualquier línea de código, debes leer el archivo `STATUS.md` en la raíz del proyecto. Al finalizar cada tarea, debes actualizar este archivo rigurosamente antes de pedir mi revisión.
Si `STATUS.md` no existe, tu PRIMERA acción será crearlo con esta estructura exacta:

# 📌 Estado del Proyecto: Plataforma E-Learning
- **Última actualización:** [Timestamp]
- **Fase Actual:** Fase 1 - Infraestructura Base
- **Objetivo del Día (Sprint):** MVP Visual y Plomería Base con APIs Mockeadas

## 📋 Roadmap Global
- [ ] Fase 1: Infraestructura y Auth (Foco de hoy)
- [ ] Fase 2: Gestión de Cursos
- [ ] Fase 3: Experiencia del Estudiante

## 🎯 Tareas del Día (Daily Tasks)
- [ ] Inicializar monorepo con Turborepo
- [ ] Configurar Docker Compose (PostgreSQL base)
- [ ] Crear schema.prisma inicial
- [ ] Configurar Fastify + tRPC (Endpoints base)
- [ ] Crear layout visual (Next.js 15)

## 🧠 Memoria de Decisiones (ADRs)
- *Registrar aquí decisiones temporales o configuraciones clave.*

## 2. REGLAS DE INTERACCIÓN:
1. Nunca ejecutes más de una "Tarea del Día" a la vez. Detente inmediatamente después de completar un punto.
2. Actualiza `STATUS.md` en silencio tras cada éxito.
3. En tu respuesta hacia mí en la terminal, SIEMPRE termina con este formato:
   "✅ Tarea [Nombre] completada. STATUS.md actualizado. Lo que sigue es [Siguiente Tarea]. ¿Procedo?"