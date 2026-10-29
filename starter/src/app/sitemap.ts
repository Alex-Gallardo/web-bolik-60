import type { MetadataRoute } from "next";
import { SITE } from "@/features/seo/metadata";
import { listSitemapEntries } from "@/server/data/sitemap"; // consulta cacheada con tags products, stores, content

/**
 * Sitemap único (< 50 000 URLs). lastModified real desde la BD (updatedAt), nunca "ahora".
 * Las fichas incluyen sus imágenes principales para Google Imágenes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const abs = (p: string) => new URL(p, SITE.url).toString();
  const { categories, products, departments, contentUpdatedAt } = await listSitemapEntries();

  const staticPages = [
    "/", "/productos", "/donde-comprar", "/escuelas", "/mayoreo", "/empresas",
    "/kits-escolares", "/nuestra-historia", "/preguntas-frecuentes", "/contacto",
    "/legal/privacidad", "/legal/terminos",
  ].map((path) => ({ url: abs(path), lastModified: contentUpdatedAt }));

  return [
    ...staticPages,
    ...categories.map((c) => ({ url: abs(`/productos/${c.slug}`), lastModified: c.updatedAt })),
    ...products.map((p) => ({
      url: abs(`/productos/${p.categorySlug}/${p.slug}`),
      lastModified: p.updatedAt,
      images: p.images.map(abs),
    })),
    ...departments.map((d) => ({ url: abs(`/donde-comprar/${d.slug}`), lastModified: d.updatedAt })),
  ];
}
