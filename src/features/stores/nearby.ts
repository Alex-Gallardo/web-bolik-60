import { distanceKm, isValidLatLng, type LatLng } from "@/lib/geo";

export { isValidLatLng };

/**
 * «Usar mi ubicación» en /donde-comprar (BD-081, docs/06 §3.7). Funciones puras: la isla de filtros
 * las usa con la posición del navegador, que nunca sale de él.
 *
 * Ninguna tienda tiene todavía coordenadas verificadas por Ventas, así que la cercanía se mide al
 * centro de cada departamento. Una tienda verificada con coordenadas usa las suyas.
 */

/** Más lejos que esto del departamento con tiendas más cercano: «No encontramos tiendas cerca». */
export const NEARBY_MAX_KM = 150;

export type MapDepartment = LatLng & { slug: string; name: string; storeCount: number };

/** Una tienda con sus coordenadas solo si Ventas las verificó (si no, null). */
export type MapStore = {
  slug: string;
  department: string;
  name: string;
  point: LatLng | null;
};

/**
 * El departamento con tiendas más cercano a `here`, si está a `maxKm` o menos (si no, undefined).
 * Un departamento se mide a su centro o a su tienda verificada más cercana, lo que quede más cerca.
 */
export function nearestDepartment(
  here: LatLng,
  departments: readonly MapDepartment[],
  stores: readonly MapStore[],
  maxKm: number = NEARBY_MAX_KM,
): { slug: string; km: number } | undefined {
  let best: { slug: string; km: number } | undefined;
  for (const department of departments) {
    if (department.storeCount === 0) continue;
    // Sin centro válido, solo cuentan sus tiendas verificadas (si no tiene, se salta).
    let km = isValidLatLng(department) ? distanceKm(here, department) : Infinity;
    for (const store of stores) {
      if (store.department === department.slug && isValidLatLng(store.point))
        km = Math.min(km, distanceKm(here, store.point));
    }
    if (!Number.isFinite(km)) continue;
    if (!best || km < best.km) best = { slug: department.slug, km };
  }
  return best && best.km <= maxKm ? best : undefined;
}

/**
 * Las tiendas de un departamento por distancia a `here`: primero las verificadas con coordenadas,
 * de la más cercana a la más lejana; luego las demás, en el orden en que llegaron (el de la lista).
 */
export function sortByDistance(here: LatLng, stores: readonly MapStore[]): MapStore[] {
  const located = stores
    .filter((store) => store.point)
    .map((store) => ({ store, km: distanceKm(here, store.point!) }))
    .sort((a, b) => a.km - b.km)
    .map(({ store }) => store);
  return [...located, ...stores.filter((store) => !store.point)];
}

/**
 * Los `n` departamentos con tiendas más cercanos a `from` (BD-082, «departamentos cercanos» de su
 * página: docs/10 §7), medidos entre centros, sin él mismo. No hay datos de vecindad: la distancia
 * hace de vecino.
 */
export function nearestDepartments<T extends MapDepartment>(
  from: MapDepartment,
  departments: readonly T[],
  n: number,
): T[] {
  if (!isValidLatLng(from)) return [];
  return departments
    .filter((d) => d.slug !== from.slug && d.storeCount > 0 && isValidLatLng(d))
    .map((d) => ({ d, km: distanceKm(from, d) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
    .map(({ d }) => d);
}
