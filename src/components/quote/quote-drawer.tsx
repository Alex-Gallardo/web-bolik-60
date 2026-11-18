"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { showToast } from "@/components/feedback/feedback-store";
import { OnRouteChange } from "@/components/motion/on-route-change";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { feedback } from "@/content/feedback";
import { quoteDrawer as t } from "@/content/quote";
import type { QuoteLine } from "@/features/quote/lines";
import { useQuote } from "@/features/quote/store";
import { QuoteLineItem } from "./quote-line-item";

export type QuoteDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Devuelve el foco a lo que abrió el drawer (no hay Trigger de Radix). */
  returnFocus: () => void;
};

/** Hacia dónde va el foco después de quitar (el «Quitar» que quedó en ese lugar) o deshacer. */
type FocusTarget = { index: number } | { key: string };

/** La línea quitada y el lugar que ocupaba, para «Deshacer» y para devolver el foco. */
type Removed = { line: QuoteLine; index: number };

/** Lo que dura «Deshacer»: lo mismo que un toast con acción (docs/08 §4, toastDuration). */
const UNDO_MS = 6000;

/** Mismo id para todos: un toast nuevo de «Quitamos…» reemplaza al anterior. */
const UNDO_TOAST_ID = "quote-removed";

/** Ctrl, Cmd, Shift, Alt o la rueda: el enlace se abre aparte y el drawer sigue abierto. */
const opensElsewhere = (event: MouseEvent) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

/**
 * Drawer «Mi cotización» (BD-071, docs/06 §2 y §3.16): Sheet con CSS (A-08), abajo en móvil y a
 * la derecha desde md. Editar cantidades (inline, sin toast: docs/08 §4), quitar con «Deshacer» e
 * ir a /cotizacion a enviarla. Lo descarga QuoteLinkWithDrawer (header) al primer uso, con zustand
 * y Radix: abrirlo no carga más de 30 KB.
 *
 * «Deshacer» va dentro del drawer y no en un toast: con el Sheet abierto (modal), Radix deja el
 * resto de la página inerte (sin clics, fuera del foco y oculto al lector de pantalla), y el toast
 * vive ahí. Mismo texto (`quote.removed`) y misma duración (6 s), que se detiene mientras el
 * puntero o el foco están en el aviso (WCAG 2.2.1). Si el drawer se cierra con el aviso a la vista
 * (Escape, un enlace, cambio de ruta), pasa a un toast para no perder el «Deshacer».
 */
