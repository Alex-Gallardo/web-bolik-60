import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { dataSource } from "./source";

export const SITEMAP_TAGS = [
  TAGS.sitemap,
  TAGS.products,
  TAGS.categories,
  TAGS.stores,
  TAGS.faqs,
  TAGS.settings,
  TAGS.appearance,
];

/**
 * Entradas del sitemap (BD-092): solo lo publicado, con la fecha real de la base (con la fuente
 * de ejemplo no hay fechas y el sitemap las omite). Lleva los tags de todo lo que cambia su
 * resultado: productos, categorías, tiendas y lo que da la fecha de las páginas de contenido
 * (ajustes, apariencia y FAQs; hero, cifras e hitos no tienen updatedAt).
 */
export async function listSitemapEntries() {
  "use cache";
  cacheLife("max");
  cacheTag(...SITEMAP_TAGS);
  return (await dataSource()).listSitemapEntries();
}
