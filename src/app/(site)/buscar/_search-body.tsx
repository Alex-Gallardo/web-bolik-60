import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { SearchPanel } from "@/components/search/search-panel";
import { breadcrumbsText } from "@/content/breadcrumbs";
import { searchSynonyms, searchText as t } from "@/content/search";
import { createSearcher } from "@/lib/search";
import { whatsappMessage, whatsappUrl } from "@/lib/whatsapp";
import { getSiteSettings } from "@/server/data/content";
import { getSearchIndex } from "@/server/data/search";

/**
 * Cuerpo de /buscar (BD-066, docs/06 §3.6), para la página vacía y para la de una búsqueda: el
 * panel con los resultados ya calculados en el servidor (se ven sin JS). Con JS, el panel sigue
 * buscando mientras se escribe y la URL lo acompaña (?q=).
 */
export async function SearchBody({ query }: { query: string }) {
  const [index, settings] = await Promise.all([getSearchIndex(), getSiteSettings()]);
  const whatsapp = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, whatsappMessage({ context: "general" }))
    : null;
  return (
    <Section spacing="sm">
      <div className="flex max-w-3xl flex-col gap-6">
        {/* Migas sin JSON-LD: es noindex (docs/06 §3, BD-093). */}
        <Breadcrumbs
          crumbs={[breadcrumbsText.home, { name: t.title, path: "/buscar" }]}
          structuredData={false}
          prefetch={false}
        />
        <h1 className="text-[length:var(--fs-h1)]">{t.title}</h1>
        {/* key: si cambia la consulta del servidor (otra navegación a /buscar), el panel empieza de
            nuevo en vez de conservar lo que tenía escrito. */}
        <SearchPanel
          key={query}
          id="buscar-q"
          initialQuery={query}
          initialResult={query ? createSearcher(index, searchSynonyms)(query) : undefined}
          whatsappUrl={whatsapp}
          autoFocus={!query}
          mode="page"
        />
      </div>
    </Section>
  );
}
