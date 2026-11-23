"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type MouseEvent } from "react";
import { OnRouteChange } from "@/components/motion/on-route-change";
import type { SearchDialogProps } from "@/components/search/search-dialog";
import { headerText } from "@/content/header";

/** ¿Escribiendo en un campo? Ahí «/» es una barra, no el atajo. */
const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * «Buscar» del header (BD-066): un enlace a /buscar (sin JS, o con Ctrl+clic) que, con JS, abre el
 * buscador instantáneo; también con «/» y Ctrl+K (Cmd+K en Mac). El diálogo, Fuse y el índice se
 * descargan al primer uso: aquí solo va el escucha del atajo (docs/12 §2). En /buscar el enlace
 * navega (el buscador ya está en la página).
 */
export function SearchLink({ whatsappUrl }: { whatsappUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [Dialog, setDialog] = useState<ComponentType<SearchDialogProps> | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const link = useRef<HTMLAnchorElement>(null);
  /** Abierto (ref: el escucha del teclado se registra una vez). */
  const isOpen = useRef(false);

  const setOpenState = (next: boolean) => {
    isOpen.current = next;
    setOpen(next);
  };

  const openSearch = async () => {
    // Ya abierto (Ctrl+K dentro del diálogo): solo vuelve al campo; no se pisa a quién devolver el
    // foco al cerrar.
    if (isOpen.current) {
      document
        .querySelector<HTMLInputElement>('[data-search-dialog] input[type="search"]')
        ?.focus();
      return;
    }
    if (window.location.pathname === headerText.search.href) {
      document.querySelector<HTMLInputElement>('main input[type="search"]')?.focus();
      return;
    }
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement ? active : null;
    try {
      const loaded = await import("@/components/search/search-dialog");
      setDialog(() => loaded.default);
      setOpenState(true);
    } catch {
      // Sin red o archivos de otro despliegue: /buscar funciona sin JS.
      window.location.assign(headerText.search.href);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const k = event.key.toLowerCase();
      const shortcut =
        (k === "/" &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !typingIn(event.target)) ||
        (k === "k" && (event.ctrlKey || event.metaKey) && !event.altKey);
      if (!shortcut) return;
      event.preventDefault();
      void openSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Un solo escucha: openSearch solo usa refs y setters estables (lo de cada render no cambia).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (window.location.pathname === headerText.search.href) return;
    event.preventDefault();
    void openSearch();
  };

  const returnFocus = () => {
    const target = opener.current;
    (target?.isConnected && target !== document.body ? target : link.current)?.focus();
  };

  return (
    <>
      <Link
        ref={link}
        href={headerText.search.href as Route}
        prefetch={false}
        aria-label={headerText.search.label}
        aria-haspopup="dialog"
        aria-keyshortcuts="/ Control+K Meta+K"
        data-event="search_open"
        onClick={onClick}
        className="grid size-11 place-items-center rounded-md text-ink hover:bg-soft"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      </Link>
      {/* Un resultado lleva a otra página: el diálogo se cierra. */}
      <OnRouteChange onChange={() => setOpenState(false)} />
      {Dialog ? (
        <Dialog
          open={open}
          onOpenChange={setOpenState}
          returnFocus={returnFocus}
          whatsappUrl={whatsappUrl}
        />
      ) : null}
    </>
  );
}
