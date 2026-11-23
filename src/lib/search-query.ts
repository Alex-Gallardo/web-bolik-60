/**
 * Lo que la búsqueda necesita sin Fuse (BD-066): lo usan proxy.ts, /buscar/[q] y el panel sin
 * cargar el motor. lib/search.ts lo reexporta.
 */

/** Largo máximo de una búsqueda (campo, /buscar?q= y proxy.ts). */
export const MAX_QUERY_LENGTH = 100;

/**
 * La consulta sin espacios a los lados y con MAX_QUERY_LENGTH caracteres como mucho, contados como
 * caracteres y no como unidades UTF-16: un emoji en el corte no queda partido (encodeURIComponent
 * lanzaría con medio emoji y el proxy respondería 500).
 */
export const clampQuery = (query: string) =>
  Array.from(query.trim()).slice(0, MAX_QUERY_LENGTH).join("");

/**
 * Prefijo del segmento de /buscar/[q] (proxy.ts): «.» o «..» como consulta serían segmentos de
 * ruta que la URL normaliza («/buscar/..» → «/»). Con el prefijo siempre es un nombre.
 */
export const SEARCH_SEGMENT_PREFIX = "-";

/** /buscar?q=… → la ruta interna que la pinta completa en el servidor. */
export const searchRewritePath = (query: string) =>
  `/buscar/${SEARCH_SEGMENT_PREFIX}${encodeURIComponent(query)}`;

/** El segmento de /buscar/[q] de vuelta a la consulta (sin el prefijo). */
export const queryFromSegment = (segment: string) =>
  clampQuery(
    segment.startsWith(SEARCH_SEGMENT_PREFIX)
      ? segment.slice(SEARCH_SEGMENT_PREFIX.length)
      : segment,
  );
