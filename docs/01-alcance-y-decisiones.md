# 01 · Alcance y decisiones

## 1. El problema

El sitio actual (Joomla + VirtueMart) es un folleto: no posiciona en Google (misma descripción en todas las páginas, URLs con parámetros, http/https mezclados), no permite cotizar, la lista de "dónde comprar" no tiene direcciones ni mapa y el único contacto es PBX y fax. Los pedidos de librerías llegan por teléfono y se digitan a mano en SAP.

## 2. Qué es el MVP

Un sitio **rápido, encontrable y útil** que:

1. Presenta la marca con fuerza (60 años, hecho en Guatemala) y un hero con video.
2. Publica el **catálogo** con fichas técnicas completas, generadas desde datos (no imágenes de texto).
3. Lleva al consumidor a un **punto de venta** (mapa, departamentos, Walmart y La Torre en línea).
4. Capta **cotizaciones de mayoreo** con una "cotización" tipo carrito, folio y envío a Ventas/SAP.
5. Capta **visitas escolares** y **nuevos distribuidores**.
6. Deja que Mercadeo **edite contenido** sin programador (admin).
7. Es entendible para **buscadores con IA** (ChatGPT, Gemini, Perplexity, Copilot).

### Dentro del MVP

| Área | Incluye |
|---|---|
| Sitio público | Splash, home, catálogo, categorías, fichas, búsqueda, dónde comprar (+ páginas por departamento), escuelas, mayoreo, empresas, kits escolares, historia, contacto, preguntas frecuentes, legales, 404/500 |
| Conversión | Cotización (drawer + página + envío con folio), WhatsApp contextual, formularios de visita escolar, distribuidor y contacto |
| Contenido | Fichas técnicas como datos, PDF descargable por color, medidas interactivas, códigos y empaques |
| Admin | Login con roles, productos, tiendas, kits, solicitudes, contenido de home, fondos configurables, ajustes, redirecciones, auditoría |
| SEO / IA | Metadata, JSON-LD, sitemap, robots, redirecciones 301 desde Joomla, `llms.txt`, IndexNow, imágenes OG |
| Calidad | `/styleguide`, pruebas unitarias, E2E, accesibilidad, Lighthouse CI |
| Operación | Despliegue en IIS + Node, CI/CD, respaldos, monitoreo, analítica |

### Fuera del MVP (Fase 2 y siguientes)

- Portal B2B con usuario por cliente, precios por cliente, pedidos directos a SAP, estado de cuenta y facturas FEL.
- Pagos en línea y checkout propio.
- Cotizador visual de artículos publicitarios con carga de logo.
- Inicio de sesión con Microsoft Entra ID.
- Multi-marca (FAES, Graco Pack) usando la misma base.
- Idioma inglés.

## 3. Públicos y lo que buscan

| Público | Necesidad principal | Conversión esperada |
|---|---|---|
| Padres de familia | ¿Dónde lo compro cerca? ¿Qué kit lleva mi hijo? | Clic a tienda / Walmart, ver kit |
| Docentes y colegios | Útiles para el aula, actividades, precios para colegio | Solicitud de visita, cotización de kits |
| Librerías | Precios por cajilla y fardo, preventa escolar | Cotización de mayoreo |
| Distribuidores nuevos | Requisitos, contacto con Ventas | Solicitud de distribuidor |
| Empresas y universidades | Bolígrafos con logo, volumen | Cotización de personalizados |
| Mercadeo / Ventas (internos) | Editar contenido, atender solicitudes | Uso del admin |

## 4. Principios de producto

1. **Rápido antes que vistoso.** Ninguna animación ni video puede empeorar el LCP o el INP.
2. **Encontrable.** Cada página responde una búsqueda real ("lapiceros por mayor Guatemala", "marcadores de pizarra Guatemala", "Bolik Ultra azul").
3. **Un siguiente paso claro.** Toda página termina en una acción: ver tienda, cotizar, escribir por WhatsApp.
4. **Amable.** Cada acción tiene una respuesta cálida y clara; los errores dicen cómo resolverlos.
5. **Datos, no imágenes de texto.** Especificaciones, medidas y códigos viven en la base de datos.
6. **El canal se protege.** El sitio no compite en precio con librerías ni cadenas; las dirige a ellas.

## 5. Decisiones técnicas (ADR resumidos)

### ADR-01 · Next.js App Router en lugar de Astro o un CMS

