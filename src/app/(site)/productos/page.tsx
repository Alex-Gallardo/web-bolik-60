import { CatalogFilters } from "@/components/catalog/catalog-filters";
import type { FilterOptions } from "@/components/catalog/catalog-filter-groups";
import { CatalogSearchForm } from "@/components/catalog/catalog-search-form";
import { CategoryCard } from "@/components/catalog/category-card";
import { ProductCard } from "@/components/catalog/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { catalogPage } from "@/content/catalog";
import { feedback } from "@/content/feedback";
import { ui } from "@/content/ui";
import { CATALOG_GRID_ID, catalogPrepaintScript } from "@/features/catalog/prepaint-script";
import { collectionPageJsonLd, JsonLd } from "@/features/seo/jsonld";
import { buildMetadata } from "@/features/seo/metadata";
import { LINE_GROUPS } from "@/lib/constants";
import { listCategories, listProducts, listUseTags } from "@/server/data/catalog";
import type { ProductCardView, UseTagView } from "@/server/data/types";

const PATH = "/productos";

export const metadata = buildMetadata({
  title: catalogPage.metaTitle,
  description: catalogPage.metaDescription,
  path: PATH,
});

/** Opciones de filtro: solo las que tiene algún producto (un filtro nunca deja la grilla vacía sola). */
function filterOptions(products: ProductCardView[], useTags: UseTagView[]): FilterOptions {
  const lines = new Set(products.map((p) => p.category.lineGroup));
  const uses = new Set(products.flatMap((p) => p.useSlugs));
  const colors = new Map<string, { slug: string; name: string; hex: string }>();
  for (const product of products) {
    for (const color of product.colors) {
      if (!colors.has(color.key))
        colors.set(color.key, { slug: color.key, name: color.name, hex: color.hex });
    }
  }
  return {
    linea: LINE_GROUPS.filter((line) => lines.has(line)).map((slug) => ({
      slug,
      name: ui.lines[slug],
    })),
    uso: useTags.filter((tag) => uses.has(tag.slug)),
    color: [...colors.values()],
  };
}

/**
 * Catálogo /productos (docs/06 §3.2, BD-060): estático, con la grilla completa en el HTML. Los
 * filtros (línea, uso, color) son una isla cliente que solo oculta y muestra productos; sin JS se
 * ve todo. Canónica /productos aunque la URL lleve filtros. JSON-LD: CollectionPage con su ItemList
 * y, en las migas, BreadcrumbList (docs/10 §4).
 */
export default async function CatalogPage() {
  const [products, categories, useTags] = await Promise.all([
    listProducts(),
    listCategories(),
    listUseTags(),
  ]);
  const searchId = "catalogo-buscar";
  const options = filterOptions(products, useTags);
  const colorKeys = (p: ProductCardView) => [...new Set(p.colors.map((c) => c.key))];
  const crumbs = [
    { name: catalogPage.breadcrumbs.home, path: "/" },
    { name: catalogPage.title, path: PATH },
  ];

  return (
    <>
      <Section spacing="sm" className="pb-0">
        <div className="flex max-w-3xl flex-col gap-4">
          <Breadcrumbs crumbs={crumbs} label={catalogPage.breadcrumbs.label} />
          <h1 className="text-[length:var(--fs-h1)]">{catalogPage.title}</h1>
          <p className="text-[length:var(--fs-lead)] text-muted">{catalogPage.intro}</p>
          <CatalogSearchForm id={searchId} />
        </div>
      </Section>

      <Section spacing="sm">
        <CatalogFilters
          options={options}
          items={products.map((p) => ({
            slug: p.slug,
            linea: p.category.lineGroup,
            usos: p.useSlugs,
            colores: colorKeys(p),
          }))}
          empty={feedback.catalog.filtersEmpty}
        >
          <ul
            id={CATALOG_GRID_ID}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          >
            {products.map((product) => (
              // data-product (slug): la isla oculta y muestra cada <li>; los data-* los lee el
              // script previo al pintado con un enlace filtrado.
              <li
                key={product.slug}
                data-product={product.slug}
                data-linea={product.category.lineGroup}
                data-usos={product.useSlugs.join(" ")}
                data-colores={colorKeys(product).join(" ")}
              >
                {/* Sin precarga: las fichas llegan con BD-062. */}
                <ProductCard product={product} headingLevel={2} prefetch={false} />
              </li>
            ))}
          </ul>
          {/* Antes del primer pintado: con ?linea=… oculta lo que no va (sin CLS al hidratar). */}
          <script
            dangerouslySetInnerHTML={{
              __html: catalogPrepaintScript({
                linea: options.linea.map((o) => o.slug),
                uso: options.uso.map((o) => o.slug),
                color: options.color.map((o) => o.slug),
              }),
            }}
          />
        </CatalogFilters>
        <JsonLd
          data={collectionPageJsonLd({
            name: catalogPage.title,
            description: catalogPage.intro,
            path: PATH,
            items: products.map((p) => ({ name: p.name, path: p.href })),
          })}
        />
      </Section>

      {categories.length > 0 ? (
        <Section background="soft" aria-labelledby="catalogo-categorias">
          <h2 id="catalogo-categorias" className="text-[length:var(--fs-h2)]">
            {catalogPage.categoriesTitle}
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug}>
                <CategoryCard
                  category={category}
                  prefetch={false}
                  data-event="category_click"
                  data-category={category.slug}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
