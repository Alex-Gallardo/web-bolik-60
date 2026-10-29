# 08 · Styleguide

El estilo base es el de la demo aprobada ("Color Block Escolar"): fondo blanco, bloques de color sólido por sección, títulos en Bricolage Grotesque, texto en DM Sans, esquinas redondeadas, trazos de tinta como detalle gráfico y una sola sección infantil.

Archivos de referencia: `starter/src/styles/tokens.css`, `motion.css`, `backgrounds.css`, `starter/src/app/globals.css` y `starter/src/content/feedback.ts`.

## 1. Fundamentos

### Breakpoints (mobile first)

| Nombre | Desde | Uso típico |
|---|---|---|
| base | 0 | Diseño principal (360–430 px) |
| `sm` | 640 px | Celulares grandes en horizontal |
| `md` | 768 px | Tablets: 2 columnas |
| `lg` | 1024 px | Laptops: menú completo, 3–4 columnas |
| `xl` | 1280 px | Ancho máximo del contenedor |

Se diseña y prueba primero a **360 px**. Ninguna página hace scroll horizontal. Margen lateral mínimo 16 px (`--gutter`).

### Grilla y espacios
- Contenedor `container-site`: máx. 1280 px, margen lateral `--gutter`.
- Espaciado vertical entre secciones: `--section-y` (64 → 104 px).
- Espacios internos múltiplos de 4 px. Grupos de elementos con `gap` (flex/grid), nunca márgenes sueltos.
- Lectura: párrafos con `max-width: 65ch`.

### Superficies

| Superficie | Fondo | Borde | Radio | Sombra |
|---|---|---|---|---|
| Tarjeta estándar | `--paper` | 2 px `--line` | `lg` (22) | ninguna; `md` al hover |
| Tarjeta de color (soluciones, mayoreo) | color sólido | ninguno | `xl` (28) | ninguna |
| Tarjeta infantil | color kids | ninguno | 28 | `--shadow-kids` + rotación ±1.5° |
| Bloque destacado | `--soft` | ninguno | `xl` | ninguna |
| Modal / drawer | `--paper` | ninguno | `xl` (arriba en bottom sheet) | `lg` |
| Input | `--paper` | 2 px `--line-strong` → `--blue` al foco | `md` | ninguna |

Regla: el borde, la sombra y el radio grande se usan para separar **un** objeto; no todo lleva sombra.

## 2. Componentes

Cada componente vive en `src/components/ui` (primitivas) o en su carpeta de dominio, con variantes por `class-variance-authority`. Todos tienen estados: **normal, hover, presionado, foco, deshabilitado, cargando** (cuando aplica).

### Botón `Button`

| Variante | Fondo / texto | Uso |
|---|---|---|
| `primary` | `--blue` / blanco | Acción principal sobre fondo claro |
| `accent` | `--yellow` / `--ink` | Acción principal sobre fondo oscuro (hero, navy) |
| `dark` | `--ink` / blanco | Alternativa sobria |
| `outline` | transparente / `--ink`, borde 2 px | Secundario sobre claro |
| `ghost-light` | transparente / blanco, borde blanco | Secundario sobre oscuro |
| `whatsapp` | `--whatsapp` / blanco | Solo WhatsApp |
| `link` | sin fondo / `--blue` | Acciones terciarias |

Tamaños: `sm` 40 px (solo admin y desktop), `md` **48–52 px** (por defecto), `lg` 56 px. Ancho completo en móvil para CTAs de formulario. Ícono opcional a la izquierda (o a la derecha si es "↗ externo"). **Cargando:** el texto se mantiene, aparece un spinner de 16 px y el botón queda deshabilitado (sin cambiar de ancho). Presionado: `scale(.97)` (A-03).

### Otros componentes

| Componente | Descripción breve |
|---|---|
| `IconButton` | 48 × 48, `aria-label` obligatorio, badge opcional (contador de cotización con A-05 "pop") |
| `Chip` | Etiqueta redonda; variantes por línea de producto; versión seleccionable (`aria-pressed`) |
| `Badge` | Estados en admin (nueva, en proceso, ganada…) con color semántico **y texto** |
| `Card` / `ProductCard` / `CategoryCard` / `KitCard` / `StoreCard` | Tarjetas con imagen 1:1 o 4:3, título, meta y acción; toda la tarjeta es un enlace (un solo `<a>`) |
| `Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup` | Con `Label`, texto de ayuda y mensaje de error (`aria-describedby`, `aria-invalid`) |
| `Stepper` | − / número / +, mínimo 1, valores sugeridos por presentación |
| `ColorSwatches` | Selección de color con círculo, nombre y SKU; `role="radiogroup"` |
| `PackSelector` | Presentaciones (blister x1/x3/x5, cajilla, fardo) como `radiogroup` |
| `Tabs` | Radix Tabs; en móvil se convierten en acordeón |
| `Accordion` | Radix Accordion para FAQs; ícono + que rota a × (A-35) |
| `Sheet` / `Drawer` | Radix Dialog en modo lateral o inferior (A-08) |
| `FriendlyDialog` | Diálogo de éxito, error o confirmación (ver §4) |
| `Toaster` | `sonner` configurado con colores y posición (abajo al centro en móvil, abajo a la derecha en desktop) |
| `Breadcrumbs` | Con JSON-LD `BreadcrumbList` generado del mismo arreglo |
| `Section` | Contenedor de sección con `background` y `tone` configurables (§3) |
| `EmptyState` | Ilustración pequeña SVG, título, texto y acción |
| `Skeleton` | Bloques con brillo (A-70) para contenido que carga en cliente |
| `InlineAlert` | Mensajes dentro de formularios (info, éxito, advertencia, error) |
| `StatCounter` | Cifra con conteo animado al entrar en pantalla (A-20) |
| `VideoHero`, `ChapterTabs` | Hero con capítulos (doc 09) |
| `DimensionDiagram` | SVG con cotas interactivas + tabla accesible |
| `Timeline` | Hitos con línea que se dibuja (A-50) |
| `WhatsAppSheet` | Vista previa del mensaje, copiar y abrir WhatsApp |