export default function QuoteDrawer({ open, onOpenChange, returnFocus }: QuoteDrawerProps) {
  const lines = useQuote((state) => state.lines);
  const setQuantity = useQuote((state) => state.setQuantity);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [paused, setPaused] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const empty = useRef<HTMLAnchorElement>(null);
  const notice = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<FocusTarget | null>(null);
  const removedMessage = removed ? feedback.quote.removed(removed.line.name) : null;

  const focusAt = (target: FocusTarget) => {
    if ("key" in target) {
      const items = list.current?.querySelectorAll<HTMLElement>("[data-quote-line]") ?? [];
      const item = [...items].find((el) => el.dataset.quoteLine === target.key);
      item?.querySelector<HTMLElement>("[data-quote-remove]")?.focus();
      return;
    }
    const buttons = list.current?.querySelectorAll<HTMLElement>("[data-quote-remove]");
    if (buttons && buttons.length > 0) buttons[Math.min(target.index, buttons.length - 1)]!.focus();
    else empty.current?.focus();
  };

  // Después de quitar o deshacer, el foco va a su lugar cuando la lista ya cambió.
  useEffect(() => {
    const target = focusTarget.current;
    if (target === null) return;
    focusTarget.current = null;
    focusAt(target);
  }, [lines]);

  // El aviso se va a los 6 s, salvo mientras el puntero o el foco están en él. Si se va con el
  // foco dentro, el foco pasa al «Quitar» que quedó en ese lugar.
  useEffect(() => {
    if (!removed || paused) return;
    const timer = window.setTimeout(() => {
      if (notice.current?.contains(document.activeElement)) focusAt({ index: removed.index });
      setRemoved(null);
    }, UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [removed, paused]);

  // Se cierra (Escape, el fondo, un enlace, «Seguir viendo productos» o un cambio de ruta) con el
  // aviso a la vista: «Deshacer» sigue en un toast. Solo repone esa línea; si después se quitó
  // otra, el toast nuevo reemplaza a este (mismo id).
  const handleOpenChange = (next: boolean) => {
    if (!next && removed) {
      const key = removed.line.key;
      void showToast(feedback.quote.removed(removed.line.name), {
        id: UNDO_TOAST_ID,
        onAction: () => {
          if (useQuote.getState().lastRemoved?.line.key === key) useQuote.getState().undoRemove();
        },
      });
      setRemoved(null);
      setPaused(false);
    }
    onOpenChange(next);
  };

  const close = (event: MouseEvent) => {
    if (!opensElsewhere(event)) handleOpenChange(false);
  };

  const remove = (line: QuoteLine) => {
    const { lines: current, remove: removeLine } = useQuote.getState();
    const index = current.findIndex((l) => l.key === line.key);
    // Ya no estaba (otra pestaña la quitó): nada que deshacer.
    if (index < 0) return;
    focusTarget.current = { index };
    removeLine(line.key);
    setRemoved({ line, index });
  };

  const undo = () => {
    if (!removed) return;
    const before = useQuote.getState().lines.length;
    useQuote.getState().undoRemove();
    // Si no se pudo reponer (ya estaba otra vez o la lista llegó a 50), la lista no cambia y el
    // foco no puede quedarse en un botón que desaparece.
    if (useQuote.getState().lines.length > before) focusTarget.current = { key: removed.line.key };
    else focusAt({ index: removed.index });
    setRemoved(null);
    setPaused(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* Cambió la ruta (Atrás, Adelante): se cierra por el mismo camino, sin perder «Deshacer». */}
      <OnRouteChange onChange={() => open && handleOpenChange(false)} />
      <SheetContent
        data-quote-drawer
        title={t.title}
        description={lines.length > 0 ? t.summary(lines.length) : undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
        footer={
          lines.length > 0 ? (
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link href={t.send.href as Route} prefetch={false} onClick={close}>
                  {t.send.label}
                </Link>
              </Button>
              <p className="text-center text-sm text-muted">{t.note}</p>
              <SheetClose asChild>
                <Button variant="outline" className="w-full">
                  {t.keepBrowsing}
                </Button>
              </SheetClose>
            </div>
          ) : undefined
        }
      >
        {/* Región viva siempre montada: así el lector de pantalla anuncia el aviso al aparecer. */}
        <div role="status">
          {removedMessage ? (
            <div
              ref={notice}
              data-quote-undo
              onPointerEnter={() => setPaused(true)}
              onPointerLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              className="notice-in mb-4 flex items-center justify-between gap-3 rounded-lg border-2 border-s-4 border-line border-s-info bg-soft px-4 py-2"
            >
              <span className="font-bold">{removedMessage.title}</span>
              <button
                type="button"
                onClick={undo}
                className="min-h-11 min-w-11 cursor-pointer rounded-md px-2 font-bold text-blue underline underline-offset-4 hover:bg-paper"
              >
                {removedMessage.action}
              </button>
            </div>
          ) : null}
        </div>
        {lines.length > 0 ? (
          <ul ref={list} aria-label={t.listLabel}>
            {lines.map((line) => (
              <QuoteLineItem
                key={line.key}
                line={line}
                onQuantity={setQuantity}
                onRemove={remove}
                onNavigate={close}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 py-4">
            <p className="text-lg font-bold">{feedback.quote.empty.title}</p>
            <p className="text-muted">{feedback.quote.empty.body}</p>
            <Button asChild variant="outline">
              <Link ref={empty} href={t.catalog.href as Route} prefetch={false} onClick={close}>
                {t.catalog.label}
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
