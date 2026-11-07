"use client";

import { PAGE_ID } from "@/components/layout/page-id";
import { OnRouteChange } from "./on-route-change";

/** Se reexporta: el layout y las pruebas lo importan de aquí. */
export { PAGE_ID };

/** Reinicia `.page-enter` en el contenedor; al terminar se quita (no deja transform ni capa). */
function restart() {
  const el = document.getElementById(PAGE_ID);
  if (!el) return;
  el.classList.remove("page-enter");
  void el.offsetWidth; // reinicia la animación aunque ya tuviera la clase
  el.classList.add("page-enter");
  el.addEventListener("animationend", () => el.classList.remove("page-enter"), { once: true });
}

/**
 * Entrada de página (A-02, BD-044, docs/09 §4). Va junto al contenedor de la página en
 * `(site)/layout.tsx` y, cada vez que cambia la ruta (no los filtros de la URL), anima `.page-enter`
 * antes de pintar.
 * - La primera carga no se anima (no retrasa el LCP); sin JS, nunca.
 * - No envuelve la página: el contenedor lo pinta el servidor y aquí solo se escucha la ruta
 *   (OnRouteChange), así el contenido no depende de `usePathname`.
 * - No es un template.tsx: la plantilla de (site) solo se vuelve a montar cuando cambia el primer
 *   segmento, y /productos/a → /productos/b no entraría con A-02.
 */
export function PageEnter() {
  return <OnRouteChange onChange={restart} />;
}
