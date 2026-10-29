/**
 * Loader de next/image (docs/03 §7). Las imágenes subidas se procesan UNA vez al subir:
 *   /media/products/bolik-ultra-azul-1-a1b2c3-{ancho}.webp   para cada ancho de MEDIA_WIDTHS
 * En la BD se guarda la ruta base sin ancho ni extensión: /media/products/bolik-ultra-azul-1-a1b2c3
 * Archivos de /public (SVG, íconos) se devuelven tal cual.
 */
const WIDTHS = [320, 480, 640, 960, 1280, 1920]; // = MEDIA_WIDTHS en next.config.ts

export function pickWidth(requested: number): number {
  return WIDTHS.find((w) => w >= requested) ?? WIDTHS[WIDTHS.length - 1]!;
}

export default function bolikImageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (!src.startsWith("/media/") || /\.(svg|gif|webp|png|jpe?g|avif)$/i.test(src)) return src;
  return `${src}-${pickWidth(width)}.webp`;
}
