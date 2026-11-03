/**
 * Loader de next/image (docs/03 §7). Las imágenes subidas se procesan UNA vez al subir:
 *   /media/products/bolik-ultra-azul-1-a1b2c3-{ancho}.webp   para cada ancho de MEDIA_WIDTHS
 * En la BD se guarda la ruta base sin ancho ni extensión: /media/products/bolik-ultra-azul-1-a1b2c3
 * Archivos de /public (SVG, íconos) se devuelven tal cual.
 */

/** Anchos que genera server/media/process-image.ts; next.config.ts los usa como deviceSizes. */
export const MEDIA_WIDTHS = [320, 480, 640, 960, 1280, 1920] as const;

export function pickWidth(requested: number): number {
  return MEDIA_WIDTHS.find((w) => w >= requested) ?? MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1]!;
}

export default function bolikImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (!src.startsWith("/media/") || /\.(svg|gif|webp|png|jpe?g|avif)$/i.test(src)) return src;
  return `${src}-${pickWidth(width)}.webp`;
}
