import type { Route } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { Select } from "@/components/ui/select";
import { whereToBuy } from "@/content/home";
import { ui } from "@/content/ui";
import type { DepartmentView, StoreView } from "@/server/data/types";

type WhereToBuySectionProps = {
  departments: DepartmentView[];
  /** Tiendas con compra en línea (Walmart, La Torre): su URL sale de los datos. */
  onlineStores: StoreView[];
};

/**
 * «Bolik está cerca de ti» (docs/06 §3.1 sección 8, BD-053). Sin JS: el selector de departamento
 * es un formulario GET a /donde-comprar (BD-080 lo lleva a /donde-comprar/[departamento]) y la
 * compra en línea son enlaces externos en otra pestaña, con rel="noopener noreferrer" y
 * data-event="retailer_click" (criterio del ticket). Las «4 tiendas destacadas» de docs/06 esperan
 * a que Ventas las elija (no hay datos para marcarlas).
 */
export function WhereToBuySection({ departments, onlineStores }: WhereToBuySectionProps) {
  const titleId = "donde-comprar-titulo";
  const selectId = "donde-comprar-departamento";
  // Solo https: la URL llega de los datos (y algún día del admin), nunca un javascript:.
  const online = onlineStores.filter((store) => store.onlineShopUrl?.startsWith("https://"));
  return (
    <Section appearanceKey="home.where" background="soft" aria-labelledby={titleId}>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
            {whereToBuy.title}
          </h2>
          <p className="text-[length:var(--fs-lead)] text-muted">{whereToBuy.text}</p>
          {departments.length > 0 && (
            <form
              action={whereToBuy.action}
              method="get"
              className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex flex-1 flex-col gap-2">
                <label htmlFor={selectId} className="font-bold text-heading">
                  {whereToBuy.selectLabel}
                </label>
                <Select id={selectId} name="departamento" defaultValue={departments[0]!.slug}>
                  {departments.map((department) => (
                    <option key={department.slug} value={department.slug}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </div>
              <button type="submit" className={buttonVariants({ variant: "primary", block: true })}>
                {whereToBuy.submit}
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {online.length > 0 && (
            <>
              <h3 className="font-bold text-heading">{whereToBuy.onlineLabel}</h3>
              <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {online.map((store) => (
                  <li key={store.slug}>
                    <a
                      href={store.onlineShopUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", block: true })}
                      data-event="retailer_click"
                      data-retailer={store.slug}
                    >
                      {whereToBuy.buyAt(store.name)}
                      <span className="sr-only">{` ${ui.cards.newTab}`}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div>
            <Link
              href={whereToBuy.allStores.href as Route}
              prefetch={false}
              className={buttonVariants({ variant: "link" })}
            >
              {whereToBuy.allStores.label}
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
