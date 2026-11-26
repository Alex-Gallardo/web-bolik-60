import { STORE_TYPES } from "@/lib/constants";
import { safeSlug } from "@/lib/slug";
import type { DepartmentView, StoreView } from "@/server/data/types";

/**
 * Lista de /donde-comprar (BD-080, docs/06 §3.7): las tiendas agrupadas por departamento y el
 * filtro por departamento y por nombre. Funciones puras: las usan la página (servidor) y la isla de
 * filtros (cliente).
 */

export type StoreGroup = {
  department: { slug: string; name: string };
  stores: StoreView[];
};

/** Cadenas primero, luego librerías y distribuidores; dentro de cada tipo, por nombre. */
export function sortStores(stores: readonly StoreView[]): StoreView[] {
  return [...stores].sort(
    (a, b) =>
      STORE_TYPES.indexOf(a.type) - STORE_TYPES.indexOf(b.type) ||
      a.name.localeCompare(b.name, "es"),
  );
}

/**
 * Un grupo por departamento con tiendas, en el orden de `departments` (el de la base). Una tienda
 * cuyo departamento no viene en la lista forma su grupo al final (no se pierde ninguna).
 */
export function groupStoresByDepartment(
  stores: readonly StoreView[],
  departments: readonly Pick<DepartmentView, "slug" | "name">[],
): StoreGroup[] {
  const bySlug = new Map<string, StoreGroup>();
  for (const department of departments)
    bySlug.set(department.slug, { department: { ...department }, stores: [] });
  for (const store of stores) {
    const group = bySlug.get(store.department.slug);
    if (group) group.stores.push(store);
    else bySlug.set(store.department.slug, { department: store.department, stores: [store] });
  }
  return [...bySlug.values()]
    .filter((group) => group.stores.length > 0)
    .map((group) => ({ ...group, stores: sortStores(group.stores) }));
}

/** Para buscar por nombre: sin tildes, en minúsculas y con un solo espacio («Librería  Ñ» → «libreria n»). */
export function normalizeStoreSearch(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** ¿El nombre (ya normalizado) contiene la búsqueda (ya normalizada)? Búsqueda vacía: sí. */
export function matchesStoreName(normalizedName: string, normalizedQuery: string): boolean {
  return normalizedName.includes(normalizedQuery);
}

/**
 * El departamento del hash de la URL («#quetzaltenango», adonde lleva el formulario de la home):
 * solo un slug válido que tenga grupo en la página. Si no, todos.
 */
export function departmentFromHash(hash: string, allowed: readonly string[]): string | undefined {
  let value: string;
  try {
    value = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return undefined;
  }
  const slug = safeSlug(value);
  return slug && allowed.includes(slug) ? slug : undefined;
}

/** Ruta de la lista de tiendas. */
export const STORES_PATH = "/donde-comprar";

/**
 * Adónde lleva /donde-comprar?departamento={slug}, el formulario GET de la home (BD-053), que la
 * página estática no puede leer: al grupo de ese departamento (#slug), con los demás parámetros
 * (utm_*). Un valor inválido o vacío, a la lista completa. null: no trae el parámetro. BD-082 lo
 * cambia por /donde-comprar/{slug}.
 */
export function storesDepartmentRedirect(params: URLSearchParams): string | null {
  if (!params.has("departamento")) return null;
  const slug = safeSlug(params.get("departamento")?.trim().toLowerCase());
  const rest = new URLSearchParams(params);
  rest.delete("departamento");
  const query = rest.size > 0 ? `?${rest.toString()}` : "";
  return `${STORES_PATH}${query}${slug ? `#${slug}` : ""}`;
}
