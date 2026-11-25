import "server-only";
import { randomInt } from "node:crypto";
import * as z from "zod/mini";
import { FORM_GUARD, checkFormMeta, type FormMeta } from "@/lib/form-guard";
import { MAX_FOLIO_NUMBER, folioYear, formatFolio, type FolioPrefix } from "@/lib/folio";
import {
  countRecentRequestsByIp,
  RequestRateLimitError,
  type RequestForm,
} from "@/server/data/form-requests";
import { log, logError } from "@/server/log";
import { formRateLimiter } from "@/server/rate-limit";
import { requestIpHash } from "@/server/request-ip";

/**
 * Respuesta de los formularios de escuelas, distribuidores y contacto (BD-076). invalid: datos no
 * válidos (con `fields`, junto a cada campo); tooFast: antes del tiempo mínimo; rateLimited: más
 * de 5 envíos en 10 min desde la misma IP; unavailable: no se pudo guardar (con `reference`).
 */
export type FormSubmitResult<F extends string, D> =
  | { ok: true; data: D }
  | {
      ok: false;
      error: "invalid" | "tooFast" | "rateLimited" | "unavailable";
      fields?: Partial<Record<F, string>>;
      reference?: string;
    };

/** Límite por IP que repite cada `save` dentro de su transacción (FORM_GUARD, docs/03 §8). */
export const FORM_IP_LIMIT = { max: FORM_GUARD.maxPerWindow, windowMs: FORM_GUARD.windowMs };

/** Lo que guarda cada formulario: el resultado, o un error que la página sabe mostrar. */
type Save<T, F extends string, D> = (data: T, ipHash: string) => Promise<FormSubmitResult<F, D>>;

/**
 * Folio con su formato para el éxito falso (BD-076, decisión del usuario): un bot que llenó el campo
 * trampa recibe un folio creíble que no existe ni gasta el consecutivo.
 */
export function fakeFolio(prefix: FolioPrefix, now: Date = new Date()): string {
  return formatFolio(prefix, folioYear(now), randomInt(1, MAX_FOLIO_NUMBER + 1));
}

/**
 * El camino común de un envío (BD-077, BD-076):
 * 1. Campo trampa lleno: éxito falso (`fake`), sin guardar ni consultar la base.
 * 2. Tiempo mínimo, y los datos con el mismo esquema del formulario.
 * 3. Límite en memoria por IP antes de tocar la base; el cupo se devuelve si no se guarda.
 * 4. La cuenta de la base (sobrevive a un reinicio); `save` la repite dentro de su transacción.
 * Nunca lanza.
 */
export async function submitGuardedForm<T, F extends string, D>({
  form,
  meta,
  values,
  schema,
  errors,
  fake,
  save,
}: {
  form: RequestForm;
  meta: FormMeta;
  values: unknown;
  schema: z.ZodMiniType<T>;
  errors: (values: unknown) => Partial<Record<F, string>>;
  fake: () => D;
  save: Save<T, F, D>;
}): Promise<FormSubmitResult<F, D>> {
  // `meta` llega del navegador: un null no debe tumbar la acción.
  const guard = checkFormMeta(meta ?? {});
  if (guard === "bot") {
    log.warn({ form }, "Solicitud descartada: campo trampa lleno");
    return { ok: true, data: fake() };
  }
  if (guard === "tooFast") return { ok: false, error: "tooFast" };

  const parsed = z.safeParse(schema, values);
  if (!parsed.success) return { ok: false, error: "invalid", fields: errors(values) };

  let ipHash: string;
  try {
    ipHash = await requestIpHash();
  } catch (error) {
    return { ok: false, error: "unavailable", reference: logError(error, { action: form }) };
  }
  const slot = formRateLimiter(form).take(ipHash);
  if (!slot.ok) return { ok: false, error: "rateLimited" };

  let result: FormSubmitResult<F, D>;
  try {
    const since = new Date(Date.now() - FORM_GUARD.windowMs);
    result =
      (await countRecentRequestsByIp(form, ipHash, since)) >= FORM_GUARD.maxPerWindow
        ? { ok: false, error: "rateLimited" }
        : await save(parsed.data, ipHash);
  } catch (error) {
    result =
      error instanceof RequestRateLimitError
        ? { ok: false, error: "rateLimited" }
        : { ok: false, error: "unavailable", reference: logError(error, { action: form }) };
  }
  // El cupo vuelve si el envío no se guardó por otra razón. Con rateLimited de la base (tras un
  // reinicio), se queda: la memoria se pone al día y los siguientes intentos ya no consultan la base.
  if (!result.ok && result.error !== "rateLimited") slot.release();
  return result;
}
