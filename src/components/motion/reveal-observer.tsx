"use client";

import { useEffect } from "react";

const PENDING = "[data-reveal]:not([data-revealed])";

/** Los `[data-reveal]` pendientes de un nodo agregado (él mismo y sus descendientes). */
function pendingIn(node: Node): Element[] {
  if (!(node instanceof Element)) return [];
  const self = node.matches(PENDING) ? [node] : [];
  return node.firstElementChild ? [...self, ...node.querySelectorAll(PENDING)] : self;
}

/**
 * Reveals al hacer scroll (A-21, BD-044, docs/09 §6). Uno solo, en el layout del sitio: un
 * IntersectionObserver para todos los `[data-reveal]` (marcado: `data-reveal` y `--i` para el
 * escalonado) y les pone `data-revealed` al entrar en pantalla; el CSS (motion.css) hace el resto.
 *
 * - El CSS solo oculta con `data-reveal-ready` en <html>, que se pone aquí después de revelar lo
 *   que ya está en pantalla o arriba: sin JS, mientras carga o si algo falla, todo se ve.
 * - Lo ya visible se revela con `data-revealed="instant"`, sin transición: no se anima lo que el
 *   visitante ya está viendo (y no se suma a la entrada de página A-02).
 * - Lo que llega después (otra página, una grilla filtrada) lo toma un MutationObserver antes de
 *   pintarse, con la misma regla.
 * - Lo que recibe el foco (Tab) se revela en el acto: un enlace enfocado nunca queda invisible.
 * - Sin IntersectionObserver no se oculta nada.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    // Primero se mide todo y después se escribe (sin forzar el layout en cada vuelta).
    const track = (elements: Element[]) => {
      const tops = elements.map((el) => el.getBoundingClientRect().top);
      elements.forEach((el, i) => {
        if (tops[i]! < window.innerHeight) el.setAttribute("data-revealed", "instant");
        else io.observe(el);
      });
    };
    track(Array.from(document.querySelectorAll(PENDING)));
    const mo = new MutationObserver((records) => {
      const added: Element[] = [];
      for (const record of records)
        record.addedNodes.forEach((node) => added.push(...pendingIn(node)));
      if (added.length) track(added);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const onFocus = (event: FocusEvent) => {
      const hidden = (event.target as Element | null)?.closest?.(PENDING);
      if (!hidden) return;
      hidden.setAttribute("data-revealed", "instant");
      io.unobserve(hidden);
    };
    document.addEventListener("focusin", onFocus);
    root.setAttribute("data-reveal-ready", "");
    return () => {
      mo.disconnect();
      io.disconnect();
      document.removeEventListener("focusin", onFocus);
      root.removeAttribute("data-reveal-ready");
    };
  }, []);

  return null;
}
