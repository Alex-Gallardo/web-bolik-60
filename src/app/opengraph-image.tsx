import { ogText } from "@/content/og";
import { OG_CONTENT_TYPE, OG_SIZE, ogImageResponse } from "@/server/seo/og-image";

/**
 * Imagen Open Graph por defecto (BD-090, docs/10 §3): la home y toda página sin una propia (el
 * catálogo, la cotización, el buscador). Se genera en el build.
 */
export const alt = ogText.defaultAlt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImageResponse({ title: ogText.defaultTitle, subtitle: ogText.defaultSubtitle });
}
