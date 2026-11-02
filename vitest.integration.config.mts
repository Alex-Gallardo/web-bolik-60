import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

// @next/env omite .env.local cuando NODE_ENV=test: se carga en modo desarrollo solo para leerlo.
// (Los tipos de Next declaran NODE_ENV de solo lectura: se usa una vista sin esa restricción.)
const runtimeEnv = process.env as Record<string, string | undefined>;
const nodeEnv = runtimeEnv.NODE_ENV;
runtimeEnv.NODE_ENV = "development";
nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
if (nodeEnv === undefined) delete runtimeEnv.NODE_ENV;
else runtimeEnv.NODE_ENV = nodeEnv;

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Falta TEST_DATABASE_URL: corre scripts/dev/sqlserver-local.ps1 (local) o defínela en la CI.",
  );
}
// La app (src/env.ts, src/server/db.ts) apunta a la base de pruebas, nunca a la de desarrollo.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.MIGRATE_DATABASE_URL = process.env.TEST_DATABASE_URL;

/**
 * Pruebas de integración (docs/13 §4): server actions y consultas contra BolikDigital_Test, que se
 * recrea con `prisma migrate reset` antes de la suite (tests/integration/global-setup.ts).
 * Una suite a la vez para no pisar datos.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true, // alias @/ de tsconfig.json (nativo en Vite)
    alias: {
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
