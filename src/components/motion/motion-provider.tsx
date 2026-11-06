"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";

// Las funciones de Motion se descargan aparte, al montarse el provider (nunca en el JS inicial de
// una página que no lo usa). import() con ruta fija: el bundler crea un chunk por archivo.
const loadAnimation = () => import("./motion-features").then((mod) => mod.default);
const loadLayout = () => import("./motion-features-layout").then((mod) => mod.default);

type MotionProviderProps = {
  children: ReactNode;
  /**
   * Animaciones de layout (FLIP, prop `layout`): solo la grilla filtrable (A-22). Pesa más. Fijo
   * por instancia: LazyMotion carga sus funciones una vez (si cambia, el provider se vuelve a montar).
   */
  layout?: boolean;
};

/** «Simular movimiento reducido» de /styleguide (data-reduced-motion en <html>). */
function subscribeSimulated(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-reduced-motion"],
  });
  return () => observer.disconnect();
}
const isSimulated = () => document.documentElement.hasAttribute("data-reduced-motion");

/**
 * Motion diferido (BD-045, docs/09 §7). Envuelve **solo** lo que anima con Motion (drawer de la
 * cotización, grilla filtrable), nunca el layout. Dentro se usa `m.*` (con `strict`, `motion.*`
 * lanza un error en desarrollo; en producción lo frena la regla de ESLint) y los presets de
 * `@/lib/motion`.
 *
 * Movimiento reducido: `reducedMotion="user"` hace que Motion deje solo la opacidad cuando el
 * sistema lo pide (la regla del sitio); el interruptor de /styleguide lo fuerza con "always".
 */
export function MotionProvider({ children, layout = false }: MotionProviderProps) {
  const simulated = useSyncExternalStore(subscribeSimulated, isSimulated, () => false);
  return (
    <LazyMotion
      key={layout ? "layout" : "animation"}
      features={layout ? loadLayout : loadAnimation}
      strict
    >
      <MotionConfig reducedMotion={simulated ? "always" : "user"}>{children}</MotionConfig>
    </LazyMotion>
  );
}
