import { notFound } from "next/navigation";
import { ogText } from "@/content/og";
import { TAGS } from "@/lib/cache-tags";
import { getProduct } from "@/server/data/catalog";
import { OG_CONTENT_TYPE, OG_SIZE, ogImageResponse } from "@/server/seo/og-image";

type Params = { params: Promise<{ categoria: string; producto: string }> };

/** Una imagen por ficha, con su alt (BD-090); el id evita que proxy.ts la tome por una ruta del catálogo. */
export async function generateImageMetadata({ params }: Params) {
  const { categoria, producto } = await params;
  const product = await getProduct(categoria, producto);
  if (!product) return []; // la página da 404
  return [
    {
      id: "og",
      alt: ogText.productAlt(product.name, product.category.name.toLocaleLowerCase("es-GT")),
      size: OG_SIZE,
      contentType: OG_CONTENT_TYPE,
    },
  ];
}

/** Categoría, nombre, tagline y la foto principal del color por defecto (si la hay). */
export default async function Image({ params }: Params) {
  const { categoria, producto } = await params;
  const product = await getProduct(categoria, producto);
  if (!product) notFound();
  return ogImageResponse({
    eyebrow: product.category.name,
    title: product.name,
    subtitle: product.tagline,
    photoSrc: product.image?.src ?? null,
    // Los de getProduct: también el sync de SAP (revalidateTag(TAGS.products)) la renueva.
    tags: [
      TAGS.product(product.slug),
      TAGS.category(product.category.slug),
      TAGS.products,
      TAGS.categories,
    ],
  });
}
