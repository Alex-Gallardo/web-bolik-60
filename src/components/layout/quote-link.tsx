"use client";

import { cx } from "class-variance-authority";
import type { Route } from "next";
import Link from "next/link";
import { ui } from "@/content/ui";
import { useQuoteCount } from "@/features/quote/quote-count";

/**
 * «Mi cotización» en el header (BD-041): ícono con el contador de líneas y su «pop» (A-05) cuando
 * sube. El número va en el nombre accesible; el globo es solo visual.
 */
export function QuoteLink() {
  const { count, popKey } = useQuoteCount();
  return (
    <Link
      href={ui.header.quote.href as Route}
      prefetch={false}
      aria-label={ui.header.quoteCount(count)}
      className="relative grid size-11 place-items-center rounded-md text-ink hover:bg-soft"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
        <path d="M16 5h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2" />
        <path d="M9 11h6M9 15h4" />
      </svg>
      {count > 0 ? (
        <span
          key={popKey}
          aria-hidden="true"
          data-quote-count
          // cx y no un template: el orden de clases de Prettier recortaba el espacio y pegaba
          // «badge-pop» con la clase siguiente.
          className={cx(
            popKey > 0 && "badge-pop",
            "absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-yellow px-1 text-xs font-bold text-ink tnum",
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
