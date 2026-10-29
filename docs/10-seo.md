# 10 · SEO

El SEO es la prioridad número uno junto con la velocidad. Este documento cubre el SEO **técnico** (lo que hace desarrollo). Código de referencia: `starter/src/features/seo/*`, `starter/src/app/sitemap.ts`, `robots.ts`, `starter/src/proxy.ts`.

## 1. Mapa de palabras clave por página

Cada página apunta a **una intención principal**. No se repite la misma palabra clave principal en dos páginas (canibalización).

| Página | Palabra clave principal | Secundarias | `<title>` (≤ 60 caracteres) |
|---|---|---|---|
| `/` | Bolik | lapiceros Bolik, útiles escolares Guatemala, fábrica de lapiceros Guatemala | Bolik · Útiles escolares y de oficina hechos en Guatemala desde 1966 *(título por defecto, sin plantilla)* |
| `/productos` | catálogo Bolik | útiles escolares Bolik, productos Bolik | Catálogo de útiles escolares y de oficina |
| `/productos/boligrafos` | bolígrafos Guatemala | lapiceros, lapiceros Bolik, bolígrafos por mayor | Bolígrafos y lapiceros |
| `/productos/marcadores` | marcadores Guatemala | marcadores de pizarra, permanentes, fluorescentes | Marcadores de pizarra, permanentes y fluorescentes |
| `/productos/lapices-y-lapices-de-colores` | lápices de colores Guatemala | lápices de grafito | Lápices y lápices de colores |
| `/productos/crayones-de-cera` | crayones de cera | crayones jumbo | Crayones de cera para niños |
| `/productos/boligrafos/bolik-ultra` | Bolik Ultra | bolígrafo hexagonal, lapicero Bolik azul, PT00058 | Bolik Ultra, bolígrafo hexagonal punta 1.0 mm |
| `/donde-comprar` | dónde comprar Bolik | librerías Guatemala, útiles escolares cerca de mí | Dónde comprar Bolik en Guatemala |
| `/donde-comprar/quetzaltenango` | útiles escolares Quetzaltenango | librerías Quetzaltenango | Dónde comprar Bolik en Quetzaltenango |
| `/mayoreo` | lapiceros por mayor Guatemala | útiles escolares al por mayor, distribuidor de útiles | Lapiceros y útiles escolares por mayor |
| `/empresas` | lapiceros personalizados Guatemala | bolígrafos con logo, artículos promocionales | Lapiceros personalizados con tu logo |
| `/escuelas` | actividades escolares de escritura | talleres para escuelas, Bolik en tu escuela | Bolik en tu escuela: talleres y actividades |
| `/kits-escolares` | kit escolar Guatemala 2027 | lista de útiles escolares | Kits escolares 2027 por grado |
| `/nuestra-historia` | historia de Bolik | Fábrica de Bolígrafos K-66, hecho en Guatemala | 60 años de historia Bolik |
| `/preguntas-frecuentes` | preguntas frecuentes Bolik | — | Preguntas frecuentes |

Slugs de categorías: `boligrafos`, `lapices-y-lapices-de-colores`, `crayones-de-cera`, `marcadores`, `pegamentos-y-silicon`, `borradores-y-sacapuntas`, `tijeras-reglas-y-geometria`, `articulos-publicitarios`.

**Descripciones (meta description):** 140–160 caracteres, con la palabra clave y un beneficio + acción. Editables en el admin (`seoTitle`, `seoDescription`); si están vacías se generan con una plantilla (ej. ficha: `"{nombre}: {tagline}. {dato clave}. Encuentra dónde comprar o cotiza por mayor con Bolik, hecho en Guatemala."`).

## 2. Rastreo e indexación

| Regla | Implementación |
|---|---|
| HTML completo en el servidor | Server Components + prerender. El contenido nunca depende de JS para aparecer |
| Un dominio canónico | `https://www.bolik66.com`. IIS redirige http→https y `bolik66.com`→`www` (301, un solo salto) |
| Sin barra final | `trailingSlash: false` (por defecto) |
| Minúsculas, guiones, sin acentos | Función `slugify()` en `lib/slug.ts`; validación en el admin |
| Canónica en cada página | `alternates.canonical` vía `buildMetadata()` |
| Parámetros | `?color=`, `?linea=`, `utm_*` → canónica sin parámetros |
| Utilidades sin indexar | `noindex, follow` en `/buscar`, `/cotizacion`, `/cotizacion/enviada/*`, `/styleguide`; `/admin` y `/api` además en `Disallow` |
| Staging | `robots.txt` con `Disallow: /` + cabecera `X-Robots-Tag: noindex` en IIS + contraseña básica |
| 404 reales | `notFound()` devuelve 404 (no "soft 404"); páginas de departamento sin tiendas → 404 o `noindex` |
| Paginación | No se necesita en el MVP (catálogo pequeño) |

## 3. Metadata por página

