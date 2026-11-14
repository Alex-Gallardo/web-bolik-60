"use client";

import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import { retryableImport } from "@/components/feedback/feedback-store";
import { buttonVariants } from "@/components/ui/button-variants";
import { catalogPage } from "@/content/catalog";
import {
  activeFilterCount,
  filtersToSearch,
  matchesFilters,
  parseFilters,
  toggleFilter,
  type CatalogFilters as Filters,
  type FilterableItem,
  type FilterKey,
} from "@/features/catalog/filters";
import { FilterGroups, type FilterOptions } from "./catalog-filter-groups";
import type { CatalogFiltersSheetProps } from "./catalog-filters-sheet";

// El Sheet (Radix Dialog, ~10 KB) se descarga al primer toque de «Filtros», como el menú móvil.
const loadSheet = retryableImport(() => import("./catalog-filters-sheet"));

// La URL es el estado de los filtros: useSyncExternalStore la lee (en el servidor, sin filtros) y
// writeSearch la cambia con replaceState y avisa a quien la lee.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
};
const readSearch = () => window.location.search;
const readSearchOnServer = () => "";
function writeSearch(search: string) {
  const { pathname, hash } = window.location;
  // null: así el router de Next sincroniza su estado con la URL (con su propio estado, el parche de
  // Next pasa de largo y el router seguiría creyendo que la URL no cambió).
  window.history.replaceState(null, "", `${pathname}${search}${hash}`);
  listeners.forEach((listener) => listener());
}

/**
 * Las navegaciones del router de Next (un <Link> a /productos estando filtrado) cambian la URL sin
 * popstate: useSearchParams sí se entera y avisa a quien lee la URL. Va en su propio Suspense: en
 * el servidor no dibuja nada y la grilla sigue estática.
 */
function RouterSearchListener() {
  const params = useSearchParams();
  useEffect(() => {
    listeners.forEach((listener) => listener());
  }, [params]);
  return null;
}

type CatalogFiltersProps = {
  options: FilterOptions;
  /** Línea, usos y colores de cada producto, con su slug (el data-product de su <li>). */
  items: (FilterableItem & { slug: string })[];
  /** Textos del estado vacío (feedback.catalog.filtersEmpty): los pasa el servidor. */
  empty: { title: string; action: string };
  /** La grilla, del servidor: un <li data-product={slug}> por producto. */
  children: ReactNode;
};

/**
 * Filtros del catálogo (BD-060, docs/06 §3.2). La grilla llega completa del servidor; filtrar solo
 * oculta y muestra sus <li> (atributo hidden): no vuelve a pintar las tarjetas ni pide nada al
 * servidor. Los filtros viven en la URL (?linea=…&uso=…&color=…, replaceState) para compartirla; la
 * canónica sigue siendo /productos. Sin JS no hay filtros (.js-only) y se ve todo.
 */
export function CatalogFilters({ options, items, empty, children }: CatalogFiltersProps) {
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [Panel, setPanel] = useState<ComponentType<CatalogFiltersSheetProps> | null>(null);

  const search = useSyncExternalStore(subscribe, readSearch, readSearchOnServer);
  const filters = useMemo(
    () =>
      parseFilters(search, {
        linea: options.linea.map((o) => o.slug),
        uso: options.uso.map((o) => o.slug),
        color: options.color.map((o) => o.slug),
      }),
    [search, options],
  );
  const matches = useMemo(
    () => new Map(items.map((item) => [item.slug, matchesFilters(item, filters)])),
    [items, filters],
  );
  const visible = [...matches.values()].filter(Boolean).length;

  // Oculta y muestra los <li> de la grilla por su slug (un <li> que no es producto no cuenta).
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>("[data-product]").forEach((item) => {
      item.hidden = matches.get(item.dataset.product ?? "") === false;
    });
  }, [matches]);

  const setFilters = (next: Filters) => writeSearch(filtersToSearch(next, window.location.search));
  const toggle = (key: FilterKey, value: string) => {
    // Desde el primer cambio, las tarjetas que vuelven a aparecer entran con fade (A-22).
    root.current?.setAttribute("data-filtered", "");
    setFilters(toggleFilter(filters, key, value));
  };
  // Los botones «Quitar filtros» desaparecen al pulsarlos: el foco pasa al contador.
  const clear = () => {
    root.current?.setAttribute("data-filtered", "");
    setFilters({});
    counter.current?.focus();
  };
  const active = activeFilterCount(filters);

  const warm = () => void loadSheet().catch(() => {});
  const openSheet = async () => {
    if (!Panel) {
      try {
        const loaded = await loadSheet();
        setPanel(() => loaded.default);
      } catch {
        // Como el menú móvil: con red, archivos viejos de un despliegue (recargar los trae).
        if (navigator.onLine) window.location.reload();
        return;
      }
    }
    setOpen(true);
  };

  return (
    <div ref={root} className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <RouterSearchListener />
      </Suspense>
      <div
        aria-label={catalogPage.filters.label}
        role="region"
        // Fija solo en móvil (una fila: «Filtros»); en escritorio la barra puede tener varias filas
        // y, fija, taparía el foco de las tarjetas (WCAG 2.4.11).
        id="catalogo-filtros"
        className="js-only sticky top-(--header-h) z-10 -mx-(--gutter) border-y-2 border-line bg-paper px-(--gutter) py-3 lg:static"
      >
        <div className="hidden items-start justify-between gap-6 lg:flex">
          <FilterGroups options={options} filters={filters} onToggle={toggle} layout="row" />
          {active > 0 ? (
            <button
              type="button"
              onClick={clear}
              className={buttonVariants({ variant: "link", size: "sm" })}
            >
              {empty.action}
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <button
            ref={button}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => void openSheet()}
            onPointerEnter={warm}
            onFocus={warm}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {catalogPage.filters.open(active)}
          </button>
          {active > 0 ? (
            <button
              type="button"
              onClick={clear}
              className={buttonVariants({ variant: "link", size: "sm" })}
            >
              {empty.action}
            </button>
          ) : null}
        </div>
      </div>

      <p
        ref={counter}
        id="catalogo-contador"
        aria-live="polite"
        tabIndex={-1}
        className="text-sm font-bold text-muted"
      >
        {catalogPage.count(visible)}
      </p>

      {children}

      {visible === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-soft px-6 py-12 text-center">
          <p className="text-lg font-bold text-heading">{empty.title}</p>
          <button type="button" onClick={clear} className={buttonVariants({ variant: "primary" })}>
            {empty.action}
          </button>
        </div>
      ) : null}

      {Panel ? (
        <Panel
          open={open}
          onOpenChange={setOpen}
          returnFocus={() => button.current?.focus()}
          options={options}
          filters={filters}
          onToggle={toggle}
          visible={visible}
        />
      ) : null}
    </div>
  );
}
