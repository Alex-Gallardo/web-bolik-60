import { buttonVariants } from "@/components/ui/button-variants";
import { searchText as t } from "@/content/search";
import type { SearchResult } from "@/lib/search";

type SearchResultsProps = {
  query: string;
  result: SearchResult;
  /** Enlace de WhatsApp para «sin resultados»; null sin número en los ajustes. */
  whatsappUrl: string | null;
  /** /buscar con una sugerencia (sin JS lleva a la búsqueda; con JS, el panel la escribe). */
  onSuggest?: (query: string) => void;
  /** Al seguir un enlace de producto (el diálogo del header se cierra antes de navegar). */
  onNavigate?: () => void;
};

/**
 * Resultados del buscador (BD-066, docs/06 §3.6): la tarjeta «¿Buscas…?» si el código coincide
 * exacto, la lista y, sin resultados, sugerencias (doc 17) y WhatsApp. La pinta el servidor en
 * /buscar (sin JS) y el panel en el navegador. Enlaces simples (<a>): sin JS de next/link.
 * data-event: search / search_no_results (docs/12 §4), para la analítica (BD-127).
 */
export function SearchResults({
  query,
  result,
  whatsappUrl,
  onSuggest,
  onNavigate,
}: SearchResultsProps) {
  if (result.status === "short") return null;

  if (result.status === "empty")
    return (
      <div
        data-event="search_no_results"
        data-query={query}
        className="flex flex-col items-start gap-4 rounded-lg border-2 border-line bg-paper p-5"
      >
        <p className="text-lg font-bold">{t.noResults.title(query)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">{t.noResults.suggestionsLabel}</span>
          {t.noResults.suggestions.map((s) => (
            <a
              key={s}
              href={`/buscar?q=${encodeURIComponent(s)}`}
              onClick={
                onSuggest
                  ? (event) => {
                      event.preventDefault();
                      onSuggest(s);
                    }
                  : undefined
              }
              className="inline-flex min-h-11 items-center rounded-full border-2 border-line px-4 font-bold text-ink no-underline hover:bg-soft"
            >
              {s}
            </a>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-event="whatsapp_open"
              className={buttonVariants({ variant: "whatsapp" })}
            >
              {t.noResults.whatsapp}
            </a>
          ) : null}
          <a href={t.noResults.catalog.href} className={buttonVariants({ variant: "outline" })}>
            {t.noResults.catalog.label}
          </a>
        </div>
      </div>
    );

  const { exact, results } = result;
  return (
    <div
      data-event="search"
      data-query={query}
      data-results={results.length}
      className="flex flex-col gap-4"
    >
      {exact ? (
        <a
          href={`${exact.entry.href}?color=${encodeURIComponent(exact.colorKey)}`}
          onClick={onNavigate}
          className="flex flex-col gap-1 rounded-lg border-2 border-blue bg-blue-50 p-5 text-ink no-underline hover:bg-soft"
        >
          <span className="text-lg font-bold">
            {t.exact(`${exact.entry.name} ${exact.color}`, exact.sku)}
          </span>
          <span className="font-bold text-blue underline underline-offset-4">{t.exactCta}</span>
        </a>
      ) : null}
      <ul aria-label={t.results(results.length, query)} className="flex flex-col gap-2">
        {results.map((entry) => (
          <li key={entry.slug}>
            <a
              href={entry.href}
              onClick={onNavigate}
              className="flex min-h-11 flex-col gap-1 rounded-lg border-2 border-line bg-paper px-4 py-3 text-ink no-underline hover:bg-soft"
            >
              <span className="font-bold">{entry.name}</span>
              <span className="text-sm text-muted">
                {[entry.brand !== "Bolik" ? entry.brand : null, entry.category, ...entry.colors]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {entry.skus.length > 0 ? (
                <span className="text-sm text-muted tnum">
                  {t.codes}: {entry.skus.join(", ")}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
