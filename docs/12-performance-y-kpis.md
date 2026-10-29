# 12 · Performance y KPIs

## 1. Metas de Core Web Vitals (percentil 75, móvil, datos de campo)

| Métrica | Meta Bolik | Umbral "bueno" de Google |
|---|---|---|
| **LCP** (carga del elemento principal) | ≤ **2.0 s** | ≤ 2.5 s |
| **INP** (respuesta a interacciones) | ≤ **150 ms** | ≤ 200 ms |
| **CLS** (estabilidad visual) | ≤ **0.05** | ≤ 0.1 |
| TTFB (servidor) | ≤ 400 ms | ≤ 800 ms |
| FCP | ≤ 1.5 s | ≤ 1.8 s |

Laboratorio (Lighthouse móvil, throttling por defecto) en CI: **Rendimiento ≥ 95** (≥ 90 tolerado en home por el video), **Accesibilidad ≥ 95**, **Buenas prácticas ≥ 95**, **SEO = 100**.

## 2. Presupuestos por página

| Página | JS inicial (gzip) | CSS (gzip) | Imágenes arriba del pliegue | Fuentes | Peticiones iniciales |
|---|---|---|---|---|---|
| Inicio | ≤ 120 KB | ≤ 25 KB | Póster ≤ 120 KB | 2 familias, ≤ 4 archivos woff2 | ≤ 25 |
| Catálogo / categoría | ≤ 100 KB | ≤ 25 KB | ≤ 6 tarjetas × 25 KB | 2 familias | ≤ 25 |
| Ficha | ≤ 110 KB | ≤ 25 KB | Imagen principal ≤ 90 KB | 2 familias | ≤ 25 |
| Dónde comprar | ≤ 100 KB (+ mapa diferido ≤ 60 KB) | ≤ 25 KB (+ CSS de Leaflet diferido) | — | 2 familias | ≤ 25 |
| Escuelas | ≤ 100 KB | ≤ 25 KB | ≤ 150 KB | 3 familias (incluye Baloo 2) | ≤ 28 |

Verificación: `pnpm analyze` (bundle analyzer) y Lighthouse CI con `budget.json` (ver `starter/tests/lighthouserc.json`).

## 3. Checklist de rendimiento

### Servidor y red
- [ ] Páginas públicas prerenderizadas (sin consultas a BD en la petición).
- [ ] IIS con **HTTP/2**, TLS 1.2+, compresión **Brotli** (o gzip) para HTML, JS, CSS, JSON, SVG, TXT.
- [ ] `/_next/static/*` y `/media/*` con `Cache-Control: public, max-age=31536000, immutable`.
- [ ] HTML con `Cache-Control` que permita revalidar (lo gestiona Next).
- [ ] `preconnect` solo a dominios que se usan arriba del pliegue (ninguno en el MVP: todo es propio).

### HTML, CSS y JS
- [ ] Server Components por defecto; cada `"use client"` justificado.
- [ ] `dynamic(() => import(...))` para: mapa, buscador (Fuse), drawer de cotización (al primer clic), diálogos, Motion, PDF.
- [ ] Analítica con `@next/third-parties` o `next/script` `strategy="afterInteractive"`/`"lazyOnload"`; Clarity con `lazyOnload`.
- [ ] Sin librerías de iconos completas (importar ícono por ícono).
- [ ] Tailwind sin CSS sin usar (v4 lo hace automáticamente); CSS crítico en línea lo maneja Next.
- [ ] Sin `useEffect` que cambie el layout tras la carga (CLS).

### Fuentes
- [ ] `next/font/google` (autohospedadas), `display: "swap"`, `subsets: ["latin"]`, `adjustFontFallback` activo (reduce CLS).
- [ ] Solo los pesos usados: Bricolage 700/800, DM Sans 400/500/700 (o variable), Baloo 2 700/800 solo en escuelas.

### Imágenes y video
- [ ] `next/image` siempre; `sizes` exactos; `priority` solo en el LCP; `loading="lazy"` en el resto (por defecto).
- [ ] Formato WebP (AVIF opcional), 6 anchos generados al subir; `placeholder="blur"` con `blurDataURL`.
- [ ] Contenedores con proporción fija (`aspect-ratio`) para evitar CLS.
- [ ] Video del hero: póster es el LCP; video tras `load` y en ocioso; sin video con Save-Data o 2g/3g; `preload="none"` en capítulos no activos.
- [ ] Mapa estático (imagen) en `/contacto`; mapa interactivo solo en `/donde-comprar` y al entrar en pantalla.

### Interacción (INP)
- [ ] Manejadores de clic livianos; trabajo pesado con `startTransition` o diferido.
- [ ] Búsqueda con *debounce* de 120 ms; índice cargado al enfocar, no al cargar.
- [ ] Filtros del catálogo sin peticiones al servidor (datos en la página).
- [ ] Animaciones solo con `transform`/`opacity` (doc 09).

## 4. Analítica: eventos (GA4)

Nombres en `snake_case`. Implementación en `src/features/analytics/track.ts` con una función `track(event, params)` que envía a GA4 y, para clics salientes, también a `/api/beacon` (tabla `OutboundClick`) con `navigator.sendBeacon`.

