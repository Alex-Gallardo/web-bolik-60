/**
 * Antiabuso de los formularios públicos (BD-077, docs/03 §8): la cotización (BD-073) y los de
 * escuelas, distribuidores y contacto (BD-076). Sin captcha: un campo trampa, un tiempo mínimo de
 * llenado y un límite de envíos por IP (`server/rate-limit.ts` en memoria, más las filas de la base).
 */
export const FORM_GUARD = {
  /** Menos que esto desde que se abrió el formulario: lo llenó un bot. */
  minFillMs: 3_000,
  /** Envíos por hash de IP en la ventana. */
  maxPerWindow: 5,
  windowMs: 10 * 60_000,
} as const;

/** Lo que manda cada formulario además de sus datos. */
export type FormMeta = {
  /** Campo trampa (`website`), oculto para las personas: si llega con algo, lo llenó un bot. */
  website?: unknown;
  /** Milisegundos desde que se abrió el formulario (reloj del navegador, sin comparar relojes). */
  elapsedMs?: unknown;
};

/**
 * `bot`: el campo trampa llegó lleno (no se guarda; cada formulario decide qué responder).
 * `tooFast`: antes del tiempo mínimo, o sin el dato.
 */
export function checkFormMeta(meta: FormMeta): "ok" | "bot" | "tooFast" {
  if (typeof meta.website === "string" && meta.website.trim() !== "") return "bot";
  if (
    typeof meta.elapsedMs !== "number" ||
    !Number.isFinite(meta.elapsedMs) ||
    meta.elapsedMs < FORM_GUARD.minFillMs
  )
    return "tooFast";
  return "ok";
}
