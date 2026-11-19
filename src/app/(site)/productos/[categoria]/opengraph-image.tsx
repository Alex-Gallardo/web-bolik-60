import { notFound } from "next/navigation";
import { ogText } from "@/content/og";
import { TAGS } from "@/lib/cache-tags";
import { getCategory, listProducts } from "@/server/data/catalog";
import { OG_CONTENT_TYPE, OG_SIZE, ogImageResponse } from "@/server/seo/og-image";

type Params = { params: Promise<{ categoria: string }> };

/**
 * Una imagen por categoría, con su alt (BD-090). Con generateImageMetadata la URL lleva el id
 * (`…/opengraph-image-{hash}/og`): sin él sería `/productos/{categoria}/opengraph-image`, que
 * proxy.ts tomaría por una ficha que no existe (404).
 */
export async function generateImageMetadata({ params }: Params) {
  const category = await getCategory((await params).categoria);
  if (!category) return []; // la página da 404
  return [
    {
      id: "og",
      alt: ogText.categoryAlt(category.name),
      size: OG_SIZE,
      contentType: OG_CONTENT_TYPE,
    },
  ];
}

/** Nombre, texto corto y la foto del primer producto de la categoría que tenga una. */
export default async function Image({ params }: Params) {
  const { categoria } = await params;
  const category = await getCategory(categoria);
  if (!category) notFound();
  const products = await listProducts({ categorySlug: category.slug });
  return ogImageResponse({
    eyebrow: ogText.categoryEyebrow,
    title: category.name,
    subtitle: category.shortText,
    photoSrc: products.find((product) => product.image)?.image?.src ?? null,
    tags: [TAGS.category(category.slug), TAGS.categories, TAGS.products],
  });
}
