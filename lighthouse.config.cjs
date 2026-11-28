/**
 * Lighthouse CI (BD-015, docs/12 y docs/13 §7): preset móvil, 3 corridas por URL, contra el build de
 * producción. Local: `pnpm build` y después `pnpm lhci` (levanta `start:local` en 127.0.0.1:3100).
 * Con LHCI_BASE_URL (la CI, que prueba el artefacto) no se levanta servidor.
 *
 * Las aserciones usan el default de LHCI ("optimistic"): la mejor de las 3 corridas. Los tiempos
 * (LCP, TBT, puntaje de rendimiento) varían entre corridas iguales (LCP de la home: 2.9–3.2 s) y la
 * mediana fallaría al azar; los tamaños (JS, CSS, peticiones) no varían. El reporte del PR muestra
 * la corrida mediana.
 *
 * Cada ticket que publica una página agrega aquí su URL; los presupuestos de "el resto" ya aplican.
 * La ficha de producto entra en «el resto» (165 KB de JS desde BD-047; 170 desde BD-060).
 * Los KB de JS son transferidos (gzip + cabeceras): Next 16 + React 19 ocupan ~134 KB comprimidos más
 * ~1 KB de cabeceras por archivo (docs/12 §2).
 */
const PORT = "3100";
const externalUrl = process.env.LHCI_BASE_URL;
const base = externalUrl ?? `http://127.0.0.1:${PORT}`;

if (!externalUrl) {
  // start:local hereda estas variables: mismo puerto que Playwright, sin ERP ni correo reales.
  Object.assign(process.env, {
    PORT,
    HOSTNAME: "127.0.0.1",
    ERP_MODE: "noop",
    SMTP_MODE: "file",
  });
}

const KB = 1024;

/** Puntajes de docs/12 §1 y presupuestos de docs/12 §2 comunes a todas las páginas. */
const common = {
  "categories:accessibility": ["error", { minScore: 0.95 }],
  "categories:best-practices": ["error", { minScore: 0.95 }],
  "categories:seo": ["error", { minScore: 1 }],
  "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
  "resource-summary:stylesheet:size": ["error", { maxNumericValue: 25 * KB }],
  "resource-summary:font:count": ["error", { maxNumericValue: 4 }],
  "resource-summary:total:count": ["error", { maxNumericValue: 25 }],
};

