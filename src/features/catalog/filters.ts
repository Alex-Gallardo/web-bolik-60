/**
 * Filtros del catálogo (/productos, BD-060, docs/06 §3.2): una opción por grupo (línea, uso,
 * color), combinadas con «y». Funciones puras: la isla cliente las usa con la URL y los datos de
 * cada producto (prop items); las pruebas, con cualquier combinación. El script previo al pintado
 * (prepaint-script.ts) repite matchesFilters con los data-* de cada <li>.
 */

export const FILTER_KEYS = ["linea", "uso", "color"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type CatalogFilters = Partial<Record<FilterKey, string>>;

/** Lo que se filtra de cada producto (también va en su <li>: data-linea, data-usos, data-colores). */
export type FilterableItem = { linea: string; usos: string[]; colores: string[] };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Lee los filtros de la URL. Solo las claves conocidas con un slug válido; lo que no exista en
 * `allowed` (un enlace viejo o editado a mano) se ignora en lugar de dejar la grilla vacía.
 */
export function parseFilters(
  search: string | URLSearchParams,
  allowed: Record<FilterKey, readonly string[]>,
): CatalogFilters {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const filters: CatalogFilters = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value && SLUG.test(value) && allowed[key].includes(value)) filters[key] = value;
  }
  return filters;
}

/**
 * La query de la URL con los filtros (en el orden de FILTER_KEYS), conservando los demás
 * parámetros (utm…). Sin filtros ni otros parámetros, cadena vacía: la URL queda en /productos.
 */
export function filtersToSearch(filters: CatalogFilters, current = ""): string {
  const params = new URLSearchParams(current);
  for (const key of FILTER_KEYS) params.delete(key);
  const rest = params.toString();
  const own = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) own.set(key, value);
  }
  const query = [own.toString(), rest].filter(Boolean).join("&");
  return query ? `?${query}` : "";
}

/** ¿El producto cumple todos los filtros activos? */
export function matchesFilters(item: FilterableItem, filters: CatalogFilters): boolean {
  if (filters.linea && item.linea !== filters.linea) return false;
  if (filters.uso && !item.usos.includes(filters.uso)) return false;
  if (filters.color && !item.colores.includes(filters.color)) return false;
  return true;
}

/** Pulsar la opción activa la quita; pulsar otra la cambia. */
export function toggleFilter(
  filters: CatalogFilters,
  key: FilterKey,
  value: string,
): CatalogFilters {
  const next = { ...filters };
  if (next[key] === value) delete next[key];
  else next[key] = value;
  return next;
}

export const activeFilterCount = (filters: CatalogFilters) =>
  FILTER_KEYS.filter((key) => filters[key]).length;