```tsx
// src/app/(site)/productos/[categoria]/[producto]/page.tsx
import { buildMetadata } from "@/features/seo/metadata";
import { getProductBySlug, listProductParams } from "@/server/data/products";

export async function generateStaticParams() {
  return listProductParams(); // [{ categoria: "boligrafos", producto: "bolik-ultra" }, …]
}

export async function generateMetadata({ params }: PageProps<"/productos/[categoria]/[producto]">) {
  const { categoria, producto } = await params;
  const p = await getProductBySlug(producto);
  if (!p) return {};
  return buildMetadata({
    title: p.seoTitle ?? `${p.name}, ${p.tagline ?? p.category.name}`,
    description: p.seoDescription ?? defaultProductDescription(p),
    path: `/productos/${categoria}/${producto}`,
    image: `/productos/${categoria}/${producto}/opengraph-image`,
  });
}
```

> `PageProps<"…">` es el tipo global que generan las versiones recientes de Next para rutas tipadas. Si tu versión no lo tiene, tipa `params` como `Promise<{ categoria: string; producto: string }>`.

Checklist por página pública:
- [ ] `title` único (≤ 60 caracteres) y `description` única (140–160).
- [ ] Canónica absoluta correcta.
- [ ] Imagen Open Graph 1200 × 630 (`opengraph-image.tsx` generado con `next/og` para productos y categorías; imagen por defecto en `public/og/default.png`).
- [ ] Un solo `h1` que contiene la palabra clave principal.
- [ ] `h2` por sección, sin saltar niveles.
- [ ] JSON-LD válido (ver §4).
- [ ] Enlaces internos a páginas relacionadas (ver §7).
- [ ] Imágenes con `alt` descriptivo.

## 4. Datos estructurados (JSON-LD)

| Página | Tipos |
|---|---|
| Todas (en el layout) | `Organization` (con `@id` estable) |
| Inicio | `WebSite` + `SearchAction`, `FAQPage` |
| Catálogo y categorías | `CollectionPage`, `ItemList`, `BreadcrumbList`, `FAQPage` |
| Ficha de producto | `ProductGroup` con variantes `Product` (`sku`, `gtin12`, `color`), `BreadcrumbList`, `FAQPage` |
| Dónde comprar y departamentos | `ItemList` de `Store` (dirección y coordenadas solo si verificadas), `BreadcrumbList` |
| Historia | `AboutPage` + `Organization` (`foundingDate: 1966-06`) |
| Preguntas frecuentes | `FAQPage` |

Reglas:
- **No inventar:** sin `offers`, `price`, `aggregateRating` ni `review`. Google puede no mostrar fragmento enriquecido de producto sin precio; está bien: el objetivo es que Google y la IA **entiendan** el producto, su código y su fabricante.
- `gtin12` solo si el código de barras tiene 12 dígitos y pasó la validación del dígito verificador (`lib/barcode.ts`).
- El texto del JSON-LD debe coincidir con lo visible en la página.
- Validar con la Prueba de resultados enriquecidos de Google y con validator.schema.org (ticket BD-091).

Ejemplo de salida (Bolik Ultra, abreviado):

```json
{
  "@context": "https://schema.org",
  "@type": "ProductGroup",
  "name": "Bolik Ultra",
  "productGroupID": "bolik-ultra",
  "brand": { "@type": "Brand", "name": "Bolik" },
  "manufacturer": { "@id": "https://www.bolik66.com/#organization" },
  "countryOfOrigin": "GT",
  "variesBy": "https://schema.org/color",
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "Tipo de punta", "value": "Mediana 1.0 mm" },
    { "@type": "PropertyValue", "name": "Forma", "value": "Hexagonal" }
  ],
  "hasVariant": [
    { "@type": "Product", "name": "Bolik Ultra Azul", "sku": "PT00058", "gtin12": "759364663092", "color": "Azul" },
    { "@type": "Product", "name": "Bolik Ultra Negro", "sku": "PT00059", "gtin12": "759364663108", "color": "Negro" }
  ]
}
```

## 5. Sitemap y robots

- `src/app/sitemap.ts`: una sola URL `/sitemap.xml` con páginas estáticas, categorías, productos publicados (con sus imágenes) y departamentos con tiendas. `lastModified` = `updatedAt` real.
- Se regenera con los mismos tags de caché que los datos; tiene respaldo de revalidación cada hora.
- `src/app/robots.ts`: producción permite todo excepto utilidades; staging bloquea todo. Bots de IA permitidos explícitamente (doc 11).
- Al publicar: enviar el sitemap en Google Search Console y Bing Webmaster Tools (ticket BD-096); IndexNow notifica cambios a Bing y otros (doc 11).

## 6. Redirecciones desde el sitio Joomla

**Riesgo principal de la migración:** perder las posiciones que ya tiene bolik66.com. Cada URL vieja con tráfico o enlaces debe responder **301** a su equivalente nuevo, en **un solo salto**.

