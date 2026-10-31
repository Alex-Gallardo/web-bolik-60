import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/** Pruebas unitarias (docs/13 §2): funciones puras y componentes, sin BD ni red. */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // alias @/ de tsconfig.json (nativo en Vite)
    // "server-only" lanza fuera del runtime de React Server: en pruebas se reemplaza por un módulo vacío.
    alias: {
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}"],
      thresholds: { lines: 80 },
    },
  },
});
