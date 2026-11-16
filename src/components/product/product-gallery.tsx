import { getImageProps } from "next/image";
import { productPage } from "@/content/product";
import type { ProductImageView } from "@/server/data/types";
import { ProductGalleryIsland } from "./product-gallery-island";

/** Una foto así de ancha se puede ampliar al pasar el mouse (A-31 no aplica: es un zoom). */
export const ZOOM_MIN_WIDTH = 1600;

/** La columna de la galería mide como mucho ~600 px (contenedor de 1280 en dos columnas). */
const SLIDE_SIZES = "(min-width: 80rem) 600px, (min-width: 64rem) 50vw, 100vw";

export type GallerySet = {
  /** Clave del color; null = un solo conjunto, siempre visible (producto de un color). */
  colorKey: string | null;
  colorName: string;
  hex: string;
  images: ProductImageView[];
};

type ProductGalleryProps = {
  id: string;
  productName: string;
  sets: GallerySet[];
  /** Color del primer pintado: su primera foto es la imagen LCP. */
  defaultColor: string | null;
};

/**
 * Galería de la ficha (docs/06 §3.4, BD-062). Un conjunto de fotos por color: solo se ve el del
 * color elegido. Lo decide CSS con los radios de la ficha (estilo en línea de la página,
 * variantStyles), así funciona sin JS y el script previo al pintado (?color=) no mueve nada: los
 * conjuntos ocupan el mismo cuadro 1:1. Al cambiar de color, el nuevo entra con un fundido (A-31).
 *
 * Cada conjunto es una tira con scroll-snap: se desliza con el dedo en móvil y las miniaturas son
 * enlaces a cada foto (#id), que funcionan sin JS. La isla suaviza ese salto, marca la miniatura
 * actual y amplía al pasar el mouse las fotos de 1600 px o más. Sin fotos, el cuadro muestra el
 * color (como la tarjeta del catálogo).
 */
export function ProductGallery({ id, productName, sets, defaultColor }: ProductGalleryProps) {
  const g = productPage.gallery;
  return (
    <div id={id} data-gallery className="flex flex-col gap-3">
      {sets.map((set) => {
        const key = set.colorKey ?? "unico";
        const isDefault = set.colorKey === defaultColor;
        return (
          <div
            key={key}
            className="gallery-set"
            {...(set.colorKey ? { "data-color-variant": set.colorKey } : {})}
            {...(isDefault ? { "data-default": "" } : {})}
          >
            {set.images.length > 0 ? (
              <>
                {/* Enfocable: con el teclado, las flechas recorren las fotos (WCAG 2.1.1). */}
                <ul
                  tabIndex={0}
                  aria-label={g.label}
                  className="gallery-track rounded-xl border-2 border-line bg-paper"
                >
                  {set.images.map((image, index) => {
                    // La primera del color por defecto es la LCP. Las primeras de los demás colores
                    // (data-preload) las pide la isla después de hidratar: oculta (display: none),
                    // una imagen diferida no carga hasta mostrarse y el cambio de color quedaría en
                    // blanco, pero pedirlas de entrada competiría con la LCP. Con ?color=, el script
                    // previo al pintado le da prioridad a la del color elegido.
                    const lcp = isDefault && index === 0;
                    const { props } = getImageProps({
                      src: image.src,
                      alt: image.alt,
                      width: image.width,
                      height: image.height,
                      sizes: SLIDE_SIZES,
                      loading: lcp ? "eager" : "lazy",
                      fetchPriority: lcp ? "high" : undefined,
                    });
                    return (
                      <li
                        key={image.src}
                        id={`${id}-${key}-${index + 1}`}
                        className="gallery-slide"
                        {...(image.width >= ZOOM_MIN_WIDTH ? { "data-zoom": "" } : {})}
                      >
                        {/* Atributos de next/image (getImageProps): mismo loader y srcset, sin JS. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          {...props}
                          alt={image.alt}
                          className="gallery-image"
                          {...(index === 0 && !isDefault ? { "data-preload": "" } : {})}
                        />
                      </li>
                    );
                  })}
                </ul>
                {set.images.length > 1 ? (
                  <ul className="flex gap-2 overflow-x-auto p-1">
                    {set.images.map((image, index) => {
                      const { props } = getImageProps({
                        src: image.src,
                        alt: "",
                        width: 64,
                        height: 64,
                        sizes: "64px",
                      });
                      return (
                        <li key={image.src} className="shrink-0">
                          <a
                            href={`#${id}-${key}-${index + 1}`}
                            data-thumb
                            aria-label={g.thumb(index + 1, set.images.length)}
                            aria-current={index === 0 ? "true" : undefined}
                            className="gallery-thumb grid size-16 place-items-center overflow-hidden rounded-md border-2 border-line bg-paper"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img {...props} alt="" className="size-full object-contain p-1" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </>
            ) : (
              <div
                role="img"
                aria-label={g.noPhoto(productName, set.colorName)}
                className="grid aspect-square place-items-center rounded-xl border-2 border-line bg-soft"
              >
                <span
                  className="size-1/3 rounded-full border-2 border-line-strong"
                  style={{ backgroundColor: set.hex }}
                />
              </div>
            )}
          </div>
        );
      })}
      <ProductGalleryIsland galleryId={id} />
    </div>
  );
}
