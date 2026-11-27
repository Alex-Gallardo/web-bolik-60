import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { DepartmentStores } from "@/components/stores/department-stores";
import { StoreCard } from "@/components/stores/store-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { breadcrumbsText } from "@/content/breadcrumbs";
import { storesPage } from "@/content/stores";
import { JsonLd, storeListJsonLd } from "@/features/seo/jsonld";
import { buildMetadata } from "@/features/seo/metadata";
import {
  STORES_PATH,
  departmentPath,
  sortStores,
  toMapStore,
  toStoreJsonLd,
} from "@/features/stores/directory";
import { nearestDepartments } from "@/features/stores/nearby";
import { getDepartment, listDepartments, listStores } from "@/server/data/stores";

/** Departamentos cercanos que enlaza cada página (docs/10 §7). */
const NEARBY_LINKS = 3;

/**
 * Solo los departamentos con al menos una tienda publicada (criterio de BD-082). Con Cache
 * Components no hay dynamicParams: proxy.ts responde un 404 real a los demás con la lista en memoria
 * (server/seo/catalog-routes.ts), y el formulario de la home lleva uno sin tiendas a
 * /donde-comprar#{slug}, la lista con su aviso. Debe haber al menos uno (si no, el build falla):
 * los datos siempre traen tiendas (BD-120 debe impedir despublicar la última).
 */
export async function generateStaticParams() {
  const departments = await listDepartments();
  return departments.filter((d) => d.storeCount > 0).map((d) => ({ departamento: d.slug }));
}

/** Como las categorías: sus params fuera de un Suspense (todas están prerenderizadas). */
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/donde-comprar/[departamento]">): Promise<Metadata> {
  const { departamento } = await params;
  const department = await getDepartment(departamento);
  if (!department || department.storeCount === 0) return {};
  return buildMetadata({
    title: storesPage.department.title(department),
    description: storesPage.department.metaDescription(department.name),
    path: departmentPath(department.slug),
    // docs/10 §9: sin texto propio (Department.intro, lo escribe Mercadeo) no se indexa ni va al
    // sitemap; los enlaces se siguen.
    noindex: !department.intro?.trim(),
  });
}

/**
 * Dónde comprar en un departamento (docs/06 §3.8, BD-082): migas, h1 de doc 17, su texto local (si
 * Mercadeo lo escribió), sus tiendas (cadenas primero) con el mapa de BD-081 centrado en él, los
 * departamentos cercanos y el aviso a distribuidores. JSON-LD: ItemList de Store y, en las migas,
 * BreadcrumbList.
 */
export default async function DepartmentPage({
  params,
}: PageProps<"/donde-comprar/[departamento]">) {
  const { departamento } = await params;
  const department = await getDepartment(departamento);
  if (!department || department.storeCount === 0) notFound();

  const [departments, all] = await Promise.all([listDepartments(), listStores()]);
  const stores = sortStores(all.filter((store) => store.department.slug === department.slug));
  const withStores = departments.filter((d) => d.storeCount > 0);
  const nearby = nearestDepartments(department, withStores, NEARBY_LINKS);
  const title = storesPage.department.title(department);
  // El texto local puede traer varios párrafos (separados por una línea en blanco).
  const intro = (department.intro ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const path = departmentPath(department.slug);
  const crumbs = [
    breadcrumbsText.home,
    { name: storesPage.title, path: STORES_PATH },
    { name: title, path },
  ];

  return (
    <>
      <Section spacing="sm" className="pb-0">
        <div className="flex max-w-3xl flex-col gap-4">
          {/* Sin prefetch: traería el JS de /donde-comprar (~9 KB) y la página se pasaría de su
              tope (docs/12). */}
          <Breadcrumbs crumbs={crumbs} prefetch={false} />
          <h1 className="text-[length:var(--fs-h1)]">{title}</h1>
          {intro.map((paragraph) => (
            <p key={paragraph} className="text-[length:var(--fs-lead)] text-muted">
              {paragraph}
            </p>
          ))}
          <p className="text-sm font-bold text-muted">
            {storesPage.count(stores.length, department.name)}
          </p>
        </div>
      </Section>

      <Section spacing="sm">
        <DepartmentStores
          slug={department.slug}
          departments={withStores.map(({ slug, name, lat, lng, storeCount }) => ({
            slug,
            name,
            lat,
            lng,
            storeCount,
          }))}
          stores={all.map(toMapStore).filter((store) => store.point)}
        >
          {/* Con JS, dos columnas: desde lg el mapa ocupa el resto. Sin JS, tres (sin mapa). */}
          <ul className="grid gap-4 self-start sm:grid-cols-2 lg:[html:not(.js)_&]:grid-cols-3">
            {stores.map((store) => (
              <li key={store.slug}>
                <StoreCard store={store} headingLevel={2} />
              </li>
            ))}
          </ul>
        </DepartmentStores>
        <JsonLd
          data={storeListJsonLd({
            name: title,
            path,
            stores: stores.map((store) => toStoreJsonLd(store, department.country)),
          })}
        />
      </Section>

      <Section
        background="soft"
        spacing="sm"
        aria-labelledby={nearby.length > 0 ? "departamentos-cercanos" : undefined}
      >
        {nearby.length > 0 ? (
          <>
            <h2 id="departamentos-cercanos" className="text-[length:var(--fs-h3)]">
              {storesPage.department.nearbyTitle}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {nearby.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={departmentPath(d.slug) as Route}
                    prefetch={false}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="mt-8 flex flex-col items-start gap-2 sm:flex-row sm:gap-6">
          <Link
            href={storesPage.department.allStores.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "link" })}
          >
            {storesPage.department.allStores.label}
          </Link>
          <Link
            href={storesPage.department.distributorCta.href as Route}
            prefetch={false}
            className={buttonVariants({ variant: "link" })}
          >
            {storesPage.department.distributorCta.label}
          </Link>
        </p>
      </Section>
    </>
  );
}
