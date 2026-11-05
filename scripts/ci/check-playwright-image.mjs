// La imagen de Playwright del job E2E (.github/workflows/ci.yml) debe tener la misma versión que
// @playwright/test en package.json: si no, la imagen no trae los navegadores que la librería
// busca y las pruebas fallan con «Executable doesn't exist». Corre al inicio del job E2E.
// Uso: node scripts/ci/check-playwright-image.mjs
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

const image = /mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)/.exec(workflow)?.[1];
const library = (
  pkg.devDependencies?.["@playwright/test"] ?? pkg.dependencies?.["@playwright/test"]
)?.replace(/^[\^~]/, "");

if (!image || !library) {
  console.error("No se encontró la versión de la imagen de Playwright o de @playwright/test.");
  process.exit(1);
}
if (image !== library) {
  console.error(
    `La imagen de Playwright es v${image} y @playwright/test es ${library}. ` +
      "Actualiza el tag y el digest de la imagen en .github/workflows/ci.yml (job E2E).",
  );
  process.exit(1);
}
console.log(`Imagen de Playwright y @playwright/test en ${library}.`);
