/**
 * Eventos de analítica (docs/12 §4). Versión mínima de BD-075: deja el evento en
 * `window.dataLayer`, sin scripts ni red. BD-125 conecta GA4 (y Clarity), que leen esa misma cola,
 * y suma el envío de los clics salientes a /api/beacon.
 *
 * Nunca datos personales: ni nombre, ni teléfono, ni correo (docs/12 §4).
 */
/** Un parámetro sin valor (undefined) no se manda. */
export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

type WithDataLayer = { dataLayer?: Record<string, unknown>[] };

export function track(event: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as WithDataLayer;
  const defined = Object.entries(params).filter(([, value]) => value !== undefined);
  (w.dataLayer ??= []).push({ event, ...Object.fromEntries(defined) });
}
