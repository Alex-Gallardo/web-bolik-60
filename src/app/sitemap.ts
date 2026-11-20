import type { MetadataRoute } from "next";
import { SITE } from "@/features/seo/metadata";
import { buildSitemap } from "@/features/seo/sitemap";
import { listSitemapEntries } from "@/server/data/sitemap";

/** /sitemap.xml (BD-092): se regenera con los tags del catálogo y, de respaldo, cada hora. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await listSitemapEntries(), SITE.url);
}
