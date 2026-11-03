// pnpm db:migrate [--name x …]: `prisma migrate dev` con los argumentos recibidos y después
// `prisma generate` (Prisma 7 ya no regenera el cliente al migrar). Con "a && b" en package.json,
// pnpm pegaría los argumentos al segundo comando.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
const run = (...args) => execFileSync(process.execPath, [prismaCli, ...args], { stdio: "inherit" });

try {
  run("migrate", "dev", ...process.argv.slice(2));
  run("generate");
} catch {
  process.exit(1); // Prisma ya mostró el error
}
