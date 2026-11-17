/** Aumento máximo del zoom de la galería. */
export const ZOOM_MAX = 2;
/** Por debajo de este aumento no vale la pena ampliar (casi no se nota). */
export const ZOOM_MIN = 1.15;

/**
 * Cuánto se puede ampliar una foto sin perder nitidez en píxeles CSS (BD-062): su ancho real
 * entre el ancho con que se ve, hasta 2x (en pantallas de alta densidad, la foto de 750 px ya se
 * ve algo estirada). null si no da para ampliar (la foto es casi del tamaño en pantalla) o si
 * todavía no se puede medir. Con las fotos provisionales del Bolik Ultra (750 px a unos 560 px)
 * da ~1.3x; con las de 3125 px, 2x.
 */
export function zoomScale(originalWidth: number, renderedWidth: number): number | null {
  if (!(originalWidth > 0) || !(renderedWidth > 0)) return null;
  const scale = Math.min(ZOOM_MAX, originalWidth / renderedWidth);
  return scale >= ZOOM_MIN ? Math.round(scale * 100) / 100 : null;
}
