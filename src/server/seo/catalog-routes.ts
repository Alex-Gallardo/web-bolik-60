import "server-only";
import { listPublishedCatalogRoutes } from "@/server/data/catalog-routes";
import { log } from "@/server/log";
import { safeSlug } from "@/lib/slug";
import { isSearchableCode, normalizeCode } from "@/server/data/variant-code";

/**
 * Slugs publicados del catálogo en memoria (BD-061), para que proxy.ts responda un 404 real a
 * /productos/{algo que no existe} y a /productos/{categoría}/{ficha que no existe} (BD-062). Una
 * ficha existe solo en su categoría. Con Cache Components el layout ya se envió cuando la página
 * llama a notFound(): sin esto la respuesta sería 200 con noindex («soft 404»). Como las
 * redirecciones (redirects.ts):
 * - se recarga cada `ttlMs` en segundo plano (la petición usa la lista que hay);
 * - mientras no termine la primera carga, todas las peticiones la esperan juntas, una sola vez y
 *   como mucho `firstLoadTimeoutMs`; si la base no responde, se deja pasar todo (la página decide
 *   con su notFound()) y se reintenta en el siguiente ciclo;
 * - si una recarga falla, se sigue con la lista anterior;
 * - `invalidate()` lanza una carga nueva (el admin al publicar o despublicar una categoría o un
 *   producto).
 */

/** A dónde lleva un código del QR (BD-065): la ficha y el color de esa variante. */
export type CodeTarget = { path: string; color: string };

export type CodeResult =
  { status: "found"; target: CodeTarget } | { status: "missing" } | { status: "unavailable" };

/**
 * Slugs publicados: categorías y fichas como «categoria/producto», y los códigos (SKU y código de
 * barras) de las variantes visibles con su ficha y su color.
 */
export type CatalogRoutes = {
  categories: string[];
  products: string[];
  codes: [code: string, target: CodeTarget][];
};

export type CatalogRouteStoreOptions = {
  load: () => Promise<CatalogRoutes>;
  ttlMs?: number;
  firstLoadTimeoutMs?: number;
  now?: () => number;
};

export type CatalogRouteStore = {
  /** false solo si la ruta es una categoría o una ficha sin publicar; true en otro caso. */
  exists(pathname: string): Promise<boolean>;
  /**
   * La ficha de un código de /p/{codigo} (BD-065), tal como llega en la URL. «missing» si no
   * existe o está mal escrito; «unavailable» si la lista no cargó (no se sabe).
   */
  resolveCode(segment: string): Promise<CodeResult>;
  invalidate(): void;
};

const CATEGORY_PATH = /^\/productos\/([^/]+)$/;
const PRODUCT_PATH = /^\/productos\/([^/]+)\/([^/]+)$/;

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
  let routes: {
    categories: Set<string>;
    products: Set<string>;
    codes: Map<string, CodeTarget>;
  } | null = null;
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
        if (current === generation) {
          // Gana el primero. El cargador pone todos los SKU antes que los códigos de barras: un SKU
          // (único) nunca queda tapado por un código de barras repetido de otra ficha.
          const codes = new Map<string, CodeTarget>();
          for (const [code, target] of data.codes) {
            const key = normalizeCode(code);
            if (isSearchableCode(key) && !codes.has(key)) codes.set(key, target);
          }
          routes = {
            categories: new Set(data.categories),
            products: new Set(data.products),
            codes,
          };
        }
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

  /** Recarga si toca; la primera vez espera (una sola vez y como mucho firstLoadTimeoutMs). */
  async function fresh() {
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
    return routes;
  }

  return {
    async exists(pathname) {
      const category = CATEGORY_PATH.exec(pathname);
      const product = category ? null : PRODUCT_PATH.exec(pathname);
      if (!category && !product) return true;
      const routes = await fresh();
      if (!routes) return true;
      if (category) {
        const slug = slugOf(category[1]!);
        return slug !== null && routes.categories.has(slug);
      }
      const categorySlug = slugOf(product![1]!);
      const productSlug = slugOf(product![2]!);
      return (
        categorySlug !== null &&
        productSlug !== null &&
        routes.products.has(`${categorySlug}/${productSlug}`)
      );
    },
    async resolveCode(segment) {
      let code: string;
      try {
        code = normalizeCode(decodeURIComponent(segment));
      } catch {
        return { status: "missing" }; // «%» suelto o una secuencia rota
      }
      if (!isSearchableCode(code)) return { status: "missing" };
      const routes = await fresh();
      if (!routes) return { status: "unavailable" };
      const target = routes.codes.get(code);
      return target ? { status: "found", target } : { status: "missing" };
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
  load: listPublishedCatalogRoutes,
}));
