# 02 · Branding

Este documento traduce la identidad de Bolik a **especificaciones para desarrollo**: nombres, tokens, tipografía, iconos, imágenes y voz de la interfaz. Los valores exactos viven en `src/styles/tokens.css` (ver `starter/src/styles/tokens.css`).

## 1. Nombre

| Uso | Nombre |
|---|---|
| Proyecto interno, repositorio, documentación | **Bolik Digital** (`bolik-digital`) |
| Marca visible en el sitio | **Bolik** (logotipo oficial) |
| Línea de marca principal | **De la materia prima a tu primer trazo.** |
| Línea de aniversario | **60 años escribiendo con Guatemala** · 1966–2026 |
| Firma corporativa en el pie | Bolik · Una marca de Grupo K-66 *(razón social por confirmar)* |

### Posicionamiento (para orientar decisiones de interfaz)

> Para familias, escuelas, librerías y empresas de Guatemala, **Bolik** es la marca de útiles de escritura **hecha en Guatemala desde 1966** que combina calidad de fábrica con cercanía: encuentras dónde comprar en segundos y cotizas por mayor sin llamadas.

### Pilares de personalidad

| Pilar | Cómo se ve en la interfaz |
|---|---|
| **Cercana** | Trato de tú, mensajes cálidos, ilustraciones con trazos de tinta |
| **Confiable** | Datos técnicos claros, códigos visibles, 60 años de historia |
| **Viva** | Colores sólidos y llamativos, movimiento suave |
| **Práctica** | Siempre un siguiente paso evidente, formularios cortos |

## 2. Logotipo

- Usa **siempre el archivo oficial** que entregue Mercadeo, en SVG (`public/brand/bolik-logo.svg` y versión en negativo `bolik-logo-white.svg`).
- Hasta tenerlo, usa el marcador provisional de la demo: cuadro azul con trazo de tinta + palabra "bolik" en Bricolage Grotesque 800. Debe estar en un solo componente `<Logo />` para cambiarlo en un lugar.
- **Área libre:** igual a la altura de la letra "b" alrededor del logo.
- **Tamaño mínimo:** 96 px de ancho en pantalla.
- **Fondos permitidos:** blanco, `--paper`, `--navy` (versión negativa), `--blue` (versión negativa). Nunca sobre fotografía sin capa oscura.
- **Favicon y app icon:** marca sola (cuadro azul + trazo) en 32, 180 (Apple), 192 y 512 px; `site.webmanifest` con `theme_color` `#1D3FCE`.

## 3. Color

Paleta inspirada en las tintas y el estuche escolar. Colores sólidos, sin degradados llamativos.

| Token | Hex | Uso |
|---|---|---|
| `--blue` | `#1D3FCE` | Color de marca, acción principal, enlaces |
| `--blue-700` | `#142E9C` | Hover/press de azul |
| `--blue-50` | `#E8ECF6` | Fondos suaves, chips |
| `--navy` | `#0B1433` | Fondos oscuros (hero, pie) |
| `--navy-700` | `#13235C` | Superficies sobre navy |
| `--yellow` | `#FFC72C` | Acento, CTA sobre fondo oscuro, subrayados |
| `--yellow-50` | `#FFF3CC` | Fondos suaves de acento |
| `--red` | `#D42A22` | Tinta roja, alertas destructivas, acento |
| `--red-50` | `#FDE8E6` | Fondos suaves |
| `--green` | `#0E7C52` | Éxito, línea Oficina |
| `--green-50` | `#E1F4EB` | Fondos de éxito |
| `--whatsapp` | `#0F7A43` | Solo botones de WhatsApp (5.4:1 con texto blanco; el verde oficial `#25D366` no cumple AA con texto blanco) |
| `--ink` | `#111318` | Títulos, texto principal fuerte |
| `--text` | `#2A2D36` | Texto de párrafo |
| `--muted` | `#4B5368` | Texto secundario (AA sobre blanco y `--soft`) |
| `--line` | `#E3E7F0` | Bordes |
| `--soft` | `#F4F6FB` | Fondos alternos de sección |
| `--paper` | `#FFFFFF` | Fondo base |

**Sección escuelas (sub-paleta "kids", solo ahí):** `--sun #FFD23F`, `--coral #FF5A4E`, `--kblue #2E5BFF`, `--kgreen #22B573`.

**Colores por línea de producto** (chips y tarjetas): Escritura → azul · Escolar → amarillo (texto `--ink`) · Arte → rojo · Oficina → verde.

**Reglas de contraste:** texto normal ≥ 4.5:1; texto grande (≥ 24 px o ≥ 19 px en negrita) ≥ 3:1. Sobre amarillo, el texto siempre es `--ink`. El blanco sobre `--yellow` está prohibido.

**Modo oscuro:** el MVP es de un solo tema claro con secciones oscuras deliberadas (hero, pie). Se declara `color-scheme: light` y se fijan fondos explícitos. El modo oscuro completo queda para después.

