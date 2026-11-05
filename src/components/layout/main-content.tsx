import type { ReactNode } from "react";

/**
 * `<main id="contenido">` (BD-040): destino del enlace «Saltar al contenido». Uno solo por página
 * (lo pone cada layout de grupo; las páginas no usan <main>). tabIndex -1: recibe el foco al
 * saltar, sin entrar en el orden de tabulación y sin dibujar un anillo alrededor de toda la página.
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
