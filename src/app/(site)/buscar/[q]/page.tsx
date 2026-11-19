import { searchText as t } from "@/content/search";
import { buildMetadata } from "@/features/seo/metadata";
import { queryFromSegment } from "@/lib/search-query";
import { SearchBody } from "../_search-body";

/** Next entrega el segmento todavía codificado; una codificación rota cuenta como texto literal. */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Una búsqueda: noindex, con la canónica de /buscar (no se indexa una página por consulta). */
export const metadata = buildMetadata({
  title: t.metaTitle,
  description: t.metaDescription,
  path: "/buscar",
  noindex: true,
});

/**
 * Cache Components exige al menos un valor de ejemplo; el resto se pinta en cada petición, completo
 * en el HTML (sin el bloque oculto del streaming que sin JS no se vería) y sin guardarse en disco.
 */
export async function generateStaticParams() {
  return [{ q: "ultra" }];
}

/**
 * /buscar?q=… (BD-066, docs/06 §3.6): proxy.ts la reescribe aquí. La URL del visitante sigue siendo
 * /buscar?q=…; los resultados se calculan en el servidor y se ven sin JS.
 */
export default async function SearchQueryPage({ params }: PageProps<"/buscar/[q]">) {
  const { q } = await params;
  return <SearchBody query={queryFromSegment(decodeSegment(q))} />;
}
