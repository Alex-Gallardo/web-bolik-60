// pnpm erp:articles <archivo.json> [--marca BOLIK --marca FABIK …] (BD-038): baja los artículos
// de SMART-K66 (GET /api/web/articulos, doc 05 §8) a un archivo JSON fuera del repo, para emparejar
// el catálogo por código de barras con su código SAP. Lee ERP_BASE_URL y ERP_API_KEY de los .env
// (igual que `next dev`); nunca las imprime. El archivo no se sube: el repo es público.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import nextEnv from "@next/env";
import { BRAND_ERP_NAMES } from "../src/lib/constants";
import { createSmartK66Gateway } from "../src/server/erp/smartk66";
import type { ErpArticle } from "../src/server/erp/types";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
  info: () => {},
  error: console.error,
});

/** Todas las marcas del grupo, como las nombra SAP (lib/constants.ts). */
const DEFAULT_BRANDS = Object.values(BRAND_ERP_NAMES);

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { marca: { type: "string", multiple: true } },
});
const out = positionals[0];
if (!out) fail("Uso: pnpm erp:articles <archivo.json> [--marca BOLIK …]");
// pnpm corre el script desde la raíz del repo: una ruta relativa es relativa a donde se llamó.
const target = path.resolve(process.env.INIT_CWD ?? process.cwd(), out);
const relative = path.relative(process.cwd(), target);
const outside =
  path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`);
if (!outside) fail("El archivo debe quedar fuera del repositorio (es público).");

const baseUrl = process.env.ERP_BASE_URL;
const apiKey = process.env.ERP_API_KEY;
if (!baseUrl || !apiKey) fail("Faltan ERP_BASE_URL o ERP_API_KEY en el entorno (.env.local).");

const gateway = createSmartK66Gateway({ baseUrl, apiKey });
const brands = values.marca?.length ? values.marca : DEFAULT_BRANDS;
const byBrand: Record<string, ErpArticle[]> = {};
for (const brand of brands) {
  const result = await gateway.listArticles(undefined, brand);
  if (result.status !== "ok") {
    fail(
      result.status === "failed"
        ? `${brand}: ${result.failure.kind} (${result.failure.message})`
        : `${brand}: el ERP no respondió`,
    );
  }
  byBrand[brand] = result.articles;
  console.log(`${brand}: ${result.articles.length} artículos`);
}
await writeFile(target, `${JSON.stringify(byBrand, null, 2)}\n`);
console.log(`✔ ${target}`);
