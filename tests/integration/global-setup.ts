import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

/**
 * Antes de la suite: aplica las migraciones pendientes a BolikDigital_Test (`migrate deploy`, nunca
 * borra datos). Cada prueba limpia lo que crea. Para dejar la base en cero: `pnpm db:reset:test`
 * (lo corre una persona, no la suite). vitest.integration.config.mts ya apuntó DATABASE_URL a
 * TEST_DATABASE_URL.
 */
export default function setup() {
  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    stdio: ["ignore", "ignore", "inherit"],
  });
}
