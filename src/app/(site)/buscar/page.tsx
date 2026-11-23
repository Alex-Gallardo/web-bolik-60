import { searchText as t } from "@/content/search";
import { buildMetadata } from "@/features/seo/metadata";
import { SearchBody } from "./_search-body";

/** Página de utilidad: noindex, follow (CLAUDE.md, docs/10 §3). */
export const metadata = buildMetadata({
  title: t.metaTitle,
  description: t.metaDescription,
  path: "/buscar",
  noindex: true,
});

/**
 * /buscar sin búsqueda (BD-066): estática, con el campo enfocado. /buscar?q=… la sirve
 * /buscar/[q] (proxy.ts la reescribe): así los resultados vienen en el HTML, también sin JS.
 */
export default function SearchPage() {
  return <SearchBody query="" />;
}
