"use client";

import { usePathname } from "next/navigation";
import { Suspense, useLayoutEffect, useRef } from "react";

type OnRouteChangeProps = {
  /** Corre antes de pintar cuando cambia la ruta (no los filtros de la URL); nunca al montarse. */
  onChange: (pathname: string) => void;
};

function Listener({ onChange }: OnRouteChangeProps) {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const callback = useRef(onChange);
  useLayoutEffect(() => {
    callback.current = onChange;
  });
  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    callback.current(pathname);
  }, [pathname]);
  return null;
}

/**
 * Avisa cuando cambia la ruta, sin atar nada más a ella (BD-044). Con Cache Components,
 * `usePathname` se suspende en rutas con parámetros que no conoce el build (fallback params) y,
 * sin un Suspense encima, el build falla. Aquí la lectura vive sola en su propio Suspense
 * (fallback vacío): quien lo usa (contenido de la página, menús del header) nunca queda como
 * fallback del armazón estático.
 */
export function OnRouteChange(props: OnRouteChangeProps) {
  return (
    <Suspense fallback={null}>
      <Listener {...props} />
    </Suspense>
  );
}
