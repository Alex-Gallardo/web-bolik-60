import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { safeSlug } from "@/lib/slug";
import { dataSource } from "./source";
import type { ProductFilter } from "./types";
import { isSearchableCode, matchVariantCode, normalizeCode } from "./variant-code";

/**
 * Catálogo: categorías, usos, productos y búsqueda por código (docs/03 §7, BD-037). Todo lo que
 * muestra datos de una categoría (nombre, si está publicada) también lleva TAGS.categories.
 */

export async function listCategories() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.categories, TAGS.products);
  return (await dataSource()).listCategories();
}

/** Los slugs llegan de la URL: uno inválido da null sin crear una entrada de caché. */
export async function getCategory(slug: string) {
  const valid = safeSlug(slug);
  return valid ? cachedGetCategory(valid) : null;
}

async function cachedGetCategory(slug: string) {
  "use cache";
  cacheLife("max");
  // productCount depende de los productos.
  cacheTag(TAGS.category(slug), TAGS.categories, TAGS.products);
  return (await dataSource()).getCategory(slug);
}

export async function listUseTags() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.products);
  return (await dataSource()).listUseTags();
}

/** Filtros normalizados antes de la caché: un slug inválido da lista vacía, no otra entrada. */
export async function listProducts(filter: ProductFilter = {}) {
  const categorySlug = safeSlug(filter.categorySlug);
  const useSlug = safeSlug(filter.useSlug);
  if ((filter.categorySlug && !categorySlug) || (filter.useSlug && !useSlug)) return [];
  return cachedListProducts(categorySlug ?? "", useSlug ?? "");
}

async function cachedListProducts(categorySlug: string, useSlug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.products, TAGS.categories);
  if (categorySlug) cacheTag(TAGS.category(categorySlug));
  return (await dataSource()).listProducts({
    categorySlug: categorySlug || undefined,
    useSlug: useSlug || undefined,
  });
}

export async function getProduct(categorySlug: string, slug: string) {
  const category = safeSlug(categorySlug);
  const product = safeSlug(slug);
  return category && product ? cachedGetProduct(category, product) : null;
}

/** La ficha incluye tarjetas de relacionados: cualquier cambio de producto la refresca. */
async function cachedGetProduct(categorySlug: string, slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.product(slug), TAGS.category(categorySlug), TAGS.products, TAGS.categories);
  return (await dataSource()).getProduct(categorySlug, slug);
}

export async function getFeaturedProduct() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.products, TAGS.categories);
  return (await dataSource()).getFeaturedProduct();
}

/** Índice de variantes visibles: una sola entrada de caché para todas las búsquedas por código. */
async function variantIndex() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.products, TAGS.categories);
  return (await dataSource()).listVariantMatches();
}

/** Por SKU (PT00058) o código de barras: acceso por QR y buscador. */
export async function findVariantByCode(code: string) {
  if (!isSearchableCode(normalizeCode(code))) return null;
  return matchVariantCode(await variantIndex(), code);
}
