import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";
import { assertTestDatabaseUrl } from "./scripts/lib/test-db.mjs";

// @next/env omite .env.local cuando NODE_ENV=test: se carga en modo desarrollo solo para leerlo.
// (Los tipos de Next declaran NODE_ENV de solo lectura: se usa una vista sin esa restricción.)
const runtimeEnv = process.env as Record<string, string | undefined>;
const nodeEnv = runtimeEnv.NODE_ENV;
runtimeEnv.NODE_ENV = "development";
nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });
if (nodeEnv === undefined) delete runtimeEnv.NODE_ENV;
else runtimeEnv.NODE_ENV = nodeEnv;

// La suite escribe y limpia datos: solo corre contra una base que termine en _Test y que no sea
// ni la de desarrollo ni la shadow. Después, la app (src/env.ts, src/server/db.ts) apunta ahí.
const testUrl = runtimeEnv.TEST_DATABASE_URL;
assertTestDatabaseUrl(testUrl, [runtimeEnv.DATABASE_URL, runtimeEnv.SHADOW_DATABASE_URL]);
runtimeEnv.DATABASE_URL = testUrl;
runtimeEnv.MIGRATE_DATABASE_URL = testUrl;

/**
 * Pruebas de integración (docs/13 §4): server actions y consultas contra BolikDigital_Test.
 * Antes de la suite se aplican las migraciones pendientes (`migrate deploy`, nunca borra) en
 * tests/integration/global-setup.ts; cada prueba limpia lo que crea. Una suite a la vez.
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
