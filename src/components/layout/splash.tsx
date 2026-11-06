import { Logo } from "@/components/brand/logo";

/**
 * Splash de bienvenida (BD-043, docs/09 §3, A-01). Server Component sin JS: lo muestra y lo quita
 * el script de <head> (app/head-script.ts) con `data-splash` en <html>; el CSS (motion.css) lo anima.
 * Va al inicio de <body>: el contenido real se pinta debajo desde el primer frame (no cambia SEO
 * ni LCP). Decorativo (`aria-hidden`).
 *
 * Marca: el wordmark oficial BOLIK® en blanco sobre navy (docs/02: no hay isotipo aprobado, por eso
 * no lleva el «cuadro azul» del starter) y un trazo de tinta amarilla que se dibuja debajo. Sin
 * texto ni <img>: un SVG en línea no compite como elemento LCP.
 */
export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash__inner">
        <Logo variant="wordmark" width={240} className="splash__word" />
        <svg className="splash__ink" viewBox="0 0 240 24" width="240" height="24" focusable="false">
          <path d="M8 15C56 5 104 21 152 12s64-6 80-2" pathLength={1} />
        </svg>
      </div>
    </div>
  );
}
