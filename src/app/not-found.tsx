import type { Metadata } from "next";
import { MainContent } from "@/components/layout/main-content";
import { ui } from "@/content/ui";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: true },
};

/**
 * 404 mínima (BD-040, textos de docs/17 §4). Queda fuera de los layouts de grupo: pone su propio
 * <main id="contenido"> para que «Saltar al contenido» funcione. BD-046 la completa (redirecciones
 * de la tabla Redirect, registro en NotFoundLog, buscador y categorías).
 */
export default function NotFound() {
  return (
    <MainContent>
      <section className="container-site flex flex-1 flex-col items-start justify-center gap-4 py-16">
        <h1>{ui.notFound.title}</h1>
        <p className="max-w-[var(--measure)] text-[length:var(--fs-lead)] text-muted">
          {ui.notFound.body}
        </p>
        {/* <a> y no <Link>: next/link sumaría 3 KB de JS a una página que no lo necesita. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ver arriba */}
        <a
          href="/"
          className="press inline-flex min-h-12.5 items-center rounded-md bg-blue px-7 font-bold text-paper no-underline hover:bg-blue-700"
        >
          {ui.notFound.home}
        </a>
      </section>
    </MainContent>
  );
}
