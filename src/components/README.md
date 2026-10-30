# components/

Piezas de interfaz. Un componente por archivo (`kebab-case.tsx`, exporta `PascalCase`); props con `type`.

| Carpeta     | Qué va                                                                         |
| ----------- | ------------------------------------------------------------------------------ |
| `ui/`       | Primitivas de shadcn/Radix (button, dialog, sheet, tabs, accordion…)           |
| `layout/`   | Header, menú móvil, footer, splash, `Section`, `Container`, breadcrumbs        |
| `feedback/` | `FriendlyDialog`, toaster, estados vacíos y alertas inline                     |
| `motion/`   | Único lugar donde se importa `motion/react` (lint); reveal, count-up, provider |
| `hero/`     | Hero con video por capítulos                                                   |
| `catalog/`  | Tarjetas, filtros, colores, empaques, especificaciones                         |
| `quote/`    | Drawer, botón y formulario de cotización                                       |
| `stores/`   | Lista y mapa (diferido) de tiendas                                             |
| `schools/`  | Actividades, formulario y decoración de escuelas                               |
| `whatsapp/` | Botón flotante y hoja de WhatsApp                                              |
| `icons/`    | Logo e íconos SVG                                                              |
| `admin/`    | Tablas, campos y cargador de imágenes del panel                                |

Reglas:

- Server Components por defecto; `"use client"` solo en hojas interactivas pequeñas.
- Colores, espacios y duraciones solo desde los tokens de `src/styles` (nunca hex sueltos).
- Textos desde `src/content` o `docs/17-copys.md`; los mensajes de acciones, desde `content/feedback.ts`.
- Sin acceso a datos: los componentes reciben datos ya listos (de `server/data` vía la página).
