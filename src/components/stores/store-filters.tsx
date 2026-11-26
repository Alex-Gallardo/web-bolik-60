"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { PrepaintScript } from "@/components/ui/prepaint-script";
import { Select } from "@/components/ui/select";
import { feedback } from "@/content/feedback";
import { storesPage } from "@/content/stores";
import { track } from "@/features/analytics/track";
import {
  STORES_PATH,
  departmentFromHash,
  matchesStoreName,
  normalizeStoreSearch,
} from "@/features/stores/directory";

/** El selector cambia el hash con replaceState: no dispara hashchange ni crea historial. */
function writeHash(slug: string | undefined) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}${slug ? `#${slug}` : ""}`);
}

type Department = { slug: string; name: string };

type StoreFiltersProps = {
  /** Departamentos con tiendas, en el orden de la lista (las opciones del selector). */
  departments: Department[];
  /** Todos los departamentos: uno sin tiendas que llega en el hash (desde la home) tiene su aviso. */
  allDepartments: Department[];
  /** Cada tienda (el data-store-item de su <li>) con su departamento y su nombre. */
  stores: { slug: string; department: string; name: string }[];
  /** La lista del servidor: un [data-store-group] por departamento y un [data-store-item] por tienda. */
  children: ReactNode;
  /** features/stores/prepaint-script.ts: va justo después de la lista. */
  prepaintScript: string;
};

/**
 * Filtros de /donde-comprar (BD-080, docs/06 §3.7). La lista llega completa del servidor; filtrar
 * solo oculta y muestra grupos y tiendas (atributo hidden), como el catálogo. Sin JS, el selector
 * es un formulario GET que el proxy lleva al grupo del departamento (#slug) y la búsqueda por
 * nombre no aparece (.js-only).
 *
 * El departamento se guarda en el hash (#quetzaltenango): lo cambian el selector, los enlaces por
 * departamento y el formulario de la home. Solo un hash que es un departamento (o ninguno) cambia
 * el filtro: «Volver arriba» (#top) o «Saltar al contenido» no lo quitan. Un departamento sin
 * tiendas deja la lista completa con su aviso. El cambio en el selector registra `store_filter`.
 */
export function StoreFilters({
  departments,
  allDepartments,
  stores,
  children,
  prepaintScript,
}: StoreFiltersProps) {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);
  const selectId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");
  // En el servidor y al hidratar, sin departamento (todos), como el HTML.
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const slugs = useMemo(() => departments.map((d) => d.slug), [departments]);
  const allSlugs = useMemo(() => allDepartments.map((d) => d.slug), [allDepartments]);
  // Un departamento sin tiendas no filtra: se ve todo, con su aviso.
  const department = selected && slugs.includes(selected) ? selected : undefined;
  const withoutStores =
    selected && !department ? allDepartments.find((d) => d.slug === selected) : undefined;
  const departmentName = departments.find((d) => d.slug === department)?.name;

  // El hash al cargar y en cada cambio (enlaces, atrás y adelante). Al seguir un enlace a un grupo
  // que estaba oculto, el navegador no baja: se baja aquí en el cuadro siguiente, ya visible, y el
  // foco pasa a su título (el siguiente Tab entra al grupo).
  useEffect(() => {
    const sync = (fromLink: boolean) => {
      const hash = window.location.hash;
      if (hash === "" || hash === "#") {
        setSelected(undefined);
        return;
      }
      const slug = departmentFromHash(hash, allSlugs);
      if (!slug) return;
      setSelected(slug);
      if (fromLink && slugs.includes(slug)) {
        requestAnimationFrame(() => {
          document.getElementById(slug)?.scrollIntoView();
          document.getElementById(`${slug}-titulo`)?.focus({ preventScroll: true });
        });
      }
    };
    sync(false);
    const onHashChange = () => sync(true);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [slugs, allSlugs]);

  const normalized = useMemo(
    () => stores.map((store) => ({ ...store, search: normalizeStoreSearch(store.name) })),
    [stores],
  );
  const needle = normalizeStoreSearch(query);
  const matches = useMemo(
    () =>
      new Map(
        normalized.map((store) => [
          store.slug,
          (!department || store.department === department) &&
            matchesStoreName(store.search, needle),
        ]),
      ),
    [normalized, department, needle],
  );
  const visible = [...matches.values()].filter(Boolean).length;

  // Oculta y muestra cada tienda y, sin tiendas visibles, su grupo.
  useEffect(() => {
    const list = root.current;
    if (!list) return;
    list.querySelectorAll<HTMLElement>("[data-store-item]").forEach((item) => {
      item.hidden = matches.get(item.dataset.storeItem ?? "") === false;
    });
    list.querySelectorAll<HTMLElement>("[data-store-group]").forEach((group) => {
      group.hidden = !group.querySelector("[data-store-item]:not([hidden])");
    });
  }, [matches]);

  const choose = (value: string) => {
    const next = departmentFromHash(value, slugs);
    setSelected(next);
    writeHash(next);
    track("store_filter", { department: next ?? "todos" });
  };
  // «Quitar filtros» desaparece al pulsarlo: el foco pasa al contador.
  const clear = () => {
    setQuery("");
    if (selected) {
      setSelected(undefined);
      writeHash(undefined);
    }
    counter.current?.focus();
  };

  const empty = feedback.stores.filtersEmpty;
  const none = withoutStores ? feedback.stores.noneInDepartment(withoutStores.name) : null;

  return (
    <div ref={root} className="flex flex-col gap-6">
      <form
        action={STORES_PATH}
        method="get"
        // Con JS el selector filtra al cambiar; el envío (Enter en la búsqueda) no recarga.
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor={selectId} className="font-bold text-heading">
            {storesPage.filters.department}
          </label>
          <Select
            id={selectId}
            name="departamento"
            value={department ?? ""}
            onChange={(event) => choose(event.target.value)}
          >
            <option value="">{storesPage.filters.allDepartments}</option>
            {departments.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="js-only flex flex-1 flex-col gap-2">
          <label htmlFor={searchId} className="font-bold text-heading">
            {storesPage.filters.search}
          </label>
          <Input
            id={searchId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className={buttonVariants({ variant: "primary", className: "no-js-only" })}
        >
          {storesPage.filters.submit}
        </button>
      </form>

      {/* Un solo aviso para el lector de pantalla: el conteo, el vacío o el departamento sin tiendas. */}
      <div role="status" className="flex flex-col gap-3">
        <p ref={counter} tabIndex={-1} className="text-sm font-bold text-muted">
          {storesPage.count(visible, departmentName)}
        </p>
        {none ? (
          <div className="rounded-xl bg-soft px-6 py-5">
            <p className="font-bold text-heading">{none.title}</p>
            <p className="mt-1 text-muted">{none.body}</p>
          </div>
        ) : null}
        {visible === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-soft px-6 py-10 text-center">
            <p className="text-lg font-bold text-heading">{empty.title}</p>
            <button
              type="button"
              onClick={clear}
              className={buttonVariants({ variant: "primary" })}
            >
              {empty.action}
            </button>
          </div>
        ) : null}
      </div>

      {children}
      <PrepaintScript code={prepaintScript} />
    </div>
  );
}
