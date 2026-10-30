// Higiene de tokens (docs/02, docs/08 y CLAUDE.md). Falla si:
//   1) aparece un color hex fuera de src/styles/tokens.css, o
//   2) una variable CSS se refiere a sí misma (`--x: var(--x)`), que la deja sin valor.
// Uso: pnpm check:colors   (en CI, después de lint)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const ALLOWED = new Set([join("src", "styles", "tokens.css")]);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const SELF_REF = /(--[\w-]+)\s*:[^;{}]*var\(\s*\1\s*[,)]/g;
const EXT = /\.(tsx?|css|mjs)$/;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "generated" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.test(name)) check(p, readFileSync(p, "utf8"));
  }
}

function check(path, text) {
  text.split("\n").forEach((line, i) => {
    const at = `${path}:${i + 1}`;
    for (const m of line.matchAll(SELF_REF)) problems.push(`${at}  ${m[1]} se refiere a sí misma`);
    // p. ej. colores de marcas de terceros documentados: marcar la línea con check-colors-ignore
    if (ALLOWED.has(path) || line.includes("check-colors-ignore")) return;
    for (const m of line.matchAll(HEX)) problems.push(`${at}  ${m[0]} fuera de tokens.css`);
  });
}

walk(ROOT);
if (problems.length) {
  console.error(`check-colors: ${problems.length} problema(s):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("check-colors: OK");
