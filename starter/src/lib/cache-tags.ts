/**
 * Nombres de tags de caché. Única fuente: nunca escribas un tag como texto suelto.
 * Lectura:      cacheTag(TAGS.products, TAGS.product(slug))      (en funciones 'use cache')
 * Admin:        updateTag(TAGS.product(slug))                     (Server Actions: lectura inmediata de lo escrito)
 * Scripts/API:  revalidateTag(TAGS.products, "max")               (sync de SAP, route handlers)
 */
export const TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  stores: "stores",
  department: (slug: string) => `department:${slug}`,
  kits: "kits",
  faqs: "faqs",
  content: "content", // hero, cifras, historia, actividades
  appearance: "appearance", // SectionAppearance
  settings: "settings", // SiteSetting
  redirects: "redirects",
  sitemap: "sitemap",
  llms: "llms",
  searchIndex: "search-index",
} as const;

/** Qué invalidar cuando cambia un producto (ficha, su categoría, listados, buscador, sitemap e IA). */
export function productTags(slug: string, categorySlug: string) {
  return [TAGS.product(slug), TAGS.category(categorySlug), TAGS.products, TAGS.searchIndex, TAGS.sitemap, TAGS.llms];
}

/** Rutas afectadas por un producto (para IndexNow). */
export function productPaths(slug: string, categorySlug: string) {
  return [`/productos/${categorySlug}/${slug}`, `/productos/${categorySlug}`, "/productos"];
}
