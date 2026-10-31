import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Pruebas de integración (docs/13 §4): server actions y consultas contra una BD de prueba que se
 * recrea antes de la suite (llega con BD-010). Una suite a la vez para no pisar datos.
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
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
