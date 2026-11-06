"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ui } from "@/content/ui";
import type { LineGroup } from "@/server/data/types";

/** Categorías de una línea de producto para el menú (docs/06 §2: «mega-menú de líneas»). */
export type NavGroup = { line: LineGroup; categories: { name: string; href: string }[] };

/**
 * «Productos» del header de escritorio (BD-041): <details> nativo, así funciona sin JS y con el
 * teclado (Enter/Espacio abren). Esta isla solo lo cierra con Escape (devolviendo el foco), con un
 * clic afuera y al navegar.
 */
export function ProductsMenu({ groups }: { groups: NavGroup[] }) {
  const details = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    details.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    const close = (focusSummary: boolean) => {
      const element = details.current;
      if (!element?.open) return;
      element.open = false;
      if (focusSummary) element.querySelector("summary")?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const productos = ui.header.nav[0];
  return (
    <details ref={details} className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-md px-3 font-bold text-ink hover:bg-soft [&::-webkit-details-marker]:hidden">
        {productos.label}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="size-4 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="absolute top-full left-0 mt-3 w-[min(36rem,calc(100vw-2rem))] rounded-lg border-2 border-line bg-paper p-6 shadow-md">
        <div className="grid grid-cols-2 gap-6">
          {groups.map((group) => (
            <div key={group.line} className="flex flex-col gap-2">
              <p className="eyebrow text-blue">{ui.lines[group.line]}</p>
              <ul className="flex flex-col">
                {group.categories.map((category) => (
                  <li key={category.href}>
                    <Link
                      href={category.href as Route}
                      prefetch={false}
                      className="flex min-h-11 items-center rounded-md px-2 text-ink no-underline hover:bg-soft"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link
          href={productos.href as Route}
          prefetch={false}
          className="mt-4 flex min-h-11 items-center border-t-2 border-line pt-4 font-bold text-blue"
        >
          {ui.header.allProducts}
        </Link>
      </div>
    </details>
  );
}
