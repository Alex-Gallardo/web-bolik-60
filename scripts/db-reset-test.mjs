// Deja la base de PRUEBAS en cero: borra todas las tablas y datos y aplica las migraciones de nuevo.
// Uso manual: pnpm db:reset:test. Solo actúa sobre TEST_DATABASE_URL y se niega si la base no
// termina en "_Test", para que nunca apunte por error a desarrollo o producción.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import nextEnv from "@next/env";

// @next/env omite .env.local cuando NODE_ENV=test.
if (process.env.NODE_ENV === "test") delete process.env.NODE_ENV;
nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const url = process.env.TEST_DATABASE_URL;
const database = url?.match(/;\s*database=([^;]+)/i)?.[1];
if (!url || !database) {
  console.error(
    "Falta TEST_DATABASE_URL (o su database=) en .env.local; la escribe scripts/dev/sqlserver-local.ps1.",
  );
  process.exit(1);
}
if (!/_test$/i.test(database)) {
  console.error(`Se cancela: la base "${database}" no termina en "_Test".`);
  process.exit(1);
}

console.log(`Borrando y recreando ${database}...`);
const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
execFileSync(process.execPath, [prismaCli, "migrate", "reset", "--force"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url, MIGRATE_DATABASE_URL: url },
});
