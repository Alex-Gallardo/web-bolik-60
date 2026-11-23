import type { Route } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { productPage } from "@/content/product";
import { whereToBuy } from "@/content/home";
import { ui } from "@/content/ui";
import type { StoreView } from "@/server/data/types";

type ProductWhereToBuyProps = {
  /** Puntos de venta publicados: de aquí salen las cadenas y la compra en línea. */
  stores: StoreView[];
  /** SKU del color por defecto, para retailer_click (docs/12 §4). */
  sku: string;
};

/**
 * «Dónde comprar este producto» (docs/06 §3.4, BD-063): el texto de «Dónde comprar» de la home
 * (docs/17 §2), las cadenas con productos Bolik (decisión del usuario: sus nombres, sin decir que
 * cada una tiene este producto: no hay datos de surtido por tienda), la compra en línea (Walmart,
 * La Torre: otra pestaña, retailer_click con la tienda y el SKU) y «Ver todas las tiendas» al
 * localizador (BD-080). Server Component, sin JS.
 */
export function ProductWhereToBuy({ stores, sku }: ProductWhereToBuyProps) {
  const t = productPage.whereToBuyBlock;
  const titleId = "ficha-donde-comprar";
  const chains = [...new Set(stores.filter((s) => s.type === "cadena").map((s) => s.name))];
  // Solo https: la URL llega de los datos (y algún día del admin), nunca un javascript:. Una
  // tienda en línea por URL: con la base, cada sucursal de una cadena es un punto de venta.
  const online = [
    ...new Map(
      stores
        .filter((store) => store.onlineShopUrl?.startsWith("https://"))
        .map((store) => [store.onlineShopUrl!, store]),
    ).values(),
  ];

  return (
    <Section spacing="sm" aria-labelledby={titleId}>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="text-[length:var(--fs-h2)]">
            {t.title}
          </h2>
          <p className="text-[length:var(--fs-lead)] text-muted">{whereToBuy.text}</p>
          {chains.length > 0 ? (
            <div>
              <h3 className="text-base">{t.chainsTitle}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {chains.map((name) => (
                  <li key={name} className="rounded-full border-2 border-line px-3 py-1 text-sm">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          {online.length > 0 ? (
            <>
              <h3 className="text-base">{whereToBuy.onlineLabel}</h3>
              <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {online.map((store) => (
                  <li key={store.onlineShopUrl}>
                    <a
                      href={store.onlineShopUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", block: true })}
                      data-event="retailer_click"
                      data-retailer={store.slug}
                      data-sku={sku}
                    >
                      {whereToBuy.buyAt(store.name)}
                      <span className="sr-only">{` ${ui.cards.newTab}`}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <Link
            href={whereToBuy.allStores.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "primary", className: "self-start" })}
          >
            {whereToBuy.allStores.label}
          </Link>
        </div>
      </div>
    </Section>
  );
}
