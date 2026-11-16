import "server-only";
import { env } from "@/env";
import seedCategories from "../../../prisma/seed/categories.json";
import seedProducts from "../../../prisma/seed/products.json";
import type { CatalogRoutes, CodeTarget } from "../seo/catalog-routes";
import { proxyDb } from "./proxy-db";

type SeedProduct = {
  slug: string;
  categorySlug: string;
  published?: boolean;
  variants: { sku: string; barcode: string | null; colorKey: string; published?: boolean }[];
};

type CodeVariant = { path: string; sku: string; barcode: string | null; colorKey: string };

/**
 * Los códigos del QR (BD-065): primero todos los SKU y después los códigos de barras, en el orden de
 * las fichas y sus variantes. Gana el primero: un SKU nunca queda tapado por un código de barras
 * repetido.
 */
function codesOf(variants: CodeVariant[]): [string, CodeTarget][] {
  const target = (v: CodeVariant) => ({ path: v.path, color: v.colorKey });
  return [
    ...variants.map((v): [string, CodeTarget] => [v.sku, target(v)]),
    ...variants.flatMap((v): [string, CodeTarget][] => (v.barcode ? [[v.barcode, target(v)]] : [])),
  ];
}

/**
 * Slugs de las categorías y fichas publicadas y los códigos de sus variantes, para la lista en
 * memoria de proxy.ts (BD-061, BD-062, BD-065). Una ficha se ve si está publicada, con algún color
 * publicado y en una categoría publicada; va como «categoria/producto». Los códigos son los SKU y
 * los códigos de barras de las variantes publicadas de esas fichas, en su orden. Como
 * listActiveRedirects: no pasa por dataSource() (el proxy no necesita ni debe cargar la capa de
 * lectura de la app) y con la base usa el cliente propio del proxy. Con fixtures lee solo
 * categories.json y products.json (sin validar todo el seed).
 */
export async function listPublishedCatalogRoutes(): Promise<CatalogRoutes> {
  if (env.DATA_SOURCE !== "db") {
    const categories = (seedCategories as { slug: string; published?: boolean }[])
      .filter((c) => c.published !== false)
      .map((c) => c.slug);
    const visible = new Set(categories);
    // En el esquema, un producto sin «published» no está publicado; una variante, sí.
    const published = (seedProducts as SeedProduct[]).filter(
      (p) =>
        p.published === true &&
        visible.has(p.categorySlug) &&
        p.variants.some((v) => v.published !== false),
    );
    return {
      categories,
      products: published.map((p) => `${p.categorySlug}/${p.slug}`),
      // En el orden del JSON (la base usa sortOrder, que el seed toma del mismo orden).
      codes: codesOf(
        published.flatMap((p) =>
          p.variants
            .filter((v) => v.published !== false)
            .map((v) => ({ ...v, path: `/productos/${p.categorySlug}/${p.slug}` })),
        ),
      ),
    };
  }
  const [categories, products] = await Promise.all([
    proxyDb().category.findMany({ where: { published: true }, select: { slug: true } }),
    proxyDb().product.findMany({
      where: {
        published: true,
        category: { published: true },
        variants: { some: { published: true } },
      },
      select: {
        slug: true,
        category: { select: { slug: true } },
        variants: {
          where: { published: true },
          select: { sku: true, barcode: true, colorKey: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);
  return {
    categories: categories.map((row) => row.slug),
    products: products.map((row) => `${row.category.slug}/${row.slug}`),
    codes: codesOf(
      products.flatMap((row) =>
        row.variants.map((v) => ({ ...v, path: `/productos/${row.category.slug}/${row.slug}` })),
      ),
    ),
  };
}
