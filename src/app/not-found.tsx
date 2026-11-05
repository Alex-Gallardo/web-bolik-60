import type { Metadata } from "next";
import Link from "next/link";
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
        <Link
          href="/"
          className="press inline-flex min-h-12.5 items-center rounded-md bg-blue px-7 font-bold text-paper no-underline hover:bg-blue-700"
        >
          {ui.notFound.home}
        </Link>
      </section>
    </MainContent>
  );
}