## 4. Tipografía

| Rol | Familia | Pesos | Uso |
|---|---|---|---|
| Display | **Bricolage Grotesque** | 700, 800 | Títulos `h1`–`h3`, cifras grandes, logo provisional |
| Texto | **DM Sans** | 400, 500, 700 | Párrafos, botones, formularios, interfaz |
| Infantil | **Baloo 2** | 700, 800 | Solo sección "Bolik en tu escuela" |

Cargar con `next/font/google` (autohospedadas en el build), `display: "swap"`, `subsets: ["latin"]`, variables CSS `--font-display`, `--font-body`, `--font-kids`. Baloo 2 se importa solo en los componentes de escuelas para que no entre en otras páginas.

### Escala tipográfica (mobile → desktop con `clamp`)

| Token | Móvil | Desktop | Uso |
|---|---|---|---|
| `--fs-hero` | 40 px | 74 px | Título del hero |
| `--fs-h1` | 34 px | 56 px | `h1` de página |
| `--fs-h2` | 28 px | 46 px | Títulos de sección |
| `--fs-h3` | 21 px | 26 px | Títulos de tarjeta |
| `--fs-lead` | 18 px | 20 px | Bajadas |
| `--fs-body` | 16 px | 17 px | Texto |
| `--fs-small` | 14 px | 15 px | Ayudas, metadatos |
| `--fs-micro` | 12 px | 13 px | Etiquetas en mayúsculas (con `letter-spacing: .08em`) |

Interlineado: títulos 1.0–1.1, texto 1.6. Ancho de lectura: máximo 65 caracteres (`max-width: 65ch`). Títulos con `text-wrap: balance`.

## 5. Iconografía

- **Lucide** (`lucide-react`), trazo 2 px, esquinas redondeadas, importando ícono por ícono.
- Tamaños: 16, 20, 24 px. En botones, 20 px.
- Íconos solos llevan `aria-label` en su botón.
- Íconos de beneficios de producto (tapa ventilada, baja viscosidad…) como SVG propios en `src/components/icons/benefits/`.
- Nunca emojis como íconos de interfaz.

## 6. Imágenes y video (especificaciones técnicas)

| Tipo | Proporción | Tamaño de origen mínimo | Entrega |
|---|---|---|---|
| Producto (galería) | 1:1 | 2000 × 2000 px, fondo transparente o blanco | WebP 320–1920 px + blur |
| Producto (detalle/punta) | 4:3 | 1600 × 1200 | WebP |
| Categoría (tarjeta) | 4:3 | 1200 × 900 | WebP |
| Escuelas / actividades | 4:3 o 3:2 | 1600 px de ancho | WebP |
| Open Graph | 1200 × 630 | generado con `next/og` | PNG |
| Video hero escritorio | 16:9 | 1920 × 1080 | MP4 H.264, ≤ 6 MB, sin audio, loop 8–15 s |
| Video hero móvil | 4:5 | 1080 × 1350 | MP4 H.264, ≤ 3 MB |
| Póster de video | igual al video | — | WebP/AVIF ≤ 120 KB |

Nombres de archivo: `producto_color_vista.ext` (ej. `bolik-ultra_azul_punta.jpg`).

## 7. Fondos configurables

Fondos predefinidos que el admin asigna por sección (`SectionAppearance`). Todos son CSS puro, sin imágenes pesadas:

| Preset | Descripción |
|---|---|
| `paper` | Blanco liso |
| `soft` | Gris azulado claro `--soft` |
| `dots` | Puntos finos sobre `--soft` (cuaderno punteado) |
| `grid` | Cuadrícula fina tipo cuaderno de matemáticas |
| `lines` | Renglones de cuaderno con margen rojo |
| `ink` | Blanco con un trazo de tinta SVG en una esquina |
| `brand` | Azul `--blue` sólido (texto blanco) |
| `navy` | Navy con puntos sutiles (texto blanco) |
| `sun` | Amarillo `--sun` (sección escuelas) |

Detalle de implementación en `docs/08-styleguide.md#fondos`.

## 8. Voz y tono de la interfaz

- **Tú**, cálido y directo. Frases cortas. Sin tecnicismos ("folio" se explica la primera vez).
- Los botones dicen lo que pasa: "Agregar a mi cotización", "Enviar solicitud", "Ver tiendas en Quetzaltenango".
- Confirmaciones con el resultado concreto: "Listo, agregamos 10 cajillas de Bolik Ultra azul".
- Errores sin culpas: qué pasó + cómo resolverlo + alternativa ("También puedes escribirnos por WhatsApp").
- Nada de mayúsculas sostenidas en frases, nada de signos de exclamación dobles.
- Español de Guatemala: "lapicero" y "bolígrafo" son sinónimos válidos; usa ambos en SEO, "bolígrafo" en fichas.

Todos los textos de feedback van en `src/content/feedback.ts` (ver `docs/17-copys.md#microcopy`).
