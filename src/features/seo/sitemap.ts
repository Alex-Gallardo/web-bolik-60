import type { MetadataRoute } from "next";
import type { SitemapEntriesView, UpdatedAt } from "@/server/data/types";

/** De qué datos sale la fecha de una página fija: su contenido, el catálogo o ambos. */
type PageSource = "content" | "catalog";

type StaticPage = { path: string; changesWith: readonly PageSource[] };

/**
 * Páginas fijas e indexables del sitemap (BD-092, docs/10 §5). Solo las que ya existen: una ruta
 * que todavía responde 404 (las del footer que llegan en S3) no entra, porque Google la reportaría
 * como error. Cada ticket que crea una página pública la agrega aquí (nota en doc 14). Las
 * utilidades con noindex (/buscar, /cotizacion, /styleguide) y /admin nunca van.
 */
export const STATIC_PAGES: readonly StaticPage[] = [
  // La home muestra categorías y el producto estrella: cambia con el contenido y con el catálogo.
  { path: "/", changesWith: ["content", "catalog"] },
  { path: "/productos", changesWith: ["catalog"] },
];

/** La fecha más reciente; null si ninguna tiene fecha (la fuente de ejemplo no las tiene). */
function latest(dates: UpdatedAt[]): UpdatedAt {
  let max: number | null = null;
  for (const date of dates) {
    if (!date) continue;
    const time = Date.parse(date);
    if (!Number.isNaN(time) && (max === null || time > max)) max = time;
  }
  return max === null ? null : new Date(max).toISOString();
}

/**
 * Arma /sitemap.xml: URLs absolutas sin barra final y `lastModified` solo con fecha real (sin
 * fecha se omite: el sitemap no inventa «ahora»). Las imágenes de producto las agrega BD-097.
 */
export function buildSitemap(entries: SitemapEntriesView, siteUrl: string): MetadataRoute.Sitemap {
  const absolute = (path: string) => new URL(path, siteUrl).toString();
  const catalogUpdatedAt = latest([
    ...entries.categories.map((c) => c.updatedAt),
    ...entries.products.map((p) => p.updatedAt),
  ]);
  const sourceDate: Record<PageSource, UpdatedAt> = {
    content: entries.contentUpdatedAt,
    catalog: catalogUpdatedAt,
  };
  const entry = (path: string, updatedAt: UpdatedAt): MetadataRoute.Sitemap[number] =>
    updatedAt ? { url: absolute(path), lastModified: updatedAt } : { url: absolute(path) };

  return [
    ...STATIC_PAGES.map((page) =>
      entry(page.path, latest(page.changesWith.map((source) => sourceDate[source]))),
    ),
    ...entries.categories.map((c) => entry(`/productos/${c.slug}`, c.updatedAt)),
    ...entries.products.map((p) => entry(`/productos/${p.categorySlug}/${p.slug}`, p.updatedAt)),
  ];
}
