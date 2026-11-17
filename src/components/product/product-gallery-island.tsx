"use client";

import { useEffect } from "react";

/**
 * Mejoras de la galería de la ficha (BD-062), sobre el HTML del servidor (product-gallery.tsx):
 * - las miniaturas desplazan la tira en su lugar (sin saltar la página) y marcan la actual;
 * - al deslizar con el dedo, la miniatura actual se actualiza;
 * - con mouse, el zoom (gallery-zoom.ts, descargado al primer movimiento sobre la galería);
 * - pide las primeras fotos de los otros colores (data-preload).
 * No dibuja nada: sin JS, las miniaturas siguen funcionando como enlaces.
 */
export function ProductGalleryIsland({ galleryId }: { galleryId: string }) {
  useEffect(() => {
    const gallery = document.getElementById(galleryId);
    if (!gallery) return;
    const controller = new AbortController();
    const { signal } = controller;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Primeras fotos de los otros colores: ya hidratada la página, para que el cambio no quede en
    // blanco sin competir con la LCP (product-gallery.tsx).
    for (const image of gallery.querySelectorAll<HTMLImageElement>("img[data-preload]")) {
      image.loading = "eager";
    }

    const markCurrent = (set: Element, index: number) => {
      set.querySelectorAll("[data-thumb]").forEach((thumb, i) => {
        if (i === index) thumb.setAttribute("aria-current", "true");
        else thumb.removeAttribute("aria-current");
      });
    };

    gallery.addEventListener(
      "click",
      (event) => {
        const thumb = (event.target as Element).closest<HTMLAnchorElement>("[data-thumb]");
        if (!thumb) return;
        const slide = document.getElementById(thumb.hash.slice(1));
        const track = slide?.parentElement;
        const set = thumb.closest(".gallery-set");
        if (!slide || !track || !set) return;
        event.preventDefault();
        track.scrollTo({ left: slide.offsetLeft, behavior: reduced.matches ? "auto" : "smooth" });
        markCurrent(set, [...track.children].indexOf(slide));
      },
      { signal },
    );

    for (const track of gallery.querySelectorAll<HTMLElement>(".gallery-track")) {
      let frame = 0;
      track.addEventListener(
        "scroll",
        () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const set = track.closest(".gallery-set");
            if (set) markCurrent(set, Math.round(track.scrollLeft / track.clientWidth));
          });
        },
        { passive: true, signal },
      );
    }

    // Zoom con mouse (gallery-zoom.ts): se descarga al primer movimiento sobre la galería.
    let zoomRequested = false;
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      gallery.addEventListener(
        "pointermove",
        (event) => {
          // Solo con mouse: un dedo en una pantalla táctil no descarga el zoom.
          if (event.pointerType !== "mouse" || zoomRequested) return;
          zoomRequested = true;
          void import("./gallery-zoom")
            .then(({ attachZoom }) => {
              if (!signal.aborted) attachZoom(gallery, signal);
            })
            .catch(() => {}); // sin el módulo (otro despliegue o sin red), sin zoom
        },
        { signal },
      );
    }
    return () => controller.abort();
  }, [galleryId]);

  return null;
}
