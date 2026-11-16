import { ProductCard } from "@/components/catalog/product-card";
import { Section } from "@/components/layout/section";
import { productPage } from "@/content/product";
import type { ProductCardView } from "@/server/data/types";

/** Hasta 4: una fila en escritorio. */
const MAX_RELATED = 4;

/** La grilla mide como mucho ~300 px por tarjeta (2 columnas en móvil, 4 desde lg). */
const RELATED_SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 25vw, 50vw";

/**
 * «También te puede servir» (docs/17 §3, BD-063): los productos relacionados (ProductRelation, en
 * su orden; solo los visibles, ya filtrados por la fuente). Tarjetas sin precarga: el JS de otra
 * ficha no debe contar en el presupuesto de esta (docs/12 §2). Sin relacionados, no sale.
 */
export function ProductRelated({ products }: { products: ProductCardView[] }) {
  const shown = products.slice(0, MAX_RELATED);
  if (shown.length === 0) return null;
  const titleId = "ficha-relacionados";
  return (
    <Section spacing="sm" background="soft" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-[length:var(--fs-h2)]">
        {productPage.relatedTitle}
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {shown.map((product) => (
          <li key={product.slug}>
            <ProductCard
              product={product}
              headingLevel={3}
              prefetch={false}
              sizes={RELATED_SIZES}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