- **Contexto:** prioridad SEO y velocidad; también hay formularios, server actions, admin e integración con SAP.
- **Alternativas:** Astro (excelente en HTML estático, pero el admin y las acciones del servidor requerirían otra app), WordPress (el problema actual en otra forma), Next.js.
- **Decisión:** Next.js con Server Components y generación estática + ISR. Una sola app con sitio y admin, un solo despliegue.
- **Consecuencia:** disciplina con `"use client"` para no inflar el JS; presupuestos verificados en CI.

### ADR-02 · SQL Server + Prisma

- **Contexto:** la empresa ya opera SQL Server, tiene DBA y respaldos.
- **Decisión:** base nueva `BolikDigital` en SQL Server, acceso con Prisma (proveedor `sqlserver`).
- **Consecuencia:** en SQL Server, Prisma no soporta `enum` ni `Json`. Usamos `String` + constantes validadas con Zod y `NVARCHAR(MAX)` para JSON serializado. Cuidado con `@unique` en columnas opcionales.

### ADR-03 · SAP solo a través de SMART-K66

- **Contexto:** SMART-K66 ya se integra con SAP B1 (HANA).
- **Decisión:** la web usa un adaptador `ErpGateway` que llama a la API de SMART-K66. Si no está disponible, el modo `noop` guarda en la BD y notifica por correo.
- **Consecuencia:** SAP nunca queda expuesto. Las cotizaciones guardan `erpStatus` para reintentos.

### ADR-04 · IIS como proxy inverso hacia Node

- **Contexto:** se decidió desplegar en el IIS interno.
- **Decisión:** Next en `output: "standalone"` como servicio de Windows; IIS con URL Rewrite + ARR termina TLS y reenvía a `localhost:3000`. Los medios subidos se sirven desde IIS con caché larga.
- **Consecuencia:** una sola instancia de Node; la caché ISR vive en disco del servidor.

### ADR-05 · Tailwind v4 + Radix (shadcn/ui) + CSS para animación

- **Decisión:** Tailwind con tokens propios; primitivas accesibles de Radix copiadas al repo; animaciones en CSS, y la librería Motion solo para drawer, modales y listas.
- **Consecuencia:** el JS de animación no entra en el bundle inicial de la home.

### ADR-06 · Medios procesados al subir

- **Decisión:** al subir una imagen en el admin, `sharp` genera WebP en 6 anchos (320–1920) y un `blurDataURL`. Un *loader* propio de `next/image` elige el ancho correcto. Los videos se entregan ya codificados (MP4 H.264) con póster.
- **Consecuencia:** el servidor Node no recomprime imágenes en cada visita; IIS las sirve como archivos estáticos.

### ADR-07 · Búsqueda en el cliente con índice estático

- **Contexto:** el catálogo tiene alrededor de 150 artículos.
- **Decisión:** se genera un índice JSON pequeño (nombre, código, código de barras, categoría, sinónimos) que se descarga solo al enfocar el buscador; se busca con Fuse.js.
- **Consecuencia:** búsqueda instantánea sin costo de servidor; si el catálogo crece mucho, se migra a búsqueda en servidor.

### ADR-08 · Sesión del admin con iron-session

- **Contexto:** el admin lo usan pocas personas internas, con usuario y contraseña propios. Auth.js v5 sigue en beta y agrega piezas (proveedores, adaptadores, rutas) que el MVP no necesita.
- **Decisión:** `iron-session` guarda `{ userId, role, exp }` en una cookie cifrada `bolik_admin` (8 h); `bcryptjs` (coste 12) para contraseñas; bloqueo tras 5 intentos; `proxy.ts` solo comprueba que la cookie exista y cada página/acción del admin valida la sesión y el rol en el servidor (`requireRole`).
- **Consecuencia:** cero dependencias en beta y control total. Si en Fase 2 se usa Microsoft 365 (Entra ID), se agrega OIDC sobre la misma sesión.

## 6. Riesgos técnicos y mitigación

| Riesgo | Mitigación |
|---|---|
| Datos de producto incompletos en SAP | Capa de enriquecimiento en la BD propia, editable en el admin |
| SMART-K66 sin endpoints a tiempo | Adaptador `noop` + correo; la integración se activa con una variable de entorno |
| Perder posicionamiento al migrar | Mapa completo de redirecciones 301 con prueba automática (BD-094) |
| Video pesado en celular | Póster como LCP, video solo con buena conexión; versión vertical ligera |
| Spam en formularios | Honeypot, tiempo mínimo, límite por IP; Turnstile solo si aparece spam |
| Un solo desarrollador | Tickets pequeños, Claude Code, prioridades MoSCoW en el plan |
