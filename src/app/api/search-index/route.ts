import type { SearchEntry } from "@/lib/search";
import { getSearchIndex } from "@/server/data/search";

/**
 * Índice del buscador instantáneo (BD-066, docs/01 §decisiones): JSON pequeño que el navegador
 * descarga solo al abrir el buscador. Sale de getSearchIndex ('use cache' con los tags de productos
 * y categorías): se regenera cuando el admin cambia el catálogo. Solo lo que el buscador usa.
 */
export async function GET() {
  const index: SearchEntry[] = (await getSearchIndex()).map((e) => ({
    slug: e.slug,
    name: e.name,
    href: e.href,
    category: e.category,
    shortDescription: e.shortDescription,
    colors: e.colors,
    skus: e.skus,
    barcodes: e.barcodes,
    brand: e.brand,
    variants: e.variants,
  }));
  return Response.json(index, {
    // El navegador lo guarda unos minutos; el CDN o IIS pueden servirlo viejo mientras se renueva.
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
  });
}
