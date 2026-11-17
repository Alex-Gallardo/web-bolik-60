"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Script en línea que corre antes del primer pintado (filtros del catálogo, color de la ficha).
 * Solo va en el HTML del servidor: al hidratar se conserva el que ya corrió y después se quita. En
 * una navegación del sitio no se dibuja: React no ejecuta un <script> que crea en el navegador (y
 * en desarrollo avisa en consola); ahí la isla que lo usa lee la URL al montar. Va dentro de una
 * isla que ya existe, así no suma un archivo de JS a la página (docs/12 §2).
 */
export function PrepaintScript({ code }: { code: string }) {
  // false en el servidor y al hidratar; true en el navegador (incluida una navegación).
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return hydrated ? null : <script dangerouslySetInnerHTML={{ __html: code }} />;
}
