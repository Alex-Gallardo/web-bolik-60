import { productPage } from "@/content/product";
import { isDescriptiveAlt } from "@/lib/image-names";
import type { ImageView, ProductImageView } from "./types";

/**
 * Reglas de las fotos de producto que comparten las dos fuentes (BD-062), para que den lo mismo:
 * - solo las fotos generales y las de un color visible (una variante despublicada se lleva las
 *   suyas);
 * - la de la tarjeta es la principal del color por defecto; si no hay, la primera principal y,
 *   si tampoco, la primera foto.
 */
export function visibleImages<T extends { colorKey: string | null }>(
  images: readonly T[],
  colorKeys: readonly string[],
): T[] {
  const colors = new Set(colorKeys);
  return images.filter((image) => image.colorKey === null || colors.has(image.colorKey));
}

/** Un alt guardado que sirve: no vacío y que describe la foto (no «IMG_4521» ni «foto 1»). */
const usable = (value: string | null | undefined) =>
  value && isDescriptiveAlt(value) ? value.trim() : null;

/**
 * Texto alternativo de una foto de producto (BD-097, docs/10 §8): el suyo; si quedó vacío o no
 * describe nada, el `defaultAlt` del medio; y si tampoco sirve, el de docs/17 §5 con el nombre real
 * del producto, su color y el número de la foto («Bolik Ultra azul, vista 2»). Ninguna foto sale
 * sin alt y nada se inventa: solo datos del producto. El admin lo exige al publicar (BD-116).
 */
export function imageAlt(
  alt: string | null | undefined,
  defaultAlt: string | null | undefined,
  fallback: { productName: string; colorName: string | null | undefined; position: number },
): string {
  return (
    usable(alt) ??
    usable(defaultAlt) ??
    productPage.gallery.fallbackAlt(
      fallback.productName,
      fallback.colorName?.trim() || null,
      fallback.position,
    )
  );
}

/** Una foto visible con lo que hace falta para resolver su alt. */
export type ImageWithAltSource = Omit<ProductImageView, "alt"> & {
  alt: string | null | undefined;
  defaultAlt: string | null | undefined;
  colorName: string | null | undefined;
};

/**
 * Fotos visibles con su alt resuelto. El número de «vista {n}» cuenta dentro de su color (las
 * generales, aparte), después de quitar las de colores despublicados: el mismo orden que las
 * miniaturas de la galería («Foto {n} de {total}»), que pone primero las del color.
 */
export function withAlts(
  images: readonly ImageWithAltSource[],
  productName: string,
  colorKeys: readonly string[],
): ProductImageView[] {
  const positions = new Map<string | null, number>();
  return visibleImages(images, colorKeys).map(({ defaultAlt, colorName, ...image }) => {
    const position = (positions.get(image.colorKey) ?? 0) + 1;
    positions.set(image.colorKey, position);
    return { ...image, alt: imageAlt(image.alt, defaultAlt, { productName, colorName, position }) };
  });
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
