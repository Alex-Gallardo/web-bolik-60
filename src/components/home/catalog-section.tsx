import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryCard } from "@/components/catalog/category-card";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { featuredCatalog } from "@/content/home";
import { ui } from "@/content/ui";
import { LINE_GROUPS } from "@/lib/constants";
import type { CategoryView } from "@/server/data/types";

type CatalogSectionProps = {
  categories: CategoryView[];
  /** SiteStat «productos» si está publicada; null mientras Mercadeo no la valide. */
  productCount: number | null;
};

/**
 * Catálogo destacado (docs/06 §3.1 sección 5, BD-051): buscador grande, chips de línea y las
 * categorías. Todo sin JS: el buscador es un <form> GET a /buscar (BD-066) y los chips enlazan al
 * filtro por línea del catálogo (BD-060). Las tarjetas entran con A-21 y elevan con A-30;
 * data-event queda listo para la analítica (category_click).
 */
export function CatalogSection({ categories, productCount }: CatalogSectionProps) {
  const titleId = "catalogo-titulo";
  const searchId = "catalogo-buscar";
  const lines = LINE_GROUPS.filter((line) => categories.some((c) => c.lineGroup === line));
  return (
    <Section appearanceKey="home.catalog" background="soft" aria-labelledby={titleId}>
      <div className="flex max-w-2xl flex-col gap-4">
        <h2
          id={titleId}
          className="font-display text-[length:var(--fs-h2)] font-extrabold text-heading"
        >
          {featuredCatalog.title}
        </h2>
        <p className="text-[length:var(--fs-lead)] text-muted">
          {featuredCatalog.text(productCount)}
        </p>
        <form
          action={featuredCatalog.searchAction}
          method="get"
          role="search"
          data-event="search_open"
          className="mt-2 flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor={searchId} className="sr-only">
            {featuredCatalog.searchLabel}
          </label>
          <Input
            id={searchId}
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
      </div>

      {lines.length > 0 && (
        <ul aria-label={featuredCatalog.linesLabel} className="mt-6 flex flex-wrap gap-2">
          {lines.map((line) => (
            <li key={line}>
              <Link
                href={featuredCatalog.lineHref(line) as Route}
                prefetch={false}
                className="press inline-flex rounded-full no-underline hover:*:border-line-control"
                data-event="category_click"
                data-line={line}
              >
                <Chip line={line} size="md">
                  {ui.lines[line]}
                </Chip>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {categories.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((category, index) => (
            <li key={category.slug} data-reveal style={{ "--i": index } as CSSProperties}>
              <CategoryCard
                category={category}
                prefetch={false}
                data-event="category_click"
                data-category={category.slug}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href={featuredCatalog.cta.href as Route}
          prefetch={false}
          className={buttonVariants({ variant: "outline", block: true })}
        >
          {featuredCatalog.cta.label}
        </Link>
      </div>
    </Section>
  );
}
