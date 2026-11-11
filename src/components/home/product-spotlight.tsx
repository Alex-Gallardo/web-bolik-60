import type { Route } from "next";
import { getImageProps } from "next/image";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { buttonVariants } from "@/components/ui/button-variants";
import { spotlight } from "@/content/home";
import type { ProductView } from "@/server/data/types";
import { UltraIllustration } from "./ultra-illustration";

/**
 * Producto estrella (docs/06 §3.1 sección 5, BD-052): el producto `featured` (el Bolik Ultra) con
 * sus colores y código SAP, presentaciones, beneficios y CTA «Ver ficha» y «Dónde comprar»
 * (docs/17). Server Component sin JS: la foto, cuando exista, sale con getImageProps (como el
 * hero); mientras tanto, una ilustración. Los chips de color son fijos: el cambio de foto por
 * color (A-31) va en la ficha (BD-062), cuando haya fotos.
 */
export function ProductSpotlight({ product }: { product: ProductView }) {
  const titleId = "destacado-titulo";
  const benefits = product.benefits.filter((b) =>
    (spotlight.benefitKeys as readonly string[]).includes(b.iconKey),
  );
  const image = product.image
    ? getImageProps({
        src: product.image.src,
        alt: product.image.alt,
        width: product.image.width,
        height: product.image.height,
        // La columna mide como mucho ~600 px (contenedor de 1280).
        sizes: "(min-width: 80rem) 600px, (min-width: 64rem) 45vw, 100vw",
      }).props
    : null;

  return (
    <Section appearanceKey="home.spotlight" background="paper" aria-labelledby={titleId}>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="order-last lg:order-first" data-reveal>
          {image ? (
            // Atributos de next/image (getImageProps): mismo loader y srcset, sin JS de Image.
            // eslint-disable-next-line @next/next/no-img-element
            <img {...image} alt={image.alt} className="h-auto w-full rounded-xl" />
          ) : (
            <div className="rounded-xl bg-soft p-6">
              <UltraIllustration colors={product.variants.map((v) => v.color)} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <p className="text-sm font-bold tracking-wide text-blue uppercase">{spotlight.eyebrow}</p>
          <h2 id={titleId} className="font-display text-[length:var(--fs-h2)] font-extrabold">
            {product.name}
          </h2>
          <p className="text-[length:var(--fs-lead)] text-text">{product.shortDescription}</p>

          {benefits.length > 0 && (
            <ul aria-label={spotlight.benefitsLabel} className="grid gap-2 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <li key={benefit.iconKey} className="flex items-start gap-2 text-text">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    className="mt-0.5 size-5 shrink-0 fill-none stroke-green"
                  >
                    <path d="m5 12 5 5 9-10" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  {benefit.title}
                </li>
              ))}
            </ul>
          )}

          {product.variants.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-muted">{spotlight.colorsLabel}</h3>
              <ul className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <li
                    key={variant.sku}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line px-4 text-sm font-bold text-ink"
                  >
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full ring-1 ring-line-strong"
                      style={{ backgroundColor: variant.color.hex }}
                    />
                    {spotlight.colorChip(variant.color.name, variant.sku)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.packagings.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-muted">{spotlight.packagingsLabel}</h3>
              <p className="text-text">{product.packagings.map((p) => p.name).join(" · ")}</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Sin precarga: la ficha (BD-062) y Dónde comprar llegan con sus tickets. */}
            <Link
              href={product.href as Route}
              prefetch={false}
              className={buttonVariants({ variant: "primary", block: true })}
              data-event="spotlight_click"
              data-product={product.slug}
            >
              {spotlight.viewProduct}
              <span className="sr-only">{` ${spotlight.viewProductOf(product.name)}`}</span>
            </Link>
            <Link
              href={spotlight.whereToBuy.href as Route}
              prefetch={false}
              className={buttonVariants({ variant: "outline", block: true })}
              data-event="retailer_click"
              data-product={product.slug}
            >
              {spotlight.whereToBuy.label}
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
