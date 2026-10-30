# features/

Lógica por dominio, sin JSX de presentación pesado: esquemas Zod, Server Actions, stores y helpers.

| Carpeta         | Qué va                                                 |
| --------------- | ------------------------------------------------------ |
| `catalog/`      | Esquemas, búsqueda y formato del catálogo              |
| `quote/`        | Store de Zustand, esquema y `actions.ts` de cotización |
| `stores/`       | Consultas y lógica del localizador de tiendas          |
| `schools/`      | Esquema y acciones de visitas escolares                |
| `distributors/` | Solicitudes para ser distribuidor                      |
| `contact/`      | Formulario de contacto                                 |
| `content/`      | Hero, cifras, hitos, FAQs y apariencia por sección     |
| `admin/`        | Acciones del panel por entidad                         |
| `analytics/`    | Eventos y envío de analítica                           |
| `seo/`          | `buildMetadata`, JSON-LD, IndexNow, `llms.txt`         |

Reglas:

- Server Actions en `<dominio>/actions.ts` con `"use server"`; validan con Zod en el servidor y
  devuelven `{ ok: true, data } | { ok: false, error }`.
- Acciones del admin: `requireRole` → Zod → escritura → `AuditLog` → `updateTag` (tags de `lib/cache-tags.ts`).
- Los esquemas Zod se comparten entre cliente y servidor (`schemas.ts`).
