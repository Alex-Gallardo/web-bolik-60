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
 * La ficha de producto entra en «el resto» (170 KB de JS desde BD-060).
 * Los KB de JS son transferidos (gzip + cabeceras): Next 16 + React 19 ya ocupan ~146 KB (docs/12 §2).
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
          // Home: ≥ 90 en rendimiento y JS ≤ 165 KB. LCP: guardia de regresión en 3.2 s (BD-055).
          // El LCP es el texto del h1 y el navegador lo pinta a los ~0.5 s, pero la simulación de
          // Lantern le carga todo lo pedido antes del primer pintado (~146 KB de Next/React, el JS
          // de la página y las fuentes): da 2.9–3.2 s y ningún ajuste lo bajó de ahí (docs/12 §1).
          // La meta de 2.0 s es de campo (p75 móvil) y se mide con usuarios reales en BD-126.
          matchingUrlPattern: "^https?://[^/]+/$",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
            "total-blocking-time": ["error", { maxNumericValue: 200 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 165 * KB }],
          },
        },
        {
          // El resto (BD-060, decisiones del usuario): ≥ 90 en rendimiento, como la home (el puntaje
          // cae por el mismo LCP simulado); LCP con la misma guardia
          // de regresión de 3.2 s que la home (la meta de 2.0 s es de campo, BD-126: Lantern da
          // ~3.0 s por el JS y las fuentes aunque se pinte a los ~0.4 s); JS ≤ 170 KB, porque la
          // parte común (Next, React y el layout) ya ocupa ~160 KB en cualquier página. BD-047
          // aligera el layout para volver a bajar el tope.
          matchingUrlPattern: "^https?://[^/]+/.+",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 170 * KB }],
          },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
