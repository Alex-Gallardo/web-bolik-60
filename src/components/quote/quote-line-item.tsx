"use client";

import type { Route } from "next";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { quoteDrawer as t } from "@/content/quote";
import type { QuoteLine } from "@/features/quote/lines";
import { PACKAGING_LABELS } from "@/lib/constants";

/** Si animationend no llega (pestaña en segundo plano), la línea se quita igual. */
const LEAVE_FALLBACK_MS = 400;

type QuoteLineItemProps = {
  line: QuoteLine;
  onQuantity: (key: string, quantity: number) => void;
  /** Al terminar la salida (A-36): el drawer la quita del store y muestra «Deshacer». */
  onRemove: (line: QuoteLine) => void;
  /** Cierra el drawer al ir a la ficha (no con Ctrl+clic: se abre aparte). */
  onNavigate: (event: MouseEvent) => void;
};

/**
 * Una línea del drawer (BD-071): foto, nombre (enlace a la ficha), detalle, presentación, cantidad
 * y «Quitar». Al quitar sale con A-36 en CSS (opacidad y desplazamiento a la derecha; con
 * movimiento reducido, solo opacidad) y al terminar se quita del store: Motion pesaría ≈ 50 KB y el
 * drawer tiene un tope de 30 KB al abrirse (docs/09 §7).
 */
export function QuoteLineItem({ line, onQuantity, onRemove, onNavigate }: QuoteLineItemProps) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const quantityId = useId();
  const pack = line.packaging ? PACKAGING_LABELS[line.packaging] : null;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onRemove(line);
  };

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(finish, LEAVE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
    // finish cambia en cada render; el temporizador solo depende de que empiece la salida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  return (
    <li
      data-quote-line={line.key}
      className={leaving ? "quote-line-leave" : undefined}
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) finish();
      }}
    >
      <div className="flex gap-4 border-b-2 border-line py-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-soft">
          {line.image ? (
            // Atributos de next/image sin el componente (como ProductCard). Decorativa: el nombre
            // va al lado.
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              {...getImageProps({ src: line.image, alt: "", width: 64, height: 64 }).props}
              className="size-full object-contain p-1"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <Link
              href={line.url as Route}
              prefetch={false}
              onClick={onNavigate}
              className="font-bold text-ink"
            >
              {line.name}
            </Link>
            {line.detail ? <p className="text-sm text-muted">{line.detail}</p> : null}
            {pack ? <p className="text-sm text-muted">{pack.singular}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={quantityId} className="sr-only">
              {t.quantity(line.name)}
            </label>
            <QuantityStepper
              id={quantityId}
              value={line.quantity}
              onChange={(quantity) => onQuantity(line.key, quantity)}
            />
            <button
              type="button"
              data-quote-remove
              aria-label={t.removeLabel(line.detail ? `${line.name} ${line.detail}` : line.name)}
              aria-disabled={leaving || undefined}
              onClick={() => setLeaving(true)}
              className="min-h-11 min-w-11 cursor-pointer rounded-md px-2 font-bold text-blue underline underline-offset-4 hover:bg-soft"
            >
              {t.remove}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
