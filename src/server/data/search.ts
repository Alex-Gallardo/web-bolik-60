import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { BRAND_LABELS } from "@/lib/constants";
import { dataSource } from "./source";
import type { SearchEntryView } from "./types";

/**
 * Índice del buscador (BD-066, /api/search-index): un producto visible por entrada, con lo que el
 * visitante puede escribir (nombre, categoría, marca, colores, SKU y códigos de barras) y cada
 * color con sus códigos para la coincidencia exacta.
 */
export async function getSearchIndex(): Promise<SearchEntryView[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.searchIndex, TAGS.products, TAGS.categories);
  const source = await dataSource();
  const [products, matches] = await Promise.all([
    source.listProducts(),
    source.listVariantMatches(),
  ]);
  const barcodes = new Map<string, string[]>();
  const variants = new Map<string, SearchEntryView["variants"]>();
  for (const { product, variant } of matches) {
    variants.set(product.slug, [
      ...(variants.get(product.slug) ?? []),
      {
        sku: variant.sku,
        barcode: variant.barcode,
        color: variant.color.name,
        colorKey: variant.color.key,
      },
    ]);
    if (!variant.barcode) continue;
    barcodes.set(product.slug, [...(barcodes.get(product.slug) ?? []), variant.barcode]);
  }
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    href: p.href,
    category: p.category.name,
    lineGroup: p.category.lineGroup,
    shortDescription: p.shortDescription,
    colors: p.colors.map((c) => c.name),
    skus: p.skus,
    barcodes: barcodes.get(p.slug) ?? [],
    sample: p.sample,
    brand: BRAND_LABELS[p.brand],
    variants: variants.get(p.slug) ?? [],
  }));
}
