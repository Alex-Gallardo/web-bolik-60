import { cx } from "class-variance-authority";
import type { Metadata } from "next";
import { Illustration } from "@/components/brand/illustration";
import { MainContent } from "@/components/layout/main-content";
import { notFoundText } from "@/content/not-found";
import { listCategories } from "@/server/data/catalog";
import { NOT_FOUND_BEACON } from "./not-found-beacon";

// Sin robots: Next ya pone <meta name="robots" content="noindex"> en el 404 (uno solo).
export const metadata: Metadata = { title: notFoundText.metaTitle };

const linkClass =
  "press inline-flex min-h-12 items-center rounded-md px-5 font-bold no-underline focus-visible:outline-2";

/**
 * 404 (BD-046, docs/06 §3.19, textos de docs/17): queda fuera de los layouts de grupo, así que pone
 * su propio <main id="contenido"> y ofrece por dónde seguir (inicio, catálogo, dónde comprar y las
 * líneas de producto). Las URLs viejas con redirección nunca llegan aquí: proxy.ts responde 301.
 * El resto se cuenta en NotFoundLog con un aviso desde el navegador (not-found-beacon.ts): la
 * página sigue estática. El buscador llega con BD-066.
 */
export default async function NotFound() {
  const categories = await listCategories();
  const { links } = notFoundText;
  return (
    <MainContent>
      <section className="container-site flex flex-1 flex-col items-start justify-center gap-6 py-16">
        <Illustration name="error" className="size-24" />
        <div className="flex flex-col gap-3">
          <h1>{notFoundText.title}</h1>
          <p className="max-w-[var(--measure)] text-[length:var(--fs-lead)] text-muted">
            {notFoundText.body}
          </p>
        </div>
        {/* <a> y no <Link>: next/link sumaría JS a una página que no lo necesita. */}
        <nav aria-label={links.label} className="flex flex-wrap gap-3">
          <a
            href={links.home.href}
            className={cx(linkClass, "bg-blue text-paper hover:bg-blue-700")}
          >
            {links.home.label}
          </a>
          <a href={links.catalog.href} className={cx(linkClass, "border-2 border-blue text-blue")}>
            {links.catalog.label}
          </a>
          <a href={links.stores.href} className={cx(linkClass, "border-2 border-blue text-blue")}>
            {links.stores.label}
          </a>
        </nav>
        {categories.length > 0 && (
          <nav aria-labelledby="lineas-404" className="flex flex-col gap-3">
            <h2 id="lineas-404" className="text-[length:var(--fs-h3)]">
              {notFoundText.categories}
            </h2>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <a href={category.href} className="inline-flex min-h-11 items-center">
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>
      <script dangerouslySetInnerHTML={{ __html: NOT_FOUND_BEACON }} />
    </MainContent>
  );
}
