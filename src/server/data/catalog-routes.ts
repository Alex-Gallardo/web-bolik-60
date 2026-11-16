import "server-only";
import { env } from "@/env";
import seedCategories from "../../../prisma/seed/categories.json";
import seedProducts from "../../../prisma/seed/products.json";
import type { CatalogRoutes } from "../seo/catalog-routes";
import { proxyDb } from "./proxy-db";

/**
 * Slugs de las categorías y fichas publicadas, para la lista en memoria de proxy.ts (BD-061,
 * BD-062). Una ficha se ve si está publicada, con algún color publicado y en una categoría
 * publicada; va como «categoria/producto». Como listActiveRedirects: no pasa por dataSource() (el proxy no necesita
 * ni debe cargar la capa de lectura de la app) y con la base usa el cliente propio del proxy. Con
 * fixtures lee solo categories.json y products.json (sin validar todo el seed).
 */
export async function listPublishedCatalogRoutes(): Promise<CatalogRoutes> {
  if (env.DATA_SOURCE !== "db") {
    const categories = (seedCategories as { slug: string; published?: boolean }[])
      .filter((c) => c.published !== false)
      .map((c) => c.slug);
    const visible = new Set(categories);
    type SeedProduct = {
      slug: string;
      categorySlug: string;
      published?: boolean;
      variants: { published?: boolean }[];
    };
    const products = (seedProducts as SeedProduct[])
      // En el esquema, un producto sin «published» no está publicado; una variante, sí.
      .filter(
        (p) =>
          p.published === true &&
          visible.has(p.categorySlug) &&
          p.variants.some((v) => v.published !== false),
      )
      .map((p) => `${p.categorySlug}/${p.slug}`);
    return { categories, products };
  }
  const [categories, products] = await Promise.all([
    proxyDb().category.findMany({ where: { published: true }, select: { slug: true } }),
    proxyDb().product.findMany({
      where: {
        published: true,
        category: { published: true },
        variants: { some: { published: true } },
      },
      select: { slug: true, category: { select: { slug: true } } },
    }),
  ]);
  return {
    categories: categories.map((row) => row.slug),
    products: products.map((row) => `${row.category.slug}/${row.slug}`),
  };
}
