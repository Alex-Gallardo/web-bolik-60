import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryCard } from "@/components/catalog/category-card";
import { ProductCard } from "@/components/catalog/product-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { Accordion } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button-variants";
import { catalogPage } from "@/content/catalog";
import { categoryPage } from "@/content/category";
import { categoryMeta } from "@/features/catalog/category-meta";
import { collectionPageJsonLd, faqPageJsonLd, JsonLd } from "@/features/seo/jsonld";
import { buildMetadata } from "@/features/seo/metadata";
import { getCategory, listCategories, listProducts } from "@/server/data/catalog";
import { listFaqs } from "@/server/data/content";

/**
 * Las categorías publicadas, en el build. Con Cache Components no hay dynamicParams: un slug que no
 * existe (o despublicado) lo responde proxy.ts con un 404 real (server/seo/catalog-routes.ts); el
 * notFound() de la página queda de respaldo (200 con noindex, si el proxy aún no tiene la lista).
 * Debe haber al menos una (si no, el build falla): siempre hay alguna publicada.
 */
export async function generateStaticParams() {
  const categories = await listCategories();
  return categories.map((category) => ({ categoria: category.slug }));
}

/**
 * Lee sus params fuera de un Suspense, a propósito (como la ficha, BD-062): con uno, el HTML
 * prerenderizado traería un esqueleto y el contenido oculto hasta que un script lo cambie (sin JS no
 * se vería). Le dice a Next 16 (Partial Prefetching) que llegar aquí puede esperar a que baje: todas
 * las categorías están prerenderizadas.
 */
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/productos/[categoria]">): Promise<Metadata> {
  const { categoria } = await params;
  const category = await getCategory(categoria);
  if (!category) return {};
  const { title, description } = categoryMeta(category);
  // La imagen la pone su opengraph-image.tsx (nombre y foto, BD-090).
  return buildMetadata({ title, description, path: category.href, image: false });
}

/**
 * Categoría (docs/06 §3.3, BD-061): migas, h1 con su nombre, bajada, sus productos, la intro SEO,
 * sus preguntas (si hay), los botones a mayoreo y dónde comprar, y las demás categorías como
 * enlaces internos. JSON-LD: CollectionPage con ItemList, BreadcrumbList y FAQPage si hay
 * preguntas. Los «Datos clave» de la categoría (3–5 viñetas) esperan su campo y su texto.
 */
export default async function CategoryPage({ params }: PageProps<"/productos/[categoria]">) {
  const { categoria } = await params;
  const category = await getCategory(categoria);
  if (!category) notFound();

  const [products, categories, faqs] = await Promise.all([
    listProducts({ categorySlug: category.slug }),
    listCategories(),
    listFaqs({ scope: "category", categorySlug: category.slug }),
  ]);
  const siblings = categories.filter((c) => c.slug !== category.slug);
  const crumbs = [
    { name: categoryPage.breadcrumbs.home, path: "/" },
    { name: categoryPage.breadcrumbs.catalog, path: categoryPage.breadcrumbs.catalogHref },
    { name: category.name, path: category.href },
  ];

  return (
    <>
      <Section spacing="sm">
        <div className="flex max-w-3xl flex-col gap-4">
          <Breadcrumbs crumbs={crumbs} label={catalogPage.breadcrumbs.label} />
          <h1 className="text-[length:var(--fs-h1)]">{category.name}</h1>
          <p className="text-[length:var(--fs-lead)] text-muted">{category.shortText}</p>
        </div>

        <p className="mt-8 text-sm font-bold text-muted">{catalogPage.count(products.length)}</p>
        {products.length > 0 ? (
          <>
            <ul
              id="categoria-productos"
              className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
            >
              {products.map((product) => (
                <li key={product.slug}>
                  {/* Sin precarga: el JS de la ficha contaría en el de la categoría (docs/12 §2). */}
                  <ProductCard product={product} headingLevel={2} prefetch={false} />
                </li>
              ))}
            </ul>
            <JsonLd
              data={collectionPageJsonLd({
                name: category.name,
                description: category.shortText,
                path: category.href,
                items: products.map((p) => ({ name: p.name, path: p.href })),
              })}
            />
          </>
        ) : null}

        {category.intro ? (
          <p className="mt-10 max-w-3xl text-[length:var(--fs-lead)]">{category.intro}</p>
        ) : null}
      </Section>

      {faqs.length > 0 ? (
        <Section background="soft" aria-labelledby="categoria-faq">
          <div className="mx-auto max-w-[860px]">
            <h2 id="categoria-faq" className="text-[length:var(--fs-h2)]">
              {categoryPage.faqTitle}
            </h2>
            <Accordion
              className="mt-8"
              exclusive="faq-categoria"
              items={faqs.map((faq) => ({
                id: `faq-${faq.key}`,
                title: faq.question,
                content: <p>{faq.answer}</p>,
              }))}
            />
          </div>
          <JsonLd data={faqPageJsonLd(faqs)} />
        </Section>
      ) : null}

      <Section spacing="sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={categoryPage.ctas.wholesale.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "primary", block: true })}
          >
            {categoryPage.ctas.wholesale.label}
          </Link>
          <Link
            href={categoryPage.ctas.whereToBuy.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "outline", block: true })}
          >
            {categoryPage.ctas.whereToBuy.label}
          </Link>
        </div>
      </Section>

      {siblings.length > 0 ? (
        <Section aria-labelledby="categoria-otras">
          <h2 id="categoria-otras" className="text-[length:var(--fs-h2)]">
            {categoryPage.siblingsTitle}
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {siblings.map((sibling) => (
              <li key={sibling.slug}>
                <CategoryCard
                  category={sibling}
                  data-event="category_click"
                  data-category={sibling.slug}
                />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
