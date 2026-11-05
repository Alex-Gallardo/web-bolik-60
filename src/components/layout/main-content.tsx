import type { ReactNode } from "react";

/**
 * `<main id="contenido">` (BD-040): destino del enlace «Saltar al contenido». Uno solo por página
 * (lo pone cada layout de grupo y, fuera de los grupos, not-found.tsx y global-error.tsx; las
 * páginas no usan <main>). tabIndex -1: recibe el foco al saltar, sin entrar en el orden de
 * tabulación y sin dibujar un anillo alrededor de toda la página. Costo conocido del patrón: un
 * clic en una zona sin enlaces enfoca el <main> y el siguiente Tab empieza desde su inicio.
 */
export function MainContent({ children }: { children: ReactNode }) {
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="flex flex-1 flex-col focus-visible:shadow-none focus-visible:outline-none"
    >
      {children}
    </main>
  );
}
