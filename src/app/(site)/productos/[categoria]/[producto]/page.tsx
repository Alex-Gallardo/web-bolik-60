import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCtaSection } from "@/components/home/final-cta-section";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Section } from "@/components/layout/section";
import { DimensionDiagram, hasPenDiagram } from "@/components/product/dimension-diagram";
import { ProductGallery, type GallerySet } from "@/components/product/product-gallery";
import {
  ProductPurchase,
  type PurchasePack,
  type PurchaseVariant,
} from "@/components/product/product-purchase";
import { ProductRelated } from "@/components/product/product-related";
import { ProductWhereToBuy } from "@/components/product/product-where-to-buy";
import { Accordion } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button-variants";
import { Chip } from "@/components/ui/chip";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { feedback } from "@/content/feedback";
import { productPage as t } from "@/content/product";
import { ui } from "@/content/ui";
import { productMeta } from "@/features/catalog/product-meta";
import { colorPrepaintScript, variantStyles } from "@/features/catalog/variant-color";
import { faqPageJsonLd, JsonLd, productGroupJsonLd } from "@/features/seo/jsonld";
import { buildMetadata, SITE } from "@/features/seo/metadata";
import { BRAND_LABELS, PACKAGING_LABELS } from "@/lib/constants";
import { whatsappMessage, whatsappUrl } from "@/lib/whatsapp";
import { getProduct, listProducts } from "@/server/data/catalog";
import { getSiteSettings, listFaqs } from "@/server/data/content";
import { listStores } from "@/server/data/stores";
import type { ProductView } from "@/server/data/types";

/**
 * La ficha lee sus params fuera de un Suspense, a propósito: con un Suspense, el HTML prerenderizado
 * trae primero un esqueleto y el contenido queda oculto hasta que un script lo cambia (sin JS no se
 * vería). Así se le dice a Next 16 (Partial Prefetching) que llegar a una ficha puede esperar a
 * que baje: todas están prerenderizadas (generateStaticParams), así que es un archivo estático.
 */
export const instant = false;

/** id del contenedor de la ficha: lo usan el CSS por color, el script previo al pintado y la isla. */
const FICHA_ID = "ficha";

/**
 * Las fichas publicadas, en el build. Como en la categoría: sin dynamicParams en Cache
 * Components, una ficha que no existe (o en otra categoría) la responde proxy.ts con un 404 real
 * (server/seo/catalog-routes.ts); el notFound() de la página queda de respaldo.
 */
export async function generateStaticParams() {
  const products = await listProducts();
  return products
    .filter((product) => product.skus.length > 0)
    .map((product) => ({
      categoria: product.category.slug,
      producto: product.slug,
    }));
}

export async function generateMetadata({
  params,
}: PageProps<"/productos/[categoria]/[producto]">): Promise<Metadata> {
  const { categoria, producto } = await params;
  const product = await getProduct(categoria, producto);
  if (!product) return {};
  const { title, description } = productMeta(product);
  // Canónica sin ?color=: una sola URL por producto (docs/06 §3.4).
  // La imagen la pone su opengraph-image.tsx (nombre y foto, BD-090).
  return buildMetadata({ title, description, path: product.href, image: false });
}

/** Un conjunto de fotos por color (sus fotos y las generales); uno solo si tiene un color. */
function gallerySets(product: ProductView): GallerySet[] {
  const general = product.images.filter((image) => image.colorKey === null);
  if (product.variants.length <= 1) {
    const color = product.variants[0]!.color;
    return [{ colorKey: null, colorName: color.name, hex: color.hex, images: product.images }];
  }
  return product.variants.map(({ color }) => ({
    colorKey: color.key,
    colorName: color.name,
    hex: color.hex,
    images: [...product.images.filter((image) => image.colorKey === color.key), ...general],
  }));
}

/** Para la isla de compra: textos ya armados (sin llevar content/ ni constants.ts al navegador). */
function purchaseVariants(product: ProductView): PurchaseVariant[] {
  return product.variants.map((variant) => ({
    sku: variant.sku,
    colorKey: variant.color.key,
    colorName: variant.color.name,
    hex: variant.color.hex,
    announce: feedback.catalog.colorChanged(variant.color.name, variant.sku).title,
    image:
      product.images.find((i) => i.kind === "main" && i.colorKey === variant.color.key)?.src ??
      null,
    isDefault: variant.isDefault,
  }));
}

