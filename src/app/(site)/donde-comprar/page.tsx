import type { Route } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { StoreCard } from "@/components/stores/store-card";
import { StoreFilters } from "@/components/stores/store-filters";
import { buttonVariants } from "@/components/ui/button-variants";
import { breadcrumbsText } from "@/content/breadcrumbs";
import { storesPage } from "@/content/stores";
import { ui } from "@/content/ui";
import { JsonLd, storeListJsonLd } from "@/features/seo/jsonld";
import { buildMetadata } from "@/features/seo/metadata";
import { STORES_PATH, groupStoresByDepartment, sortStores } from "@/features/stores/directory";
import { STORES_LIST_ID, storesPrepaintScript } from "@/features/stores/prepaint-script";
import { listDepartments, listStores } from "@/server/data/stores";

export const metadata = buildMetadata({
  title: storesPage.metaTitle,
  description: storesPage.metaDescription,
  path: STORES_PATH,
});

/** Solo https: la URL llega de los datos (y algún día del admin), nunca un javascript:. */
const isHttps = (url: string | null): url is string => Boolean(url?.startsWith("https://"));

/**
 * Dónde comprar (docs/06 §3.7, BD-080): estática, con la lista completa en el HTML, agrupada por
 * departamento (cadenas primero). Los filtros son una isla que solo oculta y muestra; sin JS se ve
 * todo y el selector es un formulario GET (el proxy lo lleva al grupo, #slug). Los departamentos
 * enlazan a su grupo hasta que BD-082 cree sus páginas. El mapa y «Usar mi ubicación» llegan con
 * BD-081. JSON-LD: ItemList de Store y, en las migas, BreadcrumbList (docs/10 §4).
 */
export default async function WhereToBuyPage() {
  const [departments, stores] = await Promise.all([listDepartments(), listStores()]);
  const groups = groupStoresByDepartment(stores, departments);
  const ordered = groups.flatMap((group) => group.stores);
  // Una tienda en línea por URL: con la base, cada sucursal de una cadena es un punto de venta.
  const online = [
    ...new Map(
      sortStores(stores.filter((store) => isHttps(store.onlineShopUrl))).map((store) => [
        store.onlineShopUrl!,
        store,
      ]),
    ).values(),
  ];
  const country = new Map(departments.map((d) => [d.slug, d.country]));
  const crumbs = [breadcrumbsText.home, { name: storesPage.title, path: STORES_PATH }];

  return (
    <>
      <Section spacing="sm" className="pb-0">
        <div className="flex max-w-3xl flex-col gap-4">
          <Breadcrumbs crumbs={crumbs} />
          <h1 className="text-[length:var(--fs-h1)]">{storesPage.title}</h1>
          <p className="text-[length:var(--fs-lead)] text-muted">{storesPage.intro}</p>
        </div>
      </Section>

      {online.length > 0 ? (
        <Section spacing="sm" className="pb-0" aria-labelledby="tiendas-en-linea">
          <h2 id="tiendas-en-linea" className="text-[length:var(--fs-h3)]">
            {storesPage.onlineTitle}
          </h2>
          <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
                  {storesPage.buyAt(store.name)}
                  <span className="sr-only">{` ${ui.cards.newTab}`}</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section spacing="sm">
        <StoreFilters
          departments={groups.map((group) => group.department)}
          allDepartments={departments.map(({ slug, name }) => ({ slug, name }))}
          stores={ordered.map((store) => ({
            slug: store.slug,
            department: store.department.slug,
            name: store.name,
          }))}
          prepaintScript={storesPrepaintScript(groups.map((group) => group.department.slug))}
        >
          <div id={STORES_LIST_ID} className="flex flex-col gap-10">
            {groups.map(({ department, stores: inDepartment }) => (
              // Un <div> y no un <section>: un landmark por departamento sería ruido para el lector.
              <div
                key={department.slug}
                id={department.slug}
                data-store-group={department.slug}
                className="flex flex-col gap-4"
              >
                {/* tabIndex -1: el foco llega aquí desde los enlaces por departamento. */}
                <h2
                  id={`${department.slug}-titulo`}
                  tabIndex={-1}
                  className="text-[length:var(--fs-h3)]"
                >
                  {department.name}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inDepartment.map((store) => (
                    <li key={store.slug} data-store-item={store.slug}>
                      <StoreCard store={store} headingLevel={3} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </StoreFilters>
        <JsonLd
          data={storeListJsonLd({
            name: storesPage.title,
            path: STORES_PATH,
            stores: ordered.map((store) => {
              const verified = store.isVerified;
              return {
                name: store.name,
                address: verified ? store.address : null,
                municipality: store.municipality,
                department: store.department.name,
                country: country.get(store.department.slug) ?? null,
                phone: store.phone,
                geo:
                  verified && store.lat !== null && store.lng !== null
                    ? { lat: store.lat, lng: store.lng }
                    : null,
                url: isHttps(store.onlineShopUrl) ? store.onlineShopUrl : null,
              };
            }),
          })}
        />
      </Section>

      <Section background="soft" spacing="sm" aria-labelledby="tiendas-departamentos">
        <h2 id="tiendas-departamentos" className="text-[length:var(--fs-h3)]">
          {storesPage.departmentsTitle}
        </h2>
        {/* Anclas a cada grupo (docs/10 §7); BD-082 las cambia por /donde-comprar/{slug}. */}
        <ul className="mt-4 flex flex-wrap gap-3">
          {groups.map(({ department }) => (
            <li key={department.slug}>
              <a
                href={`#${department.slug}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {department.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link
            href={storesPage.distributorCta.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "link" })}
          >
            {storesPage.distributorCta.label}
          </Link>
        </p>
      </Section>
    </>
  );
}
