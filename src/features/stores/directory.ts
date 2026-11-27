import type { StoreInput } from "@/features/seo/jsonld";
import { STORE_TYPES } from "@/lib/constants";
import { isValidLatLng, type LatLng } from "@/lib/geo";
import { safeSlug } from "@/lib/slug";
import type { DepartmentView, StoreView } from "@/server/data/types";
import type { MapStore } from "./nearby";

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

/** Página de un departamento (BD-082). */
export const departmentPath = (slug: string) => `${STORES_PATH}/${slug}`;

/**
 * Adónde lleva /donde-comprar?departamento={slug}, el formulario GET de la home (BD-053) y el de
 * /donde-comprar sin JS, que la página estática no puede leer: a la página del departamento
 * (BD-082), con los demás parámetros (utm_*). Un valor inválido o vacío, a la lista completa. null:
 * no trae el parámetro. Un departamento sin página (sin tiendas, como Izabal desde la home) va a
 * /donde-comprar#{slug}: la lista completa con su aviso (BD-080). `hasPage` lo decide (proxy.ts:
 * la lista en memoria; si no cargó, se asume que la tiene).
 */
export function storesDepartmentRedirect(
  params: URLSearchParams,
  hasPage: (slug: string) => boolean = () => true,
): string | null {
  return storesDepartmentTarget(params, hasPage)?.location ?? null;
}

/**
 * Lo mismo, con si el destino es firme (`permanent`): la página del departamento existe. Un destino
 * que depende de los datos (sin página, a #slug; sin lista, «no se sabe») no debe quedar guardado
 * en el navegador.
 */
export function storesDepartmentTarget(
  params: URLSearchParams,
  hasPage: (slug: string) => boolean | null = () => true,
): { location: string; permanent: boolean } | null {
  if (!params.has("departamento")) return null;
  const slug = safeSlug(params.get("departamento")?.trim().toLowerCase());
  const rest = new URLSearchParams(params);
  rest.delete("departamento");
  const query = rest.size > 0 ? `?${rest.toString()}` : "";
  if (!slug) return { location: `${STORES_PATH}${query}`, permanent: true };
  const page = hasPage(slug);
  if (page === false) return { location: `${STORES_PATH}${query}#${slug}`, permanent: false };
  return { location: `${departmentPath(slug)}${query}`, permanent: page === true };
}

/** Solo https: la URL llega de los datos (y algún día del admin), nunca un javascript:. */
export const isHttpsUrl = (url: string | null): url is string =>
  Boolean(url?.startsWith("https://"));

/** Las coordenadas de una tienda solo si Ventas la verificó y son válidas (mapa, cercanía, JSON-LD). */
export function storePoint(store: StoreView): LatLng | null {
  if (!store.isVerified || store.lat === null || store.lng === null) return null;
  const point = { lat: store.lat, lng: store.lng };
  return isValidLatLng(point) ? point : null;
}

/** Lo que la isla y el mapa necesitan de una tienda (BD-081). */
export function toMapStore(store: StoreView): MapStore {
  return {
    slug: store.slug,
    department: store.department.slug,
    name: store.name,
    point: storePoint(store),
  };
}

/** Una tienda para el JSON-LD (BD-080): la calle y geo solo verificadas, sin inventar el país. */
export function toStoreJsonLd(store: StoreView, country: string | null): StoreInput {
  return {
    name: store.name,
    address: store.isVerified ? store.address : null,
    municipality: store.municipality,
    department: store.department.name,
    country,
    phone: store.phone,
    geo: storePoint(store),
    url: isHttpsUrl(store.onlineShopUrl) ? store.onlineShopUrl : null,
  };
}
