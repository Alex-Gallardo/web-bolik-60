import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta (docs/13 §2) contra el build de producción, nunca contra `next dev`.
 * Local: `pnpm build` y después `pnpm test:e2e`; el servidor standalone se levanta en el 3100 para
 * no reutilizar por error un `pnpm dev` en el 3000. Con E2E_BASE_URL (la CI, que prueba el artefacto)
 * no se levanta servidor: las pruebas van contra esa dirección.
 */
const PORT = 3100;
const externalUrl = process.env.E2E_BASE_URL;
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "visual/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: externalUrl ?? `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "movil", use: { ...devices["Pixel 7"] } }, // primero: el sitio es mobile first
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone", use: { ...devices["iPhone 14"] }, grep: /@critico/ },
  ],
  webServer: externalUrl
    ? undefined
    : {
        command: "pnpm start:local",
        url: `http://127.0.0.1:${PORT}`,
        // Solo en la máquina local (nunca expuesto a la red) y sin ERP ni correo reales, aunque
        // .env.local diga otra cosa (docs/13 §2). Se levanta siempre uno nuevo: nunca se prueba un
        // servidor viejo ni otro proceso que ocupe el 3100.
        env: { PORT: String(PORT), HOSTNAME: "127.0.0.1", ERP_MODE: "noop", SMTP_MODE: "file" },
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
