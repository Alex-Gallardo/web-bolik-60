import { zoomScale } from "@/lib/zoom";

/**
 * Zoom de la galería con mouse (BD-062): la foto se amplía hacia el puntero lo que da su
 * resolución (lib/zoom.ts, en píxeles CSS: ~1.3x con las de 750 px, 2x con las grandes) y, con la
 * foto ya cargada, se pide el archivo del srcset que haga falta (process-image nunca agranda; antes
 * de cargar no, para no competir con la LCP). Solo transform (motion.css). La isla lo descarga al
 * primer movimiento del mouse sobre la galería: en móvil no se baja (docs/12 §2). Solo con mouse:
 * un dedo en una pantalla táctil desliza la tira, no amplía. Mide en cada entrada (un conjunto
 * oculto no tiene ancho hasta que se elige su color) y guarda la caja hasta salir.
 */
export function attachZoom(gallery: HTMLElement, signal: AbortSignal) {
  const boxes = new WeakMap<HTMLElement, DOMRect>();

  const measure = (slide: HTMLElement) => {
    const image = slide.querySelector<HTMLImageElement>("img");
    if (!image) return;
    // El sizes de la página, para volver a él si la foto deja de poder ampliarse.
    image.dataset.sizes ??= image.sizes;
    const scale = zoomScale(Number(slide.dataset.zoom), image.clientWidth);
    if (!scale) {
      slide.removeAttribute("data-zoomable");
      slide.style.removeProperty("--zoom-scale");
      image.sizes = image.dataset.sizes;
      return;
    }
    slide.style.setProperty("--zoom-scale", String(scale));
    slide.setAttribute("data-zoomable", "");
    if (image.complete && image.naturalWidth > 0) {
      image.sizes = `${Math.ceil(image.clientWidth * scale)}px`;
    }
    boxes.set(slide, slide.getBoundingClientRect());
  };

  gallery.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      const slide = (event.target as Element).closest<HTMLElement>(".gallery-slide[data-zoom]");
      if (!slide) return;
      if (!slide.hasAttribute("data-measured")) {
        slide.setAttribute("data-measured", "");
        measure(slide);
      }
      const box = boxes.get(slide);
      if (!box || !slide.hasAttribute("data-zoomable")) return;
      slide.style.setProperty("--zoom-x", `${((event.clientX - box.left) / box.width) * 100}%`);
      slide.style.setProperty("--zoom-y", `${((event.clientY - box.top) / box.height) * 100}%`);
      slide.setAttribute("data-zoomed", "");
    },
    { signal },
  );
  // Al salir se suelta y se vuelve a medir en la próxima entrada (la página pudo moverse).
  gallery.addEventListener(
    "pointerout",
    (event) => {
      const slide = (event.target as Element).closest<HTMLElement>(".gallery-slide[data-zoom]");
      const next = (event.relatedTarget as Element | null)?.closest(".gallery-slide");
      if (slide && next !== slide) {
        slide.removeAttribute("data-zoomed");
        slide.removeAttribute("data-measured");
        boxes.delete(slide);
      }
    },
    { signal },
  );
}
