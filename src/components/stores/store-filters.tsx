"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { showToast, type ToastMessage } from "@/components/feedback/feedback-store";
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
import type { MapDepartment, MapStore } from "@/features/stores/nearby";
import type { LatLng } from "@/lib/geo";
import { StoreMapLayout, useStoreMapSheet } from "./store-map-layout";

/**
 * Lo que solo hace falta al usarlo (docs/12: la página está a ~1 KB de su tope): la cercanía
 * (features/stores/nearby) al tocar «Usar mi ubicación» y la hoja del mapa (Radix Dialog y el mapa)
 * al tocar «Ver mapa». import() directo y no next/dynamic: su código pesaría en la carga inicial.
 */
const loadNearby = () => import("@/features/stores/nearby");

/**
 * Sin respuesta en este tiempo (Firefox no responde si se cierra el aviso del permiso sin elegir;
 * el timeout de la geolocalización no cuenta la espera del permiso): se da por fallido.
 */
const LOCATE_WATCHDOG_MS = 20_000;

/** Un punto con coordenadas usables (un departamento que no viene en la base llega con NaN). */
const hasPoint = (d: MapDepartment) => Number.isFinite(d.lat) && Number.isFinite(d.lng);

/** Un solo toast para «Buscando…» y su resultado (el segundo reemplaza al primero). */
const LOCATE_TOAST = "store-locate";
/** La posición puede tardar (GPS frío); una de hace 5 minutos sirve para elegir departamento. */
const GEOLOCATION: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
};

