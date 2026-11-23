import "server-only";
import { FORM_GUARD } from "@/lib/form-guard";

/**
 * Límite por ventana en memoria (BD-077, docs/03 §8): cuántas veces pasó algo con una clave (el
 * hash de la IP) en los últimos `windowMs`. Lo comparten los formularios públicos y el login del
 * admin.
 *
 * - `take` revisa y cuenta en el mismo paso, sin `await` en medio: en Node una ráfaga de peticiones
 *   a la vez no se lo salta (cada una ve las anteriores). Si al final no debía contar (el envío
 *   falló, la contraseña era correcta), `release` devuelve el cupo.
 * - Vive en la memoria del proceso: un reinicio lo vacía. Los formularios tienen además el respaldo
 *   de la base (cuentan sus filas por IP); el login, el bloqueo por cuenta, que sí se guarda.
 * - Tope de claves: al llenarse se olvidan las más viejas (Map conserva el orden de inserción), así
 *   un ataque con muchas IPs no hace crecer la memoria sin fin.
 */
export type RateLimitRule = { max: number; windowMs: number };

export type RateLimitTake = { ok: true; release: () => void } | { ok: false; retryAfterMs: number };

export type RateLimiter = {
  take: (key: string, now?: number) => RateLimitTake;
  /** Veces contadas en la ventana (para pruebas y registros). */
  count: (key: string, now?: number) => number;
  /** Solo para pruebas: vacía el contador. */
  reset: () => void;
};

/** Formularios públicos con límite de envíos por IP (BD-073, BD-076). */
export type LimitedForm = "quote" | "school" | "distributor" | "contact";

const formLimiters = new Map<LimitedForm, RateLimiter>();

/**
 * Límite en memoria de un formulario (5 envíos en 10 min por IP, FORM_GUARD): cuenta los envíos
 * guardados. Va antes de tocar la base, así un bot que insiste no hace consultas; la cuenta que vale
 * sigue siendo la de la base (sobrevive a un reinicio), que cada formulario repite al guardar.
 */
export function formRateLimiter(form: LimitedForm): RateLimiter {
  let limiter = formLimiters.get(form);
  if (!limiter) {
    limiter = createRateLimiter({ max: FORM_GUARD.maxPerWindow, windowMs: FORM_GUARD.windowMs });
    formLimiters.set(form, limiter);
  }
  return limiter;
}

/** Claves que guarda cada limitador como máximo. */
export const RATE_LIMIT_MAX_KEYS = 10_000;

export function createRateLimiter(
  rule: RateLimitRule,
  maxKeys: number = RATE_LIMIT_MAX_KEYS,
): RateLimiter {
  const hits = new Map<string, number[]>();

  /** Los tiempos de la clave que siguen en la ventana (borra la clave si no queda ninguno). */
  const recent = (key: string, now: number): number[] => {
    const list = hits.get(key)?.filter((at) => at > now - rule.windowMs) ?? [];
    if (list.length === 0) hits.delete(key);
    else hits.set(key, list);
    return list;
  };

  return {
    take(key, now = Date.now()) {
      const list = recent(key, now);
      if (list.length >= rule.max)
        return { ok: false, retryAfterMs: list[0]! + rule.windowMs - now };
      list.push(now);
      // Al final del Map: la clave usada hace menos tiempo es la última que se olvida.
      hits.delete(key);
      hits.set(key, list);
      if (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
      let released = false;
      return {
        ok: true,
        release() {
          if (released) return;
          released = true;
          const current = hits.get(key);
          const index = current?.indexOf(now) ?? -1;
          if (index === -1) return;
          current!.splice(index, 1);
          if (current!.length === 0) hits.delete(key);
        },
      };
    },
    count: (key, now = Date.now()) => recent(key, now).length,
    reset: () => hits.clear(),
  };
}