### Formularios (patrón único)

```text
Label (siempre visible, 15 px, 700)
[ Input 52 px, borde 2 px ]
Ayuda opcional (14 px, --muted)
⚠ Error (14 px, --danger, ícono + texto) → aria-live
```

- Validación con Zod compartida cliente/servidor (`features/*/schemas.ts`).
- Valida al salir del campo y al enviar. En error: borde rojo + mensaje + `shake` sutil del campo (A-04) solo al enviar.
- Botón de envío nunca deshabilitado por "formulario inválido": se deja enviar y se muestran los errores (más claro para el usuario).
- Honeypot: campo `website` oculto con CSS (no `display:none` en el input directamente; dentro de un contenedor fuera de pantalla), `tabIndex={-1}`, `autoComplete="off"`.

<a id="fondos"></a>

## 3. Fondos

Presets definidos en `backgrounds.css` y asignables por sección desde el admin (`SectionAppearance`):

`paper` · `soft` · `dots` · `grid` · `lines` · `ink` · `brand` · `navy` · `sun`

```tsx
// src/components/layout/section.tsx
import type { BACKGROUND_PRESETS } from "@/lib/constants";
type Preset = (typeof BACKGROUND_PRESETS)[number];

export function Section({
  id, background = "paper", tone, className, children,
}: { id?: string; background?: Preset; tone?: "light" | "dark"; className?: string; children: React.ReactNode }) {
  const resolvedTone = tone ?? (["brand", "navy"].includes(background) ? "dark" : "light");
  return (
    <section id={id} data-bg={background} data-tone={resolvedTone} className={className} style={{ paddingBlock: "var(--section-y)" }}>
      <div className="container-site">{children}</div>
    </section>
  );
}
```

En la página: `const look = await getSectionAppearance("home.solutions")` → `<Section background={look.backgroundPreset}>`. Si no hay registro, se usa el valor por defecto del código.

<a id="matriz-de-feedback"></a>

## 4. Matriz de feedback

**Cada acción tiene una respuesta.** Tipos:
- **Toast:** confirmaciones rápidas que no interrumpen (3–5 s, con acción opcional "Deshacer" o "Ver").
- **FriendlyDialog:** momentos importantes (envío de solicitud, error que bloquea, confirmación destructiva).
- **Inline:** errores de campo, estados vacíos, avisos dentro de la página.

| Acción | Feedback | Tipo | Texto (`feedback.ts`) |
|---|---|---|---|
| Agregar a cotización | Toast + contador con "pop" + botón "Ver cotización" | Toast | `quote.added` |
| Cambiar cantidad | Número se actualiza; total con transición | Inline | — |
| Quitar línea | Línea sale con colapso (A-36) + toast "Deshacer" (6 s) | Toast | `quote.removed` |
| Enviar cotización (cargando) | Botón con spinner, campos bloqueados | Inline | `quote.sending` |
| Cotización enviada | Diálogo de éxito con folio y check animado (A-60) | Dialog | `quote.sent` |
| Error al enviar | Diálogo con "Intentar de nuevo" y "Enviar por WhatsApp" (la cotización no se pierde) | Dialog | `quote.failed` |
| Formulario con errores | Mensajes por campo, foco en el primero, toast suave | Inline + Toast | `forms.invalid` |
| Límite de envíos | Diálogo con alternativa WhatsApp | Dialog | `forms.rateLimited` |
| Solicitud de visita escolar | Diálogo festivo con confeti ligero | Dialog | `forms.schoolSent` |
| Solicitud de distribuidor | Diálogo de éxito | Dialog | `forms.distributorSent` |
| Abrir WhatsApp | Sheet con vista previa del mensaje | Sheet | — |
| Copiar mensaje | Toast "Mensaje copiado" (o "Selecciona y copia" si el portapapeles falla) | Toast | `whatsapp.copied` |
| Cambiar color en ficha | Imagen con crossfade, SKU actualizado (anunciado con `aria-live`) | Inline | — |
| Buscar sin resultados | Estado vacío con sugerencias | Inline | `catalog.noResults` |
| Filtros sin resultados | Estado vacío + "Quitar filtros" | Inline | `catalog.filtersEmpty` |
| Descargar PDF | Toast "Descargando la ficha técnica" | Toast | `catalog.pdfReady` |
| Usar mi ubicación | Toast "Buscando…" → "Encontramos N tiendas" o "No pasa nada, elige tu departamento" | Toast | `stores.*` |
| Sin conexión / reconexión | Toast persistente / toast de éxito | Toast | `system.offline/online` |
| Error inesperado | Página de error amable con reintento | Página | `system.genericError` |
| Admin: guardar | Toast "Cambios guardados y publicados · Ver en el sitio" | Toast | `admin.saved` |
| Admin: eliminar | Confirmación → toast con "Deshacer" | Dialog + Toast | `admin.confirmDelete`, `admin.deleted` |
| Admin: subir imagen | Barra de progreso → toast "Imagen lista" | Inline + Toast | `admin.uploadOk` |
| Admin: falta alt | Advertencia junto a la imagen; no deja publicar | Inline | `admin.altMissing` |
| Admin: sesión vencida | Toast + redirección al login conservando el formulario | Toast | `admin.sessionExpired` |

