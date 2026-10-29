"use client";

/**
 * Activa los reveals de scroll (A-21) para TODOS los elementos con [data-reveal].
 * Un solo IntersectionObserver para toda la página (barato), montado una vez en el layout.
 *
 * Marcado:  <div data-reveal style={{ "--i": 2 } as React.CSSProperties}>…</div>
 * El CSS (motion.css) oculta solo si <html> tiene la clase "js" y el elemento no tiene
 * data-revealed. Sin JS, el contenido siempre es visible (SEO y accesibilidad).
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-revealed", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    // Red de seguridad: si algo no se observó (p. ej. pestaña en segundo plano), mostrar todo a los 2.5 s
    const safety = window.setTimeout(() => els.forEach((el) => el.setAttribute("data-revealed", "")), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [pathname]);

  return null;
}
