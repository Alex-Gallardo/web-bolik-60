import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { featuredCatalog } from "@/content/home";
import { cn } from "@/lib/cn";

/**
 * Buscador del catálogo (home y /productos): un formulario GET a /buscar (BD-066), sin JS, con
 * etiqueta para lector de pantalla y data-event="search_open" (docs/12 §4).
 */
export function CatalogSearchForm({ id, className }: { id: string; className?: string }) {
  return (
    <form
      action={featuredCatalog.searchAction}
      method="get"
      role="search"
      data-event="search_open"
      className={cn("flex flex-col gap-3 sm:flex-row", className)}
    >
      <label htmlFor={id} className="sr-only">
        {featuredCatalog.searchLabel}
      </label>
      <Input
        id={id}
        name="q"
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={featuredCatalog.searchPlaceholder}
        className="sm:flex-1"
      />
      <button type="submit" className={buttonVariants({ variant: "primary", block: true })}>
        {featuredCatalog.searchButton}
      </button>
    </form>
  );
}
