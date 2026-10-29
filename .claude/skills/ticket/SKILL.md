---
name: ticket
description: Arranca un ticket BD-NNN del plan de acción de Bolik Digital. Úsalo con /ticket BD-062 al comenzar cualquier ticket.
---

# Trabajar un ticket de Bolik Digital

Argumento: el ID del ticket (por ejemplo `BD-062`).

1. Busca el ticket en `docs/14-plan-de-accion.md` (encabezado `#### BD-NNN`). Si no existe, detente y avísame.
2. Verifica que sus dependencias estén hechas (busca el código que crean). Si falta alguna, dímelo antes de seguir.
3. Lee `CLAUDE.md` y **todos** los docs citados en el campo "Docs" del ticket.
4. Revisa lo que ya existe en `src/components`, `src/features` y `src/server/data` para reutilizarlo.
5. Entrega un **plan**, sin editar archivos:
   - Archivos a crear o modificar (ruta y propósito).
   - Componentes y funciones que reutilizas.
   - Server vs. cliente: qué es isla cliente y por qué.
   - Textos: de dónde salen (`docs/17-copys.md`, `content/feedback.ts`, BD).
   - Pruebas que agregarás (unitarias, integración, E2E) según `docs/13`.
   - Cómo verificarás **cada** criterio de aceptación.
   - Riesgos de rendimiento, SEO o accesibilidad.
6. Espera mi aprobación. Luego implementa **un paso a la vez** y corre `pnpm typecheck`, `pnpm lint` y las pruebas afectadas al final de cada paso.
7. Al terminar: tabla de criterios de aceptación con su estado y evidencia, y propuesta de mensaje de commit `tipo(ámbito): resumen [BD-NNN]`.
