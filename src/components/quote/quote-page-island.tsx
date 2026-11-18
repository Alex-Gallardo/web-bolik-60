"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { showToast } from "@/components/feedback/feedback-store";
import { buttonVariants } from "@/components/ui/button-variants";
import { feedback } from "@/content/feedback";
import { quoteDrawer, quotePage } from "@/content/quote";
import type { QuoteLine } from "@/features/quote/lines";
import { useQuote } from "@/features/quote/store";
import { PACKAGING_LABELS } from "@/lib/constants";
import { whatsappMessage, whatsappUrl, type WhatsAppItem } from "@/lib/whatsapp";
import { QuoteForm } from "./quote-form";
import { QuoteLineItem } from "./quote-line-item";

type QuotePageIslandProps = {
  departments: { slug: string; name: string }[];
  /** Número de WhatsApp de los ajustes; null sin número válido. */
  whatsappPhone: string | null;
  kitsEnabled: boolean;
};

const noop = () => () => {};
const UNDO_TOAST_ID = "quote-removed";

/** «Bolik Ultra Azul» y su SKU, como en el mensaje de la ficha (doc 17: cotización sin enviar). */
function toWhatsAppItem(line: QuoteLine): WhatsAppItem {
  const color = line.detail?.split(" · ")[0];
  return {
    name: color && color !== line.ref ? `${line.name} ${color}` : line.name,
    sku: line.ref,
    packaging: line.packaging ? PACKAGING_LABELS[line.packaging].singular : undefined,
    quantity: line.quantity,
  };
}

/**
 * Lista y formulario de /cotizacion (BD-072, docs/06 §3.16). La lista vive en el navegador
 * (localStorage, BD-070): el servidor no la conoce, así que hasta hidratar se ve «Cargando…» y
 * luego la lista con su formulario o el estado vacío. Cada línea: cantidad y «Quitar» con toast
 * «Deshacer» (6 s; aquí no hay modal que lo deje inerte, a diferencia del drawer).
 */
export function QuotePageIsland({ departments, whatsappPhone, kitsEnabled }: QuotePageIslandProps) {
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const lines = useQuote((state) => state.lines);
  const setQuantity = useQuote((state) => state.setQuantity);
  const list = useRef<HTMLUListElement>(null);
  const empty = useRef<HTMLAnchorElement>(null);
  const focusIndex = useRef<number | null>(null);

  // Después de quitar, el foco va al «Quitar» que quedó en ese lugar (o al catálogo si se vació).
  useEffect(() => {
    const index = focusIndex.current;
    if (index === null) return;
    focusIndex.current = null;
    const buttons = list.current?.querySelectorAll<HTMLElement>("[data-quote-remove]");
    if (buttons && buttons.length > 0) buttons[Math.min(index, buttons.length - 1)]!.focus();
    else empty.current?.focus();
  }, [lines]);

  const remove = (line: QuoteLine) => {
    const { lines: current, remove: removeLine } = useQuote.getState();
    const index = current.findIndex((l) => l.key === line.key);
    if (index < 0) return;
    focusIndex.current = index;
    removeLine(line.key);
    void showToast(feedback.quote.removed(line.name), {
      id: UNDO_TOAST_ID,
      onAction: () => {
        if (useQuote.getState().lastRemoved?.line.key === line.key)
          useQuote.getState().undoRemove();
      },
    });
  };

  if (!hydrated) {
    return (
      // Solo con JS (clase js en <html>): sin JS nunca termina de cargar; lo explica el <noscript>.
      <p role="status" className="hidden text-muted in-[.js]:block">
        {quotePage.loading}
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-lg font-bold">{feedback.quote.empty.title}</p>
        <p className="text-muted">{feedback.quote.empty.body}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            ref={empty}
            href={quotePage.empty.catalog.href as Route}
            prefetch={false}
            className={buttonVariants()}
          >
            {quotePage.empty.catalog.label}
          </Link>
          {kitsEnabled ? (
            <Link
              href={quotePage.empty.kits.href as Route}
              prefetch={false}
              className={buttonVariants({ variant: "outline" })}
            >
              {quotePage.empty.kits.label}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const whatsapp = whatsappPhone
    ? whatsappUrl(
        whatsappPhone,
        whatsappMessage({ context: "quote", items: lines.map(toWhatsAppItem) }),
      )
    : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start">
      <section aria-labelledby="cotizacion-productos">
        <h2 id="cotizacion-productos" className="text-[length:var(--fs-h3)]">
          {quotePage.listTitle}{" "}
          <span className="font-normal text-muted">({quoteDrawer.summary(lines.length)})</span>
        </h2>
        <ul ref={list} aria-label={quoteDrawer.listLabel} className="mt-2">
          {lines.map((line) => (
            <QuoteLineItem
              key={line.key}
              line={line}
              onQuantity={setQuantity}
              onRemove={remove}
              onNavigate={() => {}}
            />
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="cotizacion-datos"
        className="rounded-lg border-2 border-line bg-paper p-5 sm:p-6"
      >
        <h2 id="cotizacion-datos" className="mb-5 text-[length:var(--fs-h3)]">
          {quotePage.formTitle}
        </h2>
        <QuoteForm departments={departments} lines={lines} whatsappUrl={whatsapp} />
      </section>
    </div>
  );
}
