import { cx } from "class-variance-authority";
import type { Route } from "next";
import Link from "next/link";
import { ui } from "@/content/ui";
import type { CategoryView, LineGroup } from "@/server/data/types";

/** Barra superior con el color de la línea (docs/02). */
const LINE_BAR: Record<LineGroup, string> = {
  escritura: "bg-line-escritura",
  escolar: "bg-line-escolar",
  arte: "bg-line-arte",
  oficina: "bg-line-oficina",
};

type CategoryCardProps = {
  category: CategoryView;
  headingLevel?: 2 | 3 | 4;
  /** Prefetch del Link; false donde la página todavía no existe. */
  prefetch?: boolean;
} & { [key: `data-${string}`]: string | undefined };

/**
 * Tarjeta de categoría (docs/06 §3.1 y §3.2, BD-023): color de la línea, nombre, texto corto y
 * cuántos productos tiene. Toda la tarjeta es un solo enlace.
 */
export function CategoryCard({ category, headingLevel = 3, prefetch, ...data }: CategoryCardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <Link
      {...data}
      href={category.href as Route}
      prefetch={prefetch}
      className="lift group flex h-full flex-col rounded-lg border-2 border-line bg-paper text-ink no-underline"
    >
      <span
        aria-hidden="true"
        className={cx("h-2 rounded-t-[calc(var(--radius-lg)-2px)]", LINE_BAR[category.lineGroup])}
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <Heading className="text-lg leading-tight">{category.name}</Heading>
        <p className="text-sm text-muted">{category.shortText}</p>
        <span className="mt-auto pt-2 text-sm font-bold text-blue group-hover:underline">
          {ui.cards.products(category.productCount)}
        </span>
      </div>
    </Link>
  );
}
