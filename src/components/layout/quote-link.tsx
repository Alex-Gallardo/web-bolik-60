"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type MouseEvent } from "react";
import { OnRouteChange } from "@/components/motion/on-route-change";
import type { QuoteDrawerProps } from "@/components/quote/quote-drawer";
import { headerText } from "@/content/header";
import { useQuoteCount } from "@/features/quote/quote-count";
import { QUOTE_OPEN_EVENT, openQuoteDrawer } from "@/features/quote/storage-keys";

/** Globo del contador (solo visual: el número va en el nombre accesible del enlace). */
const BADGE =
  "absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-yellow px-1 text-xs font-bold text-ink tnum";

/**
 * Clic normal abre el drawer; con Ctrl, Cmd, Shift o la rueda, el enlace hace lo suyo. En
 * /cotizacion la lista ya está en la página (BD-072): el enlace no abre el drawer encima.
 */
function openDrawer(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  if (window.location.pathname === headerText.quote.href) return;
  event.preventDefault();
  openQuoteDrawer();
}

/**
 * «Mi cotización» en el header (BD-041): ícono con el contador de líneas y su «pop» (A-05) cuando
 * sube. El número va en el nombre accesible; el globo es solo visual. Es un enlace a /cotizacion
 * (sin JS, o con Ctrl+clic); con JS, el clic abre el drawer (BD-071).
 */
export function QuoteLink() {
  const { count, popKey } = useQuoteCount();
  return (
    <Link
      href={headerText.quote.href as Route}
      prefetch={false}
      data-quote-link
      aria-haspopup="dialog"
      onClick={openDrawer}
      aria-label={headerText.quoteCount(count)}
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
          // Constante aparte y no un template: el orden de clases de Prettier recortaba el espacio y
          // pegaba «badge-pop» con la clase siguiente. Sin cx: clsx no entra en el JS común (BD-047).
          className={popKey > 0 ? `badge-pop ${BADGE}` : BADGE}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * «Mi cotización» del header y el anfitrión del drawer (BD-071). Al recibir QUOTE_OPEN_EVENT (este
 * enlace, el toast «Ver cotización» de la ficha) descarga el drawer con import() la primera vez:
 * Radix, zustand y sus textos nunca van en el JS de todas las páginas. Todo en este módulo y sin
 * precarga, para sumar lo mínimo al JS común: la ficha no tenía margen en su presupuesto (docs/12
 * §2, BD-071).
 * Al cerrar, el foco vuelve a lo que abrió el drawer o, si ya no existe (el toast se fue), aquí.
 */
export function QuoteLinkWithDrawer() {
  const [open, setOpen] = useState(false);
  const [Drawer, setDrawer] = useState<ComponentType<QuoteDrawerProps> | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOpen = async () => {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement ? active : null;
      try {
        const loaded = await import("@/components/quote/quote-drawer");
        setDrawer(() => loaded.default);
        setOpen(true);
      } catch {
        // Archivos de otro despliegue: recargar trae los nuevos (como el menú móvil). Sin red, el
        // aviso de sin conexión ya está en pantalla y el próximo toque reintenta.
        if (navigator.onLine) window.location.reload();
      }
    };
    const listener = () => void onOpen();
    window.addEventListener(QUOTE_OPEN_EVENT, listener);
    return () => window.removeEventListener(QUOTE_OPEN_EVENT, listener);
  }, []);

  const returnFocus = () => {
    const target = opener.current;
    if (target?.isConnected && target !== document.body) target.focus();
    else document.querySelector<HTMLElement>("[data-quote-link]")?.focus();
  };

  return (
    <>
      <QuoteLink />
      {/* Un enlace del drawer cambió la ruta (ficha, catálogo, /cotizacion): se cierra. */}
      <OnRouteChange onChange={() => setOpen(false)} />
      {Drawer ? <Drawer open={open} onOpenChange={setOpen} returnFocus={returnFocus} /> : null}
    </>
  );
}
