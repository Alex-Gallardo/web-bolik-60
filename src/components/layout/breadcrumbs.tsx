import type { Route } from "next";
import Link from "next/link";
import { breadcrumbListJsonLd, JsonLd, type Crumb } from "@/features/seo/jsonld";

type BreadcrumbsProps = {
  /** De la home a la página actual; la última es la página (sin enlace, aria-current). */
  crumbs: readonly Crumb[];
  /** Nombre del <nav> para lectores de pantalla. */
  label: string;
};

/**
 * Migas de pan (docs/06 §3.2; BD-060 las trae y BD-093 las lleva a todas las páginas) con su
 * BreadcrumbList del mismo texto (docs/10 §4). Server Component sin JS.
 */
export function Breadcrumbs({ crumbs, label }: BreadcrumbsProps) {
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
      <JsonLd data={breadcrumbListJsonLd(crumbs)} />
    </nav>
  );
}