### `FriendlyDialog`

```text
┌─────────────────────────────────┐
│        (ícono animado 64 px)    │  éxito: check verde que se dibuja
│                                 │  error: nube con gota roja
│  Título (h2, 24–28 px)          │  confirmación: signo de pregunta amarillo
│  Texto (16–17 px, máx. 3 líneas)│
│                                 │
│  [ Acción principal ]           │  ancho completo en móvil
│  [ Acción secundaria ]          │
└─────────────────────────────────┘
```

- Radix Dialog: foco atrapado, `Escape` cierra (excepto durante envío), foco vuelve al botón que lo abrió.
- Móvil: aparece como bottom sheet; desktop: centrado. Entrada A-09.
- Nunca más de un diálogo a la vez.

### Toaster
- Máximo 3 visibles; los nuevos empujan a los viejos.
- Íconos por tono (éxito ✓ verde, info i azul, advertencia ! ámbar, error × rojo) **más texto** (el color nunca es el único indicador).
- Región `aria-live="polite"` (errores: `assertive`).
- No tapan la barra inferior móvil (offset `--mobile-bar-h`).

## 5. Iconos e ilustraciones
- Lucide, trazo 2 px, 20 px en botones.
- Ilustraciones de estados vacíos y errores: SVG propios, simples, con trazo de tinta azul y un acento amarillo (lapicero sin tinta para 404, cuaderno vacío para cotización vacía, lupa con signo de pregunta para búsqueda sin resultados). Cada SVG < 3 KB.

<a id="vista-styleguide"></a>

## 6. Vista `/styleguide`

Página interna (`noindex`, enlazada solo desde el admin) que muestra **todo el sistema renderizado con los componentes reales**. Sirve para revisar cambios visuales y como base de las pruebas de regresión visual (ticket BD-133).

Secciones (con índice lateral fijo en desktop y menú desplegable en móvil):

1. **Marca:** logo en fondos permitidos, área libre, favicon.
2. **Color:** muestras de cada token con nombre, hex y contraste calculado contra blanco y contra `--ink` (con indicador AA/AAA en texto).
3. **Tipografía:** escala completa (hero → micro) con tamaño móvil y desktop; ejemplos de párrafo, lista, cita; Baloo 2 para escuelas.
4. **Espacios, radios y sombras:** reglas visuales.
5. **Fondos:** los 9 presets en tarjetas a ancho completo, con selector de tono.
6. **Botones:** todas las variantes × tamaños × estados (incluido cargando y deshabilitado).
7. **Formularios:** cada control con estado normal, foco, error y deshabilitado; formulario de ejemplo completo con validación real.
8. **Tarjetas:** ProductCard, CategoryCard, KitCard, StoreCard, tarjeta de solución, tarjeta infantil.
9. **Navegación:** breadcrumbs, tabs, acordeón, paginación (admin), header y footer en miniatura.
10. **Feedback:** botones que disparan cada toast y cada FriendlyDialog de la matriz §4, estados vacíos, skeletons, InlineAlert.
11. **Movimiento:** demos de cada animación A-xx con botón "Reproducir" y un interruptor "Simular movimiento reducido".
12. **Componentes de dominio:** StatCounter, DimensionDiagram (con datos del Bolik Ultra), ColorSwatches, PackSelector, Stepper, Timeline, VideoHero en miniatura.
13. **Iconos:** set de Lucide usado + íconos de beneficios propios.

Reglas: la página usa datos ficticios **fijos** (nada aleatorio, para que las capturas no cambien), y cada sección tiene `id` para enlazarla.