Proceso (ticket BD-094):
1. **Inventario:** rastrear el sitio actual (Screaming Frog o script con `fetch` + parseo de enlaces) y exportar de Search Console las páginas con impresiones de los últimos 16 meses.
2. **Mapear** cada URL vieja → nueva en `src/features/seo/legacy-redirects.ts` (mapa estático) o en la tabla `Redirect` (casos sueltos, editables en el admin).
3. **Implementación:**
   - Rutas `/index.php/*`, `/index.php?option=com_virtuemart&…` y `/component/virtuemart/*` → `proxy.ts` (mapa estático en memoria, sin BD).
   - Redirecciones creadas en el admin → se consultan en `not-found.tsx` antes de mostrar el 404 (`permanentRedirect()`), así no se toca la BD en cada petición.
   - `http`, sin `www` → IIS URL Rewrite.
4. **Prueba automática** `pnpm check:redirects`: lee la lista de URLs viejas, hace petición a cada una contra staging y verifica: estado 301, un solo salto, destino responde 200.
5. **Después del lanzamiento:** revisar `NotFoundLog` y el informe de cobertura de Search Console cada semana durante 2 meses.

Mapa inicial (completar con el rastreo):

| URL vieja | Destino |
|---|---|
| `/index.php/productos` | `/productos` |
| `/index.php/boligrafos` | `/productos/boligrafos` |
| `/index.php/marcadores-de-pizarra` (y demás marcadores) | `/productos/marcadores` |
| `/index.php/cepillos-dentales` (era "Estuche escolar") | `/productos` |
| `/index.php/distribuidores` | `/donde-comprar` |
| `/index.php/contactenos` | `/contacto` |
| `/index.php/3-vision-y-mision` | `/nuestra-historia` |
| `/index.php/articulos-publicitarios` | `/empresas` |
| `/index.php?option=com_virtuemart&view=productdetails&virtuemart_product_id=17…` | `/productos/boligrafos/bolik-ultra` |
| `/component/virtuemart/trio-ultra` | `/productos/boligrafos/bolik-ultra` |
| Imágenes viejas `/images/stories/virtuemart/product/*` | 301 a la ficha del producto si se conoce; si no, 410 |

## 7. Enlazado interno

- Header y footer enlazan a todas las secciones principales y a cada categoría.
- Breadcrumbs en todas las páginas excepto el inicio.
- Ficha → su categoría, productos relacionados, dónde comprar, mayoreo.
- Categoría → todas sus fichas + categorías hermanas.
- Dónde comprar → cada departamento; cada departamento → departamentos vecinos.
- Escuelas ↔ kits escolares; mayoreo ↔ empresas.
- Textos de enlace descriptivos ("Ver marcadores de pizarra"), nunca "clic aquí".

## 8. Imágenes

- `next/image` con `alt` real (obligatorio en el admin), `width`/`height` (sin CLS), `sizes` acorde al diseño.
- Nombres de archivo descriptivos generados desde el slug: `bolik-ultra-azul-punta-a1b2c3-960.webp`.
- Imágenes de producto incluidas en el sitemap.
- Formato WebP (y AVIF opcional); el LCP de cada página con `priority`.

## 9. SEO local

- **NAP idéntico** (nombre, dirección, teléfono) en el pie, en `/contacto` y en el JSON-LD `Organization`.
- Páginas por departamento con texto propio (no plantillas idénticas): cuántas tiendas hay, municipios, y por qué comprar Bolik ahí. Mínimo 120 palabras únicas por página; si un departamento no tiene contenido propio ni tiendas, no se publica.
- La ficha de Google Business Profile de la planta la gestiona Mercadeo; el sitio solo debe coincidir con sus datos.

## 10. Velocidad como factor SEO

Las Core Web Vitals son parte de la evaluación de Google. Metas y técnicas en `docs/12-performance-y-kpis.md`. Regla práctica: **ninguna página pública sale a producción con Lighthouse móvil < 90 en Rendimiento o < 100 en SEO.**

## 11. Herramientas y verificación

| Herramienta | Uso | Cuándo |
|---|---|---|
| Google Search Console | Cobertura, rendimiento, Core Web Vitals, sitemaps, inspección de URL | Desde staging (propiedad de dominio) y semanal tras el lanzamiento |
| Bing Webmaster Tools | Igual + IndexNow; Bing alimenta a Copilot y otros asistentes | Lanzamiento |
| Prueba de resultados enriquecidos / validator.schema.org | Validar JSON-LD | Cada plantilla nueva |
| Lighthouse / PageSpeed Insights | SEO y rendimiento | En CI y antes de cada release |
| `pnpm check:redirects` | Redirecciones | Antes y después del lanzamiento |
| Screaming Frog (o script de rastreo) | Enlaces rotos, títulos duplicados, canónicas | Antes del lanzamiento y mensual |
