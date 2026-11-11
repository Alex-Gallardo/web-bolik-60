import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { safeSlug } from "@/lib/slug";
import { dataSource } from "./source";
import type { StoreFilter } from "./types";

/** Dónde comprar: departamentos y puntos de venta (BD-037). */

export async function listDepartments() {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.stores);
  return (await dataSource()).listDepartments();
}

/** El slug llega de la URL: uno inválido da null sin crear una entrada de caché. */
export async function getDepartment(slug: string) {
  const valid = safeSlug(slug);
  return valid ? cachedGetDepartment(valid) : null;
}

async function cachedGetDepartment(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.department(slug), TAGS.stores);
  return (await dataSource()).getDepartment(slug);
}

/** Filtros normalizados antes de la caché: un departamento inválido da lista vacía. */
export async function listStores(filter: StoreFilter = {}) {
  const departmentSlug = safeSlug(filter.departmentSlug);
  if (filter.departmentSlug && !departmentSlug) return [];
  return cachedListStores(departmentSlug ?? "", Boolean(filter.onlineOnly));
}

async function cachedListStores(departmentSlug: string, onlineOnly: boolean) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.stores);
  if (departmentSlug) cacheTag(TAGS.department(departmentSlug));
  return (await dataSource()).listStores({
    departmentSlug: departmentSlug || undefined,
    onlineOnly,
  });
}
