import type { ReactNode } from "react";

export type AccordionItemData = {
  /** id del <details> (anclas: /preguntas-frecuentes#envios). Minúsculas y guiones. */
  id?: string;
  title: string;
  content: ReactNode;
};

type AccordionProps = {
  items: AccordionItemData[];
  /**
   * Con un nombre, abre de a uno (atributo `name` de <details>). Sin él, se pueden abrir varios.
   * Debe ser único en la página.
   */
  exclusive?: string;
  className?: string;
};

/**
 * Acordeón (docs/08 §2, BD-025) con <details> nativo, sin JavaScript: el contenido cerrado está
 * en el HTML (BD-110, docs/11 §1), funciona sin JS, la búsqueda del navegador lo abre y el teclado
 * viene de fábrica. Server Component: 0 KB de JS. Ícono + que rota a × (A-35); la apertura se
 * anima donde el navegador soporta ::details-content (en los demás, abre al instante).
 */
export function Accordion({ items, exclusive, className }: AccordionProps) {
  return (
    <div className={`divide-y-2 divide-line border-y-2 border-line ${className ?? ""}`}>
      {items.map((item, index) => (
        <details
          key={item.id ?? index}
          id={item.id}
          name={exclusive}
          className="accordion-item group"
        >
          {/* Sin encabezado dentro: <summary> es un botón y oculta el rol de sus hijos. */}
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg leading-snug font-bold [&::-webkit-details-marker]:hidden">
            {item.title}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              className="accordion-icon size-5 shrink-0 text-accent-text"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <div className="pb-5 text-muted">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