function purchasePacks(product: ProductView): PurchasePack[] {
  return product.packagings.map((pack) => {
    const labels = PACKAGING_LABELS[pack.code];
    return {
      code: pack.code,
      name: pack.name,
      unitsLabel: t.packagings.units(pack.unitsPerPack),
      units: pack.unitsPerPack,
      question: t.quantityQuestion(labels.plural, t.masculinePacks.includes(pack.code)),
      singular: labels.singular,
      plural: labels.plural,
      wholesale: pack.isWholesale,
    };
  });
}

/**
 * Ficha de producto (docs/06 §3.4, BD-062): galería por color, chip de línea (y de marca si no es
 * Bolik), h1, tagline y descripción, color con su código y código de barras, presentación,
 * cantidad, «Agregar a mi cotización», «Dónde comprar» y WhatsApp; luego datos clave, beneficios,
 * usos, pestañas (especificaciones, medidas y empaque, para distribuidores, seguridad), las
 * presentaciones con los códigos por color, las preguntas y el cierre de la home. Todo en el HTML
 * del servidor; cambiar de color no recarga (CSS + isla). JSON-LD: ProductGroup con variantes,
 * BreadcrumbList (migas) y FAQPage. BD-063 suma el diagrama de medidas (en su pestaña, con la tabla
 * como alternativa), «Dónde comprar este producto» y «También te puede servir».
 */
