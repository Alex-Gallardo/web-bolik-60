import type { Route } from "next";
import Link from "next/link";
import { breadcrumbsText } from "@/content/breadcrumbs";
import { breadcrumbListJsonLd, JsonLd, type Crumb } from "@/features/seo/jsonld";

type BreadcrumbsProps = {
  /** De la home a la página actual; la última es la página (sin enlace, aria-current). */
  crumbs: readonly Crumb[];
  /** Nombre del <nav> para lectores de pantalla; por defecto «Migas de pan». */
  label?: string;
  /** Prefetch de los enlaces (por defecto el de Next); false donde el presupuesto de JS es justo. */
  prefetch?: boolean;
  /** false en las páginas con noindex (/buscar, /cotizacion): migas visibles, sin JSON-LD. */
  structuredData?: boolean;
};

/**
 * Migas de pan (docs/06 §3; BD-060 las trae y BD-093 las lleva a todas las páginas, salvo la home)
 * con su BreadcrumbList del mismo texto (docs/10 §4). Server Component sin JS.
 */
export function Breadcrumbs({
  crumbs,
  label = breadcrumbsText.label,
  prefetch,
  structuredData = true,
}: BreadcrumbsProps) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="font-bold text-heading">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.path as Route}
                    prefetch={prefetch}
                    className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                  >
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {structuredData ? <JsonLd data={breadcrumbListJsonLd(crumbs)} /> : null}
    </nav>
  );
}
