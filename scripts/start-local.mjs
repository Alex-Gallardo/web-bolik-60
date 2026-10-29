// Prueba local del build standalone tal como corre en el servidor (docs/15 §5):
// copia public/ y .next/static dentro de .next/standalone y arranca server.js.
// Requiere `pnpm build` antes. Puerto: PORT (por defecto 3000).
import { cpSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const standalone = `${root}.next/standalone`;

if (!existsSync(`${standalone}/server.js`)) {
  console.error("No existe .next/standalone/server.js. Corre `pnpm build` primero.");
  process.exit(1);
}

cpSync(`${root}public`, `${standalone}/public`, { recursive: true });
cpSync(`${root}.next/static`, `${standalone}/.next/static`, { recursive: true });

// En el mismo proceso (sin hijo): al cerrarlo no queda ningún node.exe bloqueando .next/standalone.
process.chdir(standalone);
createRequire(import.meta.url)(`${standalone}/server.js`);
