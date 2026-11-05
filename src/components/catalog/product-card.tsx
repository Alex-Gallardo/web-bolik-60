import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { ui } from "@/content/ui";
import type { ProductCardView } from "@/server/data/types";

/**
 * sizes de la imagen según la grilla del catálogo: 2 columnas en móvil, 3 en sm, 4 desde lg y, con
 * el contenedor a su ancho máximo (1280 px), unos 300 px por tarjeta.
 */
export const PRODUCT_CARD_SIZES =
  "(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

/** Puntos de color en la fila de texto; el resto se resume en «+N». */
const MAX_DOTS = 5;

type ProductCardProps = {
  product: ProductCardView;
  /** Nivel del título según la página (h2 en el catálogo, h3 o h4 dentro de una sección). */
  headingLevel?: 2 | 3 | 4;
  /** Prefetch del Link (por defecto el de Next); false donde la ficha todavía no existe. */
  prefetch?: boolean;
  /** sizes de la imagen si la grilla no es la del catálogo (carrusel, relacionados). */
  sizes?: string;
};

/**
 * Tarjeta de producto (docs/06 §3.2, BD-023): imagen 1:1, chip de línea, nombre, colores y
 * «Ver producto». Toda la tarjeta es un solo enlace. Sin foto (hasta BD-034), el cuadro 1:1
 * muestra los colores reales del producto: el espacio está reservado y no hay saltos (CLS 0).
 *
 * Sin overflow-hidden en el enlace: recortaría la sombra de .lift. Solo el cuadro de la imagen
 * recorta, con el radio interior de la tarjeta (radio menos el borde de 2 px).
 */
export function ProductCard({
  product,
  headingLevel = 3,
  prefetch,
  sizes = PRODUCT_CARD_SIZES,
}: ProductCardProps) {
  const Heading = `h${headingLevel}` as const;
  // Un color repetido (dos SKU del mismo color) se muestra una sola vez.
  const colors = product.colors.filter(
    (color, i, all) => all.findIndex((c) => c.key === color.key) === i,
  );
  const extraDots = colors.length - MAX_DOTS;

  return (
    <Link
      href={product.href as Route}
      prefetch={prefetch}
      className="lift group flex h-full flex-col rounded-lg border-2 border-line bg-paper text-ink no-underline"
    >
      <div className="relative aspect-square overflow-hidden rounded-t-[calc(var(--radius-lg)-2px)] bg-soft">
        {product.image ? (
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes={sizes}
            className="object-contain p-4"
            {...(product.image.blurDataUrl
              ? { placeholder: "blur" as const, blurDataURL: product.image.blurDataUrl }
              : {})}
          />
        ) : (
          // flex-wrap: a 360 px (≈ 120 px útiles) 4 círculos pasan a 2 filas en vez de salirse.
          <div
            aria-hidden="true"
            className="flex h-full flex-wrap content-center items-center justify-center gap-2 p-4 sm:p-6"
          >
            {colors.slice(0, 4).map((color) => (
              <span
                key={color.key}
                className="size-8 shrink-0 rounded-full border-2 border-paper shadow-sm sm:size-10"
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* El título va primero en el DOM (nombre accesible «Bolik Ultra, Bolígrafos…»); el chip
            se ve arriba con order-first. */}
        <Heading className="text-lg leading-tight">{product.name}</Heading>
        <Chip line={product.category.lineGroup} className="order-first self-start">
          {product.category.name}
        </Chip>
        {colors.length > 0 ? (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <span aria-hidden="true" className="flex shrink-0 items-center -space-x-1">
              {colors.slice(0, MAX_DOTS).map((color) => (
                <span
                  key={color.key}
                  className="size-3.5 shrink-0 rounded-full border-2 border-paper"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
              {extraDots > 0 ? (
                <span className="ps-2 text-xs">{ui.cards.moreColors(extraDots)}</span>
              ) : null}
            </span>
            <span>{ui.cards.colors(colors.map((c) => c.name))}</span>
          </p>
        ) : null}
        <span className="mt-auto pt-2 text-sm font-bold text-blue group-hover:underline">
          {ui.cards.viewProduct}
        </span>
      </div>
    </Link>
  );
}