module.exports = {
  ci: {
    collect: {
      ...(externalUrl
        ? {}
        : // start:local copia public/ antes de arrancar: con imágenes y video tarda más de 10 s.
          { startServerCommand: "pnpm start:local", startServerReadyTimeout: 60_000 }),
      url: [
        `${base}/`,
        `${base}/productos`,
        `${base}/productos/boligrafos`,
        // La ficha (BD-062): la página más importante para SEO y cotización.
        `${base}/productos/boligrafos/bolik-ultra`,
        // Dónde comprar (BD-080): la lista completa de tiendas con su isla de filtros.
        `${base}/donde-comprar`,
        // Un departamento (BD-082): sus tiendas con el mapa diferido.
        `${base}/donde-comprar/quetzaltenango`,
        // Bolik en tu escuela (BD-105): estilo infantil, Baloo 2 y el formulario de visita.
        `${base}/escuelas`,
        // Mi cotización (BD-072): el formulario más pesado del sitio (noindex).
        `${base}/cotizacion`,
        // Buscador (BD-066): la página de una búsqueda, con resultados (proxy.ts → /buscar/[q]).
        `${base}/buscar?q=ultra`,
        // Confirmación (BD-075): sin la cookie de quien la envió, el mensaje sin datos.
        `${base}/cotizacion/enviada/COT-2026-000001`,
      ],
      numberOfRuns: 3,
      settings: {
        // Los runners de Linux de GitHub no permiten el sandbox de Chrome.
        ...(process.env.CI ? { chromeFlags: "--no-sandbox" } : {}),
      },
    },
    assert: {
      assertMatrix: [
        {
          // Home: ≥ 90 en rendimiento y JS ≤ 160 KB. LCP: guardia de regresión en 3.2 s (BD-055).
          // El LCP es el texto del h1 y el navegador lo pinta a los ~0.5 s, pero la simulación de
          // Lantern le carga todo lo pedido antes del primer pintado (~140 KB de Next/React, el JS
          // de la página y las fuentes): da 2.9–3.2 s y ningún ajuste lo bajó de ahí (docs/12 §1).
          // La meta de 2.0 s es de campo (p75 móvil) y se mide con usuarios reales en BD-126.
          matchingUrlPattern: "^https?://[^/]+/$",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
            "total-blocking-time": ["error", { maxNumericValue: 200 }],
            // BD-047: 153.9 KB medidos (las cabeceras de documento ya no van en los .js); 160 KB deja
            // margen para el archivo que suma la primera isla del admin (BD-115, docs/12 §2).
            "resource-summary:script:size": ["error", { maxNumericValue: 160 * KB }],
          },
        },
        {
          // El resto (BD-060, decisiones del usuario): ≥ 90 en rendimiento, como la home (el puntaje
          // cae por el mismo LCP simulado); LCP con la misma guardia
          // de regresión de 3.2 s que la home (la meta de 2.0 s es de campo, BD-126: Lantern da
          // ~3.0 s por el JS y las fuentes aunque se pinte a los ~0.4 s); JS ≤ 165 KB: la parte común
          // (Next, React y el layout) ocupa ~150 KB en cualquier página y /productos mide 158.3 KB
          // (BD-047; antes 170). Sin las fichas (abajo).
          matchingUrlPattern:
            "^https?://[^/]+/(?!productos/[^/]+/[^/]+$)(?!cotizacion(?:$|/))(?!buscar(?:$|\\?))(?!donde-comprar/[^/]+$)(?!escuelas$).+",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 165 * KB }],
          },
        },
        {
          // Bolik en tu escuela (BD-105): su criterio pedía ≥ 0.95 en rendimiento; la CI da 0.93 en
          // las 3 corridas (la tercera familia, Baloo 2, en el h1, que no se puede precargar solo
          // aquí). El usuario aceptó el tope del resto, 0.90 (28 nov 2026), como en BD-047. Formulario
          // diferido (school-form-loader.tsx): 160.0 KB de JS medidos.
          matchingUrlPattern: "^https?://[^/]+/escuelas$",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 165 * KB }],
          },
        },
        {
          // /buscar (BD-066) y la confirmación de la cotización (BD-075): como el resto, pero noindex
          // a propósito (páginas de utilidad, docs/10 §3): «se puede indexar» y SEO no aplican. Las
          // páginas de departamento (BD-082) también, mientras no tengan su texto local (docs/10 §9):
          // cuando Mercadeo lo escriba, van con el resto.
          matchingUrlPattern:
            "^https?://[^/]+/(?:buscar(?:$|\\?)|cotizacion/enviada/|donde-comprar/[^/]+$)",
          assertions: {
            ...common,
            "categories:seo": "off",
            "is-crawlable": "off",
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 165 * KB }],
          },
        },
        {
          // /cotizacion (BD-072): noindex a propósito (página de utilidad, docs/10 §3): la auditoría
          // «se puede indexar» y el puntaje de SEO no aplican. JS ≤ 178 KB (BD-072 lo subió a 186; BD-047
          // midió 173.6): la lista con su formulario suma ~15 KB a la parte común aun con `zod/mini`
          // descargado al interactuar.
          matchingUrlPattern: "^https?://[^/]+/cotizacion$",
          assertions: {
            ...common,
            "categories:seo": "off",
            "is-crawlable": "off",
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 178 * KB }],
          },
        },
        {
          // Fichas de producto (BD-062, decisión del usuario): lo mismo que el resto, pero el LCP
          // es la foto principal (no texto) y Lantern le suma el documento, que pesa más (el
          // contenido de la ficha y su payload RSC): da ~3.4 s aunque la foto llegue a los ~0.6 s.
          // Guardia de 3.5 s; la meta de 2.0 s sigue siendo de campo (BD-126).
          matchingUrlPattern: "^https?://[^/]+/productos/[^/]+/[^/]+$",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3500 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            // JS ≤ 165 KB como el resto (161.8 medidos en BD-076). 27 peticiones: desde BD-071,
            // Turbopack separa el mapa de import() del layout en otro archivo; desde BD-076 (decisión
            // del usuario, 24 nov 2026), también el cliente de Flight de React, porque los formularios
            // públicos llaman a Server Actions desde el navegador (docs/12 §2).
            "resource-summary:script:size": ["error", { maxNumericValue: 165 * KB }],
            "resource-summary:total:count": ["error", { maxNumericValue: 27 }],
          },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
