import "server-only";
import { listPublishedCategorySlugs } from "@/server/data/catalog-routes";
import { log } from "@/server/log";
import { safeSlug } from "@/lib/slug";

/**
 * Slugs publicados del catálogo en memoria (BD-061), para que proxy.ts responda un 404 real a
 * /productos/{algo que no existe}. Con Cache Components el layout ya se envió cuando la página
 * llama a notFound(): sin esto la respuesta sería 200 con noindex («soft 404»). Como las
 * redirecciones (redirects.ts):
 * - se recarga cada `ttlMs` en segundo plano (la petición usa la lista que hay);
 * - mientras no termine la primera carga, todas las peticiones la esperan juntas, una sola vez y
 *   como mucho `firstLoadTimeoutMs`; si la base no responde, se deja pasar todo (la página decide
 *   con su notFound()) y se reintenta en el siguiente ciclo;
 * - si una recarga falla, se sigue con la lista anterior;
 * - `invalidate()` lanza una carga nueva (el admin al publicar o despublicar una categoría).
 * BD-062 suma las fichas.
 */

export type CatalogRouteStoreOptions = {
  load: () => Promise<{ categories: string[] }>;
  ttlMs?: number;
  firstLoadTimeoutMs?: number;
  now?: () => number;
};

export type CatalogRouteStore = {
  /** false solo si la ruta es una categoría y su slug no está publicado; true en otro caso. */
  exists(pathname: string): Promise<boolean>;
  invalidate(): void;
};

const CATEGORY_PATH = /^\/productos\/([^/]+)$/;

/** El segmento de la URL como slug; null si está mal codificado o no es un slug válido. */
function slugOf(segment: string): string | null {
  try {
    return safeSlug(decodeURIComponent(segment)) ?? null;
  } catch {
    return null; // «%» suelto o una secuencia rota: URIError
  }
}

export function createCatalogRouteStore({
  load,
  ttlMs = 60_000,
  firstLoadTimeoutMs = 5_000,
  now = Date.now,
}: CatalogRouteStoreOptions): CatalogRouteStore {
  let categories: Set<string> | null = null;
  let loadedAt = Number.NEGATIVE_INFINITY;
  let generation = 0;
  let loading: Promise<void> | undefined;
  let ready = false;
  let firstLoad: Promise<void> | undefined;

  function refresh(): Promise<void> {
    if (loading) return loading;
    const current = generation;
    const pending: Promise<void> = load()
      .then((data) => {
        if (current === generation) categories = new Set(data.categories);
      })
      .catch((error: unknown) => {
        log.error(
          { err: error },
          "No se pudieron cargar las rutas del catálogo: sigue la lista anterior",
        );
      })
      .finally(() => {
        if (current === generation) loadedAt = now();
        if (loading === pending) loading = undefined;
      });
    loading = pending;
    return pending;
  }

  return {
    async exists(pathname) {
      const match = CATEGORY_PATH.exec(pathname);
      if (!match) return true;
      if (now() - loadedAt > ttlMs) {
        const pending = refresh();
        if (!ready) {
          firstLoad ??= Promise.race([
            pending,
            new Promise<void>((resolve) => setTimeout(resolve, firstLoadTimeoutMs).unref?.()),
          ]).then(() => {
            ready = true;
          });
          await firstLoad;
        }
      }
      if (!categories) return true;
      const slug = slugOf(match[1]!);
      return slug !== null && categories.has(slug);
    },
    invalidate() {
      generation += 1;
      loadedAt = Number.NEGATIVE_INFINITY;
      loading = undefined;
    },
  };
}

/**
 * Una sola instancia por proceso, en globalThis: proxy.ts y la app se compilan en bundles
 * distintos, y así una acción del admin invalida la misma lista que usa el proxy.
 */
const shared = globalThis as unknown as { bolikCatalogRouteStore?: CatalogRouteStore };

export const catalogRouteStore = (shared.bolikCatalogRouteStore ??= createCatalogRouteStore({
  load: async () => ({ categories: await listPublishedCategorySlugs() }),
}));