/** El selector cambia el hash con replaceState: no dispara hashchange ni crea historial. */
function writeHash(slug: string | undefined) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}${slug ? `#${slug}` : ""}`);
}

type Department = { slug: string; name: string };

type StoreFiltersProps = {
  /**
   * Departamentos con tiendas, en el orden de la lista (las opciones del selector), con su centro y
   * su número de tiendas (los pines del mapa y la cercanía).
   */
  departments: MapDepartment[];
  /** Todos los departamentos: uno sin tiendas que llega en el hash (desde la home) tiene su aviso. */
  allDepartments: Department[];
  /**
   * Cada tienda (el data-store-item de su <li>) con su departamento, su nombre y, solo si Ventas las
   * verificó, sus coordenadas.
   */
  stores: MapStore[];
  /** La lista del servidor: un [data-store-group] por departamento y un [data-store-item] por tienda. */
  children: ReactNode;
  /** features/stores/prepaint-script.ts: va justo después de la lista. */
  prepaintScript: string;
};

/**
 * Filtros de /donde-comprar (BD-080, docs/06 §3.7). La lista llega completa del servidor; filtrar
 * solo oculta y muestra grupos y tiendas (atributo hidden), como el catálogo. Sin JS, el selector
 * es un formulario GET que el proxy lleva a la página del departamento (BD-082) y la búsqueda por
 * nombre no aparece (.js-only).
 *
 * El departamento se guarda en el hash (#quetzaltenango): lo cambian el selector, los enlaces por
 * departamento y el formulario de la home. Solo un hash que es un departamento (o ninguno) cambia
 * el filtro: «Volver arriba» (#top) o «Saltar al contenido» no lo quitan. Un departamento sin
 * tiendas deja la lista completa con su aviso. El cambio en el selector registra `store_filter`.
 *
 * BD-081: el mapa (escritorio: al entrar en pantalla; móvil: «Ver mapa») comparte el departamento
 * con el selector. «Usar mi ubicación» elige el departamento con tiendas más cercano (a 150 km o
 * menos) y ordena sus tiendas verificadas por distancia; si se niega el permiso, falla o queda
 * lejos, avisa y pasa el foco al selector. La posición nunca sale del navegador: `store_locate`
 * solo dice el resultado y el departamento.
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
  const select = useRef<HTMLSelectElement>(null);
  const selectId = useId();
  const [locating, setLocating] = useState(false);
  // Intento en curso: una respuesta de un intento viejo (tarde, tras el vigilante) se ignora.
  const attempt = useRef(0);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Orden original de los grupos que «Usar mi ubicación» reordenó por distancia.
  const reordered = useRef(new Map<HTMLElement, HTMLElement[]>());
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

  /** Devuelve a su orden original (el del servidor) los grupos ordenados por distancia. */
  const restoreOrder = useCallback(() => {
    for (const [list, items] of reordered.current) list.append(...items);
    reordered.current.clear();
  }, []);

  const choose = useCallback(
    (value: string) => {
      restoreOrder();
      const next = departmentFromHash(value, slugs);
      setSelected(next);
      writeHash(next);
      track("store_filter", { department: next ?? "todos" });
    },
    [restoreOrder, slugs],
  );
  // Desde el mapa: el pin del departamento ya elegido no repite store_filter.
  const chooseFromMap = useCallback(
    (slug: string) => {
      if (slug !== department) choose(slug);
    },
    [choose, department],
  );
  // «Quitar filtros» desaparece al pulsarlo: el foco pasa al contador.
  const clear = () => {
    restoreOrder();
    setQuery("");
    if (selected) {
      setSelected(undefined);
      writeHash(undefined);
    }
    counter.current?.focus();
  };

  /** Las tiendas verificadas con coordenadas, por distancia: se mueven los <li> de su grupo. */
  const orderByDistance = (
    slug: string,
    here: LatLng,
    sortByDistance: (here: LatLng, stores: readonly MapStore[]) => MapStore[],
  ) => {
    const list = document.getElementById(slug)?.querySelector("ul");
    const inGroup = stores.filter((store) => store.department === slug);
    if (!list || !inGroup.some((store) => store.point)) return;
    const original = [...list.querySelectorAll<HTMLElement>("[data-store-item]")];
    if (!reordered.current.has(list)) reordered.current.set(list, original);
    const items = new Map(original.map((item) => [item.dataset.storeItem, item]));
    for (const store of sortByDistance(here, inGroup)) {
      const item = items.get(store.slug);
      if (item) list.append(item);
    }
  };

  // El aviso y el foco en el selector: elegir a mano es la salida (criterio de BD-081).
  const locateFailed = (message: ToastMessage, result: string) => {
    clearTimeout(watchdog.current);
    attempt.current += 1;
    setLocating(false);
    void showToast(message, { id: LOCATE_TOAST });
    track("store_locate", { result });
    select.current?.focus();
  };

  const locate = () => {
    // Con un ref y no con el estado: un doble clic llega antes de que el estado cambie.
    if (watchdog.current !== undefined) return;
    if (!("geolocation" in navigator)) {
      locateFailed(feedback.stores.locationDenied, "sin-soporte");
      return;
    }
    const current = ++attempt.current;
    const finished = () => {
      clearTimeout(watchdog.current);
      watchdog.current = undefined;
    };
    watchdog.current = setTimeout(() => {
      watchdog.current = undefined;
      locateFailed(feedback.stores.locationDenied, "error");
    }, LOCATE_WATCHDOG_MS);
    setLocating(true);
    void showToast(feedback.stores.locating, { id: LOCATE_TOAST, duration: Infinity });
    // Se descarga mientras el navegador pide el permiso.
    const nearby = loadNearby();
    nearby.catch(() => {});
    const located = async (here: LatLng) => {
      if (current !== attempt.current) return;
      finished();
      let geo: Awaited<typeof nearby>;
      try {
        geo = await nearby;
      } catch {
        locateFailed(feedback.stores.locationDenied, "error");
        return;
      }
      if (!geo.isValidLatLng(here)) {
        locateFailed(feedback.stores.locationDenied, "error");
        return;
      }
      const nearest = geo.nearestDepartment(here, departments, stores);
      if (!nearest) {
        locateFailed(feedback.stores.noneNearby, "lejos");
        return;
      }
      if (current !== attempt.current) return;
      setLocating(false);
      setQuery("");
      restoreOrder();
      setSelected(nearest.slug);
      writeHash(nearest.slug);
      orderByDistance(nearest.slug, here, geo.sortByDistance);
      const count = departments.find((d) => d.slug === nearest.slug)?.storeCount ?? 0;
      void showToast(feedback.stores.located(count), { id: LOCATE_TOAST });
      track("store_locate", { result: "ok", department: nearest.slug });
    };
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => void located({ lat: coords.latitude, lng: coords.longitude }),
      (error) => {
        if (current !== attempt.current) return;
        finished();
        locateFailed(
          feedback.stores.locationDenied,
          error.code === error.PERMISSION_DENIED ? "denegado" : "error",
        );
      },
      GEOLOCATION,
    );
  };

  // Arreglos estables: con unos nuevos en cada render (cada letra de la búsqueda), el mapa volvería a
  // encuadrar y a rehacer sus pines.
  const mapDepartments = useMemo(() => departments.filter(hasPoint), [departments]);
  const mapStores = useMemo(() => stores.filter((store) => store.point), [stores]);
  const mapProps = useMemo(
    () => ({
      departments: mapDepartments,
      stores: mapStores,
      selected: department,
      onSelect: chooseFromMap,
    }),
    [mapDepartments, mapStores, department, chooseFromMap],
  );
  const mapSheet = useStoreMapSheet(mapProps, "lg:hidden");

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
            ref={select}
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

      {/* Solo con JS: la ubicación y el mapa lo necesitan. */}
      <div className="js-only flex flex-wrap gap-3">
        <button
          type="button"
          onClick={locate}
          aria-busy={locating || undefined}
          className={buttonVariants({ variant: "outline" })}
        >
          {storesPage.locate}
        </button>
        {mapSheet.button}
      </div>

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

      <StoreMapLayout map={mapProps}>{children}</StoreMapLayout>
      <PrepaintScript code={prepaintScript} />
      {mapSheet.sheet}
    </div>
  );
}
