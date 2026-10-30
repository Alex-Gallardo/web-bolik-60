// Higiene de tokens (docs/02, docs/08 y CLAUDE.md). Falla si fuera de src/styles/tokens.css aparece:
//   1) un color literal: hex (#1d3fce o %231d3fce en un data URI) o rgb()/rgba()/hsl() con números, o
//   2) en cualquier archivo, una variable CSS que se refiere a sí misma (`--x: var(--x)`).
// Excepción documentada: `check-colors-ignore` en la misma línea o en la anterior.
// Uso: pnpm check:colors (también corre dentro de pnpm lint).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const ALLOWED = new Set([join("src", "styles", "tokens.css")]);
const LITERAL = /(?:#|%23)[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*\d/g;
// Sobre el texto completo: una declaración partida en varias líneas también se detecta.
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
  const lineAt = (index) => text.slice(0, index).split("\n").length;
  for (const m of text.matchAll(SELF_REF))
    problems.push(`${path}:${lineAt(m.index)}  ${m[1]} se refiere a sí misma`);

  if (ALLOWED.has(path)) return;
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("check-colors-ignore") || lines[i - 1]?.includes("check-colors-ignore"))
      return;
    for (const m of line.matchAll(LITERAL))
      problems.push(`${path}:${i + 1}  ${m[0]}… fuera de tokens.css`);
  });
}

walk(ROOT);
if (problems.length) {
  console.error(`check-colors: ${problems.length} problema(s):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("check-colors: OK");