| Evento | Cuándo | Parámetros |
|---|---|---|
| `hero_chapter_view` | Cambia el capítulo del hero (por clic) | `chapter` |
| `hero_cta_click` | Clic en CTA del hero | `chapter`, `cta` |
| `solution_click` | Tarjeta de público en home | `audience` |
| `category_click` | Tarjeta de categoría | `category` |
| `search_open` / `search` / `search_no_results` | Buscador | `query`, `results` |
| `product_view` | Carga de ficha | `product`, `sku` |
| `color_select` | Cambio de color | `product`, `sku` |
| `pack_select` | Cambio de presentación | `product`, `packaging` |
| `quote_add` | Agregar a cotización | `item_type`, `sku`, `packaging`, `quantity`, `source` |
| `quote_remove` | Quitar línea | `sku` |
| `quote_open` | Abrir drawer o página | `lines` |
| `quote_form_start` | Primer campo tocado | `customer_type` |
| `quote_submit` | Envío exitoso (**conversión**) | `lines`, `customer_type`, `department` |
| `quote_error` | Error al enviar | `reason` |
| `school_request_submit` | Solicitud de visita (**conversión**) | `level`, `department` |
| `distributor_submit` | Solicitud de distribuidor (**conversión**) | `business_type`, `department` |
| `contact_submit` | Mensaje de contacto | `subject` |
| `whatsapp_open` | Abrir WhatsApp (**conversión secundaria**) | `context` (`product`/`quote`/`general`), `sku` |
| `retailer_click` | Clic a Walmart/La Torre (**conversión secundaria**) | `retailer`, `sku` |
| `maps_click` | "Cómo llegar" | `store`, `department` |
| `store_filter` | Cambio de departamento | `department` |
| `geolocation` | Usar mi ubicación | `granted` |
| `pdf_download` | Ficha técnica PDF | `sku` |
| `dimension_open` | Diagrama de medidas | `part` |
| `splash_skip` | Saltar splash | — |

Sin datos personales en los eventos (nunca nombre, teléfono ni correo).

## 5. KPIs

### Negocio (los que se reportan a Gerencia)

| KPI | Definición | Fuente | Meta inicial* |
|---|---|---|---|
| Cotizaciones recibidas | `QuoteRequest` creadas / semana (sin spam) | BD | Línea base en 4 semanas; luego +10 % mensual |
| Tasa de envío de cotización | `quote_submit` / `quote_open` | GA4 | ≥ 30 % |
| Cotizaciones ganadas | `status = ganada` / cerradas | BD (Ventas actualiza) | Línea base |
| Clics a puntos de venta | `retailer_click` + `maps_click` / mes | BD (`OutboundClick`) + GA4 | Línea base; +15 % en temporada escolar |
| Conversaciones de WhatsApp | `whatsapp_open` / mes | GA4 + BD | Línea base |
| Solicitudes de escuelas | `SchoolVisitRequest` / mes | BD | ≥ 10 en enero–febrero |
| Solicitudes de distribuidor | `DistributorApplication` / mes | BD | ≥ 3 / mes |
| Tráfico orgánico | Clics desde Google | Search Console | +50 % a 3 meses vs. sitio actual |
| Palabras clave en top 10 | De la lista del doc 10 §1 | Search Console | 10 de 15 a 6 meses |
| Tráfico desde IA | Sesiones del canal "IA" | GA4 | Medir desde el lanzamiento |

\* Las metas iniciales se ajustan con Gerencia y Ventas tras 4 semanas de datos reales.

### Técnicos

| KPI | Meta | Fuente |
|---|---|---|
| LCP / INP / CLS p75 móvil | 2.0 s / 150 ms / 0.05 | Search Console (CrUX), RUM con `useReportWebVitals` |
| Lighthouse móvil en CI | ≥ 95 / 95 / 95 / 100 | Lighthouse CI |
| Disponibilidad | ≥ 99.5 % mensual | Monitor de disponibilidad |
| Errores 5xx | < 0.1 % de peticiones | Logs |
| 404 desde URLs viejas | 0 con tráfico | `NotFoundLog`, Search Console |
| Cotizaciones con `erpStatus = error` > 24 h | 0 | Dashboard admin |
| Tiempo de build | < 5 min | CI |

### RUM (datos reales de usuarios)
`src/app/(site)/web-vitals.tsx` con `useReportWebVitals` envía LCP, INP, CLS, TTFB a GA4 como eventos (`web_vital`, con `name`, `value`, `rating`, `path`). En GA4 se crea un informe por página.

## 6. Dashboard del admin

Tarjetas (últimos 7 y 30 días, comparadas con el periodo anterior):
- Cotizaciones nuevas, en proceso, ganadas.
- Solicitudes de escuelas y distribuidores.
- Clics a tiendas por cadena y por departamento (top 5).
- Clics a WhatsApp.
- Productos más agregados a cotizaciones (top 10).
- Cotizaciones con error de envío a SAP (con botón reintentar).
- Última sincronización del catálogo.
- 404 más frecuentes (con "Crear redirección").
