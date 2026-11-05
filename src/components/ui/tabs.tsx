"use client";

import { cx } from "class-variance-authority";
import {
  Fragment,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type TabItem = {
  /** Identificador estable (va en los id del DOM): minúsculas y guiones. */
  value: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  /** Nombre de la lista de pestañas para lectores de pantalla. */
  label: string;
  items: TabItem[];
  defaultValue?: string;
  /** Bajo 768 px se vuelve acordeón (docs/08 §2). Con false, pestañas con scroll en todo ancho. */
  accordionOnMobile?: boolean;
  /** Nivel del encabezado de cada sección del acordeón móvil. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
};

const MOBILE = "(max-width: 47.99rem)";
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(MOBILE);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * Pestañas (docs/08 §2, BD-025) con el patrón WAI-ARIA: flechas, Inicio y Fin mueven el foco y
 * eligen; solo la pestaña activa entra en el orden de tabulación.
 *
 * Todo el contenido está en el HTML (SEO y bots que no ejecutan JS, docs/11 §1) y **sin JS se ve
 * todo**: los paneles inactivos solo se ocultan con la clase `js` de <html>, que pone el layout
 * antes de pintar (sin saltos). No usa Radix Tabs: Radix no dibuja (o deja `hidden`) los paneles
 * inactivos.
 *
 * Bajo 768 px es un acordeón con los mismos paneles: encabezados con aria-expanded que solo se ven
 * en móvil (nada se duplica en el HTML) y los paneles pasan de tabpanel a region.
 */
export function Tabs({
  label,
  items,
  defaultValue,
  accordionOnMobile = true,
  headingLevel = 3,
  className,
}: TabsProps) {
  const id = useId();
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);
  // En el acordeón móvil todo empieza cerrado; se abre de a uno.
  const [open, setOpen] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  // En el servidor se asume escritorio: los roles cambian al hidratar, el diseño no.
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => accordionOnMobile && window.matchMedia(MOBILE).matches,
    () => false,
  );
  const Heading = `h${headingLevel}` as const;
  const tabId = (value: string) => `${id}-tab-${value}`;
  const panelId = (value: string) => `${id}-panel-${value}`;
  const headerId = (value: string) => `${id}-header-${value}`;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.value === active);
    const last = items.length - 1;
    const next = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(items[next]!.value);
    tabs.current[next]?.focus();
  };

  return (
    <div data-tabs={accordionOnMobile ? "accordion" : "tabs"} className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={cx(
          "flex gap-1 overflow-x-auto border-b-2 border-line",
          accordionOnMobile && "max-md:hidden",
        )}
      >
        {items.map((item, index) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={selected}
              aria-controls={panelId(item.value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.value)}
              className={cx(
                "-mb-0.5 min-h-11 shrink-0 cursor-pointer border-b-4 px-4 font-bold whitespace-nowrap",
                selected ? "border-blue text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className={cx(accordionOnMobile && "max-md:divide-y-2 max-md:divide-line")}>
        {items.map((item) => {
          const expanded = open === item.value;
          return (
            <Fragment key={item.value}>
              {accordionOnMobile ? (
                <Heading className="text-base md:hidden">
                  <button
                    type="button"
                    id={headerId(item.value)}
                    aria-expanded={expanded}
                    aria-controls={panelId(item.value)}
                    onClick={() => setOpen(expanded ? null : item.value)}
                    className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 py-3 text-start font-bold"
                  >
                    {item.label}
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                      className="accordion-icon size-5 shrink-0"
                      data-open={expanded || undefined}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </Heading>
              ) : null}
              <div
                id={panelId(item.value)}
                {...(mobile
                  ? { role: "region", "aria-labelledby": headerId(item.value) }
                  : { role: "tabpanel", "aria-labelledby": tabId(item.value), tabIndex: 0 })}
                data-tab-panel
                data-active={item.value === active || undefined}
                data-open={expanded || undefined}
                className="py-5"
              >
                {item.content}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
