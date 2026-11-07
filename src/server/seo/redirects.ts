import "server-only";
import {
  buildRedirectMap,
  normalizeRedirectPath,
  withoutQuery,
  type RedirectRow,
  type RedirectTarget,
} from "@/lib/redirect-path";
import { listActiveRedirects } from "@/server/data/redirects";
import { writeRedirectHits } from "@/server/data/seo-logs";
import { log } from "@/server/log";
import { createHitLog, type HitLog } from "./hit-log";

/**
 * Redirecciones de la tabla Redirect en memoria (BD-046, docs/10 §6). proxy.ts las consulta en
 * cada petición sin tocar la base: el mapa se recarga cada `ttlMs` en segundo plano (la petición
 * usa el mapa que hay). Mientras no termine la primera carga, todas las peticiones la esperan
 * juntas, como mucho `firstLoadTimeoutMs` (un rastreador que llega justo al reiniciar no ve 404
 * donde va un 301). Si la base no responde, se sigue con el último mapa (o sin redirecciones) y
 * se reintenta en el siguiente ciclo. `invalidate()` lanza una carga nueva y descarta la que
 * estuviera en curso (BD-123: al guardar en el admin).
 */

export type RedirectStoreOptions = {
  load: () => Promise<RedirectRow[]>;
  ttlMs?: number;
  firstLoadTimeoutMs?: number;
  now?: () => number;
};

export type RedirectStore = {
  find(pathname: string, search?: string): Promise<RedirectTarget | null>;
  invalidate(): void;
};

export function createRedirectStore({
  load,
  ttlMs = 60_000,
  firstLoadTimeoutMs = 5_000,
  now = Date.now,
}: RedirectStoreOptions): RedirectStore {
  let map = new Map<string, RedirectTarget>();
  let loadedAt = Number.NEGATIVE_INFINITY;
  let generation = 0;
  let loading: Promise<void> | undefined;
  let ready = false;
  let firstLoad: Promise<void> | undefined;

  function refresh(): Promise<void> {
    if (loading) return loading;
    const current = generation;
    const pending: Promise<void> = load()
      .then((rows) => {
        if (current !== generation) return; // invalidada mientras cargaba: llega otra carga
        const built = buildRedirectMap(rows);
        map = built.map;
        if (built.skipped.length > 0) {
          log.warn(
            { skipped: built.skipped },
            "Redirecciones descartadas (ciclo, destino externo o repetida)",
          );
        }
      })
      .catch((error: unknown) => {
        log.error(
          { err: error },
          "No se pudieron cargar las redirecciones: se sigue con el mapa anterior",
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
    async find(pathname, search = "") {
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
      const key = normalizeRedirectPath(pathname, search);
      // Primero la ruta con su query (las de Joomla: index.php?option=…); si no, sin la query.
      return map.get(key) ?? (key.includes("?") ? map.get(withoutQuery(key)) : undefined) ?? null;
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
 * distintos, y así la acción del admin (BD-123) invalida el mismo mapa que usa el proxy.
 */
const shared = globalThis as unknown as {
  bolikRedirectStore?: RedirectStore;
  bolikRedirectHits?: HitLog;
};

export const redirectStore = (shared.bolikRedirectStore ??= createRedirectStore({
  load: listActiveRedirects,
}));

/** Usos de cada redirección, escritos en lote en Redirect.hits. */
export const redirectHits = (shared.bolikRedirectHits ??= createHitLog({
  name: "redirect",
  write: writeRedirectHits,
}));
