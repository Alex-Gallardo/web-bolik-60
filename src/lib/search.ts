import Fuse, { type IFuseOptions } from "fuse.js";

/**
 * Motor del buscador (BD-066, docs/06 §3.6), el mismo en el servidor (/buscar sin JS) y en el
 * navegador (buscador instantáneo): sin tildes ni mayúsculas, con sinónimos, coincidencia exacta
 * de SKU o código de barras y búsqueda aproximada (Fuse.js) en nombre, marca, categoría y colores.
 */

/** Lo que el buscador necesita de cada producto (lo arma server/data/search.ts). */
export type SearchEntry = {
  slug: string;
  name: string;
  href: string;
  category: string;
  shortDescription: string;
  colors: string[];
  skus: string[];
  barcodes: string[];
  brand: string;
  variants: { sku: string; barcode: string | null; color: string; colorKey: string }[];
};

export const MIN_QUERY_LENGTH = 2;
export { MAX_QUERY_LENGTH, clampQuery } from "./search-query";
export const MAX_RESULTS = 20;

/** "Crayón  JUMBO" → "crayon jumbo". */
export function normalize(text: string): string {
  // NFD separa la tilde de la letra; U+0300–U+036F son esas marcas.
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** "pt-00058 " → "PT00058" (como se guardan los códigos). */
export const normalizeCode = (text: string) => text.replace(/[\s-]/g, "").toUpperCase();

/**
 * ¿Es un código? SKU de SAP (dos letras y 4 a 6 dígitos: «PT00058») o código de barras (EAN-8,
 * UPC-A, EAN-13 o GTIN-14). Un número como «1966» se busca como texto.
 */
export const looksLikeCode = (text: string) => {
  const code = normalizeCode(text);
  return /^[A-Z]{2}\d{4,6}$/.test(code) || /^(\d{8}|\d{12,14})$/.test(code);
};

/** La consulta y sus variantes con sinónimos: «lapicero azul» → también «boligrafo azul». */
export function expandQuery(query: string, synonyms: readonly (readonly string[])[]): string[] {
  const words = normalize(query).split(" ");
  const variants = new Set([words.join(" ")]);
  for (const group of synonyms)
    for (const word of words)
      if (group.includes(word))
        for (const other of group)
          if (other !== word) variants.add(words.map((w) => (w === word ? other : w)).join(" "));
  return [...variants];
}

export type SearchResult =
  | { status: "short"; results: [] }
  | {
      status: "ok" | "empty";
      results: SearchEntry[];
      /** Coincidencia exacta de código: «¿Buscas el Bolik Ultra Azul (PT00058)?». */
      exact?: { entry: SearchEntry; sku: string; color: string; colorKey: string };
    };

const OPTIONS: IFuseOptions<SearchEntry> = {
  keys: [
    { name: "name", weight: 3 },
    { name: "brand", weight: 2 },
    { name: "category", weight: 1.5 },
    { name: "colors", weight: 1 },
    { name: "skus", weight: 2 },
    { name: "barcodes", weight: 2 },
    { name: "shortDescription", weight: 0.5 },
  ],
  threshold: 0.34,
  ignoreLocation: true,
  ignoreDiacritics: true,
  includeScore: true,
  minMatchCharLength: MIN_QUERY_LENGTH,
};

/** Prepara el buscador para un índice (una vez) y devuelve la función que busca. */
export function createSearcher(
  entries: SearchEntry[],
  synonyms: readonly (readonly string[])[] = [],
): (query: string) => SearchResult {
  const fuse = new Fuse(entries, OPTIONS);
  return (query) => {
    const q = normalize(query);
    if (q.length < MIN_QUERY_LENGTH) return { status: "short", results: [] };

    const code = normalizeCode(query);
    let exact: { entry: SearchEntry; sku: string; color: string; colorKey: string } | undefined;
    for (const entry of entries) {
      const variant = entry.variants.find((v) => v.sku === code || v.barcode === code);
      if (variant) {
        exact = { entry, sku: variant.sku, color: variant.color, colorKey: variant.colorKey };
        break;
      }
    }
    // Un código no se busca aproximado: «PT00058» no debe traer el PT00059 de otro producto.
    if (looksLikeCode(query))
      return exact
        ? { status: "ok", results: [exact.entry], exact }
        : { status: "empty", results: [] };

    // La mejor puntuación de cada producto entre la consulta y sus sinónimos.
    const best = new Map<string, { entry: SearchEntry; score: number }>();
    for (const variant of expandQuery(query, synonyms))
      for (const hit of fuse.search(variant)) {
        const score = hit.score ?? 1;
        const seen = best.get(hit.item.slug);
        if (!seen || score < seen.score) best.set(hit.item.slug, { entry: hit.item, score });
      }
    const results = [...best.values()]
      .sort((a, b) => a.score - b.score)
      .map((r) => r.entry)
      .slice(0, MAX_RESULTS);
    if (exact && !results.includes(exact.entry)) results.unshift(exact.entry);
    return results.length > 0 ? { status: "ok", results, exact } : { status: "empty", results };
  };
}
