/**
 * Lighthouse CI (BD-015, docs/12 y docs/13 §7): preset móvil, 3 corridas por URL, contra el build de
 * producción. Local: `pnpm build` y después `pnpm lhci` (levanta `start:local` en 127.0.0.1:3100).
 * Con LHCI_BASE_URL (la CI, que prueba el artefacto) no se levanta servidor.
 *
 * Las aserciones usan el default de LHCI ("optimistic"): la mejor de las 3 corridas. Los tiempos
 * (LCP, TBT, puntaje de rendimiento) varían entre corridas iguales (LCP de la home: 1.9–2.7 s) y la
 * mediana fallaría al azar; los tamaños (JS, CSS, peticiones) no varían. El reporte del PR muestra
 * la corrida mediana.
 *
 * Cada ticket que publica una página agrega aquí su URL; los presupuestos de "el resto" ya aplican.
 * La ficha de producto (docs/12 §2: 155 KB de JS) necesitará su propia entrada en assertMatrix.
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
      url: [`${base}/`],
      numberOfRuns: 3,
      settings: {
        // Los runners de Linux de GitHub no permiten el sandbox de Chrome.
        ...(process.env.CI ? { chromeFlags: "--no-sandbox" } : {}),
      },
    },
    assert: {
      assertMatrix: [
        {
          // Home: ≥ 90 en rendimiento por el video y JS ≤ 165 KB. LCP: 3.2 s TEMPORAL (BD-050 midió
          // 3.06 s en la CI con el póster del hero como LCP; en un navegador real, 0.36 s). El
          // objetivo de 2.0 s es criterio de BD-055 con el hero nuevo (BD-056). Lighthouse móvil
          // no pide video: sin video vertical, el hero de móvil se queda con el póster.
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
          // El resto: ≥ 95 en rendimiento, LCP ≤ 2.0 s, JS ≤ 150 KB (CLAUDE.md).
          matchingUrlPattern: "^https?://[^/]+/.+",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.95 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 2000 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 150 * KB }],
          },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
