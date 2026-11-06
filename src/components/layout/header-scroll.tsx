"use client";

import { useEffect } from "react";

/** Pasados estos píxeles el header se compacta (docs/09 A-07). */
const THRESHOLD = 80;

/**
 * Pone `data-scrolled` en <html> cuando la página bajó más de 80 px (BD-041). Sin estado de React:
 * el CSS de .site-header (motion.css) hace el resto con transform y opacidad, sin mover el diseño.
 */
export function HeaderScroll() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.toggleAttribute("data-scrolled", window.scrollY > THRESHOLD);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      root.removeAttribute("data-scrolled");
    };
  }, []);
  return null;
}
