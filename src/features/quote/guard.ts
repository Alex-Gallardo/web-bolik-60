/**
 * Aparte de actions.ts: un archivo "use server" solo puede exportar funciones async.
 */
/** Antiabuso de los formularios públicos (docs/03 §8). */
export const QUOTE_GUARD = {
  /** Menos que esto desde que se abrió el formulario: lo llenó un bot. */
  minFillMs: 3_000,
  /** Envíos por hash de IP en la ventana. */
  maxPerWindow: 5,
  windowMs: 10 * 60_000,
} as const;