export default async function ProductPage({
  params,
}: PageProps<"/productos/[categoria]/[producto]">) {
  const { categoria, producto } = await params;
  const product = await getProduct(categoria, producto);
  // Sin colores publicados (los despublicó el admin o SAP) no hay ficha que mostrar.
  if (!product || product.variants.length === 0) notFound();

  const [faqs, settings, stores] = await Promise.all([
    listFaqs({ scope: "product", productSlug: product.slug }),
    getSiteSettings(),
    listStores(),
  ]);
  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0]!;
  const multiColor = product.variants.length > 1;
  const colorKeys = product.variants.map((v) => v.color.key);
  const sets = gallerySets(product);
  const defaultPack =
    product.packagings.find((p) => p.isWholesale)?.code ?? product.packagings[0]?.code ?? null;
  const generalWhatsapp = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, whatsappMessage({ context: "general" }))
    : null;
  // Sin JS, el botón de la ficha abre WhatsApp con el color por defecto.
  const productWhatsapp = settings.whatsappNumber
    ? whatsappUrl(
        settings.whatsappNumber,
        whatsappMessage({
          context: "product",
          item: {
            name: multiColor ? `${product.name} ${defaultVariant.color.name}` : product.name,
            sku: defaultVariant.sku,
          },
          url: new URL(product.href, SITE.url).toString(),
        }),
      )
    : null;
  const crumbs = [
    { name: t.breadcrumbs.home, path: "/" },
    { name: t.breadcrumbs.catalog, path: t.breadcrumbs.catalogHref },
    { name: product.category.name, path: `/productos/${product.category.slug}` },
    { name: product.name, path: product.href },
  ];
  const variantAttrs = (key: string) =>
    multiColor
      ? {
          "data-color-variant": key,
          ...(key === defaultVariant.color.key ? { "data-default": "" } : {}),
        }
      : {};

  const tabs: TabItem[] = [
    ...(product.specs.length > 0
      ? [
          {
            value: "especificaciones",
            label: t.tabs.specs,
            content: (
              <div className="grid gap-6 md:grid-cols-2">
                {product.specs.map((group) => (
                  <div key={group.name}>
                    <h3 className="text-lg">{group.name}</h3>
                    <dl className="mt-2 divide-y-2 divide-line">
                      {group.items.map((item) => (
                        <div key={item.label} className="grid grid-cols-2 gap-3 py-2">
                          <dt className="font-bold text-ink">{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ),
          },
        ]
      : []),
    ...(product.dimensions.length > 0
      ? [
          {
            value: "medidas",
            label: t.tabs.dimensions,
            content: (
              <div className="flex flex-col gap-8">
                {hasPenDiagram(product.dimensions) ? (
                  <DimensionDiagram
                    id="ficha-cota"
                    productName={product.name}
                    dimensions={product.dimensions}
                  />
                ) : null}
                {/* La tabla es la alternativa accesible del diagrama (criterio de BD-063). */}
                <table className="w-full max-w-xl text-left">
                  <caption className="pb-2 text-left text-sm text-muted">
                    {t.dimensions.caption(product.name)}
                  </caption>
                  <thead>
                    <tr className="border-b-2 border-line">
                      <th scope="col" className="py-2">
                        {t.dimensions.part}
                      </th>
                      <th scope="col" className="py-2">
                        {t.dimensions.value}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-line">
                    {product.dimensions.map((d) => (
                      <tr key={d.partKey}>
                        <th scope="row" className="py-2 font-normal">
                          {d.label}
                        </th>
                        <td className="py-2">{t.dimensions.mm(d.valueMm, d.tolerance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          },
        ]
      : []),
    ...(product.packagings.length > 0
      ? [
          {
            value: "distribuidores",
            label: t.tabs.distributors,
            content: (
              <div className="flex flex-col gap-5">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left">
                    <caption className="pb-2 text-left text-sm text-muted">
                      {t.distributors.caption}
                    </caption>
                    <thead>
                      <tr className="border-b-2 border-line">
                        <th scope="col" className="py-2 pe-3">
                          {t.distributors.pack}
                        </th>
                        <th scope="col" className="py-2 pe-3">
                          {t.distributors.units}
                        </th>
                        <th scope="col" className="py-2 pe-3">
                          {t.distributors.inner}
                        </th>
                        <th scope="col" className="py-2 pe-3">
                          {t.distributors.size}
                        </th>
                        <th scope="col" className="py-2">
                          {t.distributors.weight}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-line">
                      {product.packagings.map((p) => (
                        <tr key={p.code}>
                          <th scope="row" className="py-2 pe-3">
                            {p.name}
                          </th>
                          <td className="py-2 pe-3">{p.unitsPerPack.toLocaleString("es-GT")}</td>
                          <td className="py-2 pe-3">
                            {p.innerPacks ? t.distributors.innerValue(p.innerPacks) : "—"}
                          </td>
                          <td className="py-2 pe-3">
                            {p.lengthMm && p.widthMm && p.heightMm
                              ? t.distributors.sizeValue(p.lengthMm, p.widthMm, p.heightMm)
                              : t.distributors.pending}
                          </td>
                          <td className="py-2">
                            {p.weightG
                              ? t.distributors.weightValue(p.weightG)
                              : t.distributors.pending}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Link
                  href={t.distributors.cta.href as Route}
                  prefetch={false}
                  className={buttonVariants({ variant: "primary", className: "self-start" })}
                >
                  {t.distributors.cta.label}
                </Link>
              </div>
            ),
          },
        ]
      : []),
    ...(product.safetyWarning
      ? [
          {
            value: "seguridad",
            label: t.tabs.safety,
            content: <p className="max-w-3xl">{product.safetyWarning}</p>,
          },
        ]
      : []),
  ];

  return (
    <div id={FICHA_ID} data-ficha>
      {multiColor ? (
        // Qué fotos y qué código se ven según el radio de color (features/catalog/variant-color.ts).
        <style dangerouslySetInnerHTML={{ __html: variantStyles(FICHA_ID, colorKeys) }} />
      ) : null}
      <Section spacing="sm">
        {/* Sin precarga: el JS del catálogo y de la categoría contaría en el de la ficha (docs/12 §2). */}
        <Breadcrumbs crumbs={crumbs} label={t.breadcrumbs.label} prefetch={false} />
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <ProductGallery
              id={`${FICHA_ID}-galeria`}
              productName={product.name}
              sets={sets}
              defaultColor={multiColor ? defaultVariant.color.key : null}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Chip line={product.category.lineGroup}>{ui.lines[product.category.lineGroup]}</Chip>
              {product.brand !== "bolik" ? (
                <Chip>{t.brandLabel(BRAND_LABELS[product.brand])}</Chip>
              ) : null}
            </div>
            <h1 className="text-[length:var(--fs-h1)]">{product.name}</h1>
            {product.tagline ? (
              <p className="text-[length:var(--fs-lead)] font-bold text-ink">{product.tagline}</p>
            ) : null}
            <p className="text-text">{product.description ?? product.shortDescription}</p>
            <div className="text-sm text-muted">
              {product.variants.map((variant) => (
                <p key={variant.sku} {...variantAttrs(variant.color.key)}>
                  {t.colorLine(variant.color.name, variant.sku)}
                  <br />
                  {t.barcodeLine(variant.barcode)}
                </p>
              ))}
            </div>
            <ProductPurchase
              fichaId={FICHA_ID}
              productName={product.name}
              href={product.href}
              siteUrl={SITE.url}
              variants={purchaseVariants(product)}
              packagings={purchasePacks(product)}
              defaultPack={defaultPack}
              whatsappPhone={productWhatsapp ? settings.whatsappNumber : null}
              whatsappHref={productWhatsapp}
              whereToBuy={t.whereToBuy}
              prepaintScript={multiColor ? colorPrepaintScript(FICHA_ID, colorKeys) : null}
            />
          </div>
        </div>
      </Section>

      {product.keyFacts.length > 0 ? (
        <Section spacing="sm" background="soft" aria-labelledby="ficha-datos-clave">
          <h2 id="ficha-datos-clave" className="text-[length:var(--fs-h2)]">
            {t.keyFacts(product.name)}
          </h2>
          <ul className="mt-6 grid max-w-4xl list-disc gap-2 ps-6 text-[length:var(--fs-lead)]">
            {product.keyFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {product.benefits.length > 0 || product.uses.length > 0 ? (
        <Section spacing="sm">
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            {product.benefits.length > 0 ? (
              <section aria-labelledby="ficha-beneficios">
                <h2 id="ficha-beneficios" className="text-[length:var(--fs-h2)]">
                  {t.benefitsTitle}
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {product.benefits.map((benefit) => (
                    <li
                      key={benefit.iconKey}
                      className="flex gap-3 rounded-lg border-2 border-line bg-paper p-4"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                        className="mt-0.5 size-6 shrink-0 fill-none stroke-green"
                      >
                        <path d="m5 12 5 5 9-10" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <div>
                        <h3 className="text-base">{benefit.title}</h3>
                        {benefit.text ? <p className="mt-1 text-sm">{benefit.text}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {product.uses.length > 0 ? (
              <section aria-labelledby="ficha-usos">
                <h2 id="ficha-usos" className="text-[length:var(--fs-h2)]">
                  {t.usesTitle}
                </h2>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {product.uses.map((use) => (
                    <li key={use.slug}>
                      <Chip size="md">{use.name}</Chip>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </Section>
      ) : null}

      {tabs.length > 0 ? (
        <Section spacing="sm">
          <Tabs label={t.tabs.label} items={tabs} headingLevel={2} />
        </Section>
      ) : null}

      <Section spacing="sm" background="soft" aria-labelledby="ficha-presentaciones">
        <h2 id="ficha-presentaciones" className="text-[length:var(--fs-h2)]">
          {product.packagings.length > 0 ? t.packagings.title : t.packagings.codesTitle}
        </h2>
        {product.packagings.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {product.packagings.map((p) => (
              <li key={p.code} className="rounded-lg border-2 border-line bg-paper p-4">
                <h3 className="text-base">{p.name}</h3>
                <p className="mt-1 text-sm text-muted">{t.packagings.units(p.unitsPerPack)}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full max-w-3xl min-w-[22rem] text-left">
            <caption className="pb-2 text-left font-bold text-ink">
              {t.packagings.codesCaption(product.name)}
            </caption>
            <thead>
              <tr className="border-b-2 border-line">
                <th scope="col" className="py-2 pe-3">
                  {t.packagings.color}
                </th>
                <th scope="col" className="py-2 pe-3">
                  {t.packagings.sku}
                </th>
                <th scope="col" className="py-2">
                  {t.packagings.barcode}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-line">
              {product.variants.map((variant) => (
                <tr key={variant.sku}>
                  <th scope="row" className="py-2 pe-3">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-4 shrink-0 rounded-full border-2 border-line-strong"
                        style={{ backgroundColor: variant.color.hex }}
                      />
                      {variant.color.name}
                    </span>
                  </th>
                  <td className="py-2 pe-3">{variant.sku}</td>
                  <td className="py-2">{variant.barcode ?? t.packagings.pendingBarcode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <ProductWhereToBuy stores={stores} sku={defaultVariant.sku} />

      {faqs.length > 0 ? (
        <Section aria-labelledby="ficha-faq">
          <div className="mx-auto max-w-[860px]">
            <h2 id="ficha-faq" className="text-[length:var(--fs-h2)]">
              {t.faqTitle}
            </h2>
            <Accordion
              className="mt-8"
              exclusive="faq-producto"
              items={faqs.map((faq) => ({
                id: `faq-${faq.key}`,
                title: faq.question,
                content: <p>{faq.answer}</p>,
              }))}
            />
          </div>
          <JsonLd data={faqPageJsonLd(faqs)} />
        </Section>
      ) : null}

      <ProductRelated products={product.related} />

      <FinalCtaSection whatsappUrl={generalWhatsapp} />

      <JsonLd
        data={productGroupJsonLd({
          name: product.name,
          slug: product.slug,
          description: product.description ?? product.shortDescription,
          path: product.href,
          brand: BRAND_LABELS[product.brand],
          manufacturer: settings.legalName,
          images: product.images.map((image) => image.src),
          specs: product.specs.flatMap((group) => group.items),
          variants: purchaseVariants(product).map((v) => ({
            sku: v.sku,
            barcode: product.variants.find((pv) => pv.sku === v.sku)!.barcode,
            colorKey: v.colorKey,
            colorName: v.colorName,
            image: v.image,
          })),
        })}
      />
    </div>
  );
}
