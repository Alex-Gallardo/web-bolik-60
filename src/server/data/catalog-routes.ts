import "server-only";
import { env } from "@/env";
import seedCategories from "../../../prisma/seed/categories.json";
import { proxyDb } from "./proxy-db";

/**
 * Slugs de las categorías publicadas, para la lista en memoria de proxy.ts (BD-061). Como
 * listActiveRedirects: no pasa por dataSource() (el proxy no necesita ni debe cargar la capa de
 * lectura de la app) y con la base usa el cliente propio del proxy. Con fixtures lee solo
 * categories.json (sin validar todo el seed).
 */
export async function listPublishedCategorySlugs(): Promise<string[]> {
  if (env.DATA_SOURCE !== "db") {
    return (seedCategories as { slug: string; published?: boolean }[])
      .filter((c) => c.published !== false)
      .map((c) => c.slug);
  }
  const rows = await proxyDb().category.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}
