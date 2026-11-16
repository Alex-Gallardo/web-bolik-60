import type { ImageView, ProductImageView } from "./types";

/**
 * Reglas de las fotos de producto que comparten las dos fuentes (BD-062), para que den lo mismo:
 * - solo las fotos generales y las de un color visible (una variante despublicada se lleva las
 *   suyas);
 * - la de la tarjeta es la principal del color por defecto; si no hay, la primera principal y,
 *   si tampoco, la primera foto.
 */
export function visibleImages(
  images: readonly ProductImageView[],
  colorKeys: readonly string[],
): ProductImageView[] {
  const colors = new Set(colorKeys);
  return images.filter((image) => image.colorKey === null || colors.has(image.colorKey));
}

export function cardImage(
  images: readonly ProductImageView[],
  defaultColor: string | undefined,
): ImageView | null {
  const pick =
    images.find((image) => image.kind === "main" && image.colorKey === defaultColor) ??
    images.find((image) => image.kind === "main") ??
    images[0];
  if (!pick) return null;
  const { src, alt, width, height, blurDataUrl } = pick;
  return { src, alt, width, height, blurDataUrl };
}
