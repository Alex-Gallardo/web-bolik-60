// Deja la base de PRUEBAS en cero: borra todas las tablas y datos y aplica las migraciones de nuevo.
// Uso manual: pnpm db:reset:test. Solo actúa sobre TEST_DATABASE_URL y se niega si no es
// inequívocamente una base de pruebas (scripts/lib/test-db.mjs).
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import nextEnv from "@next/env";
import { assertTestDatabaseUrl } from "./lib/test-db.mjs";

// @next/env omite .env.local cuando NODE_ENV=test.
if (process.env.NODE_ENV === "test") delete process.env.NODE_ENV;
nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const url = process.env.TEST_DATABASE_URL;
let database;
try {
  database = assertTestDatabaseUrl(url, [
    process.env.DATABASE_URL,
    process.env.SHADOW_DATABASE_URL,
  ]);
} catch (error) {
  console.error(`Se cancela: ${error.message}`);
  process.exit(1);
}

console.log(`Borrando y recreando ${database}...`);
const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
execFileSync(process.execPath, [prismaCli, "migrate", "reset", "--force"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url, MIGRATE_DATABASE_URL: url },
});
