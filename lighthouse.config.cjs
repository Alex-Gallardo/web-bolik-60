/**
 * Lighthouse CI (BD-015, docs/12 y docs/13 §7): preset móvil, 3 corridas por URL, contra el build de
 * producción. Local: `pnpm build` y después `pnpm lhci` (levanta `start:local` en 127.0.0.1:3100).
 * Con LHCI_BASE_URL (la CI, que prueba el artefacto) no se levanta servidor.
 *
 * Cada ticket que publica una página agrega aquí su URL; los presupuestos de "el resto" ya aplican.
 * La ficha de producto (docs/12 §2: 110 KB de JS) necesitará su propia entrada en assertMatrix.
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
        : { startServerCommand: "pnpm start:local", startServerReadyPattern: "Ready" }),
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
          // Home: ≥ 90 en rendimiento por el video, JS ≤ 120 KB.
          matchingUrlPattern: "^https?://[^/]+/$",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.9 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
            "total-blocking-time": ["error", { maxNumericValue: 200 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 120 * KB }],
          },
        },
        {
          // El resto: ≥ 95 en rendimiento, LCP ≤ 2.0 s, JS ≤ 100 KB (CLAUDE.md).
          matchingUrlPattern: "^https?://[^/]+/.+",
          assertions: {
            ...common,
            "categories:performance": ["error", { minScore: 0.95 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 2000 }],
            "total-blocking-time": ["error", { maxNumericValue: 150 }],
            "resource-summary:script:size": ["error", { maxNumericValue: 100 * KB }],
          },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
