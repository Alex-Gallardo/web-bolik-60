// Falla si aparece un color hex fuera de src/styles/tokens.css (regla: solo tokens, docs/02 y CLAUDE.md).
// Uso: node scripts/check-colors.mjs   (en CI, después de lint)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const ALLOWED = new Set([join("src", "styles", "tokens.css")]);
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const EXT = /\.(tsx?|css|mjs)$/;
const problems = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "generated" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.test(name) && !ALLOWED.has(p)) {
      readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        if (line.includes("check-colors-ignore")) return; // p. ej. colores de marcas de terceros (WhatsApp) documentados
        for (const m of line.matchAll(HEX)) problems.push(`${p}:${i + 1}  ${m[0]}`);
      });
    }
  }
}
walk(ROOT);
if (problems.length) {
  console.error(`Colores fuera de tokens.css (${problems.length}):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("check-colors: OK");
