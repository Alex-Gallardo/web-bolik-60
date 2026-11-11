import { VideoHero } from "@/components/hero/video-hero";
import { CatalogSection } from "@/components/home/catalog-section";
import { ProductSpotlight } from "@/components/home/product-spotlight";
import { SolutionsSection } from "@/components/home/solutions-section";
import { StatsBand } from "@/components/home/stats-band";
import { SITE, buildMetadata } from "@/features/seo/metadata";
import { getFeaturedProduct, listCategories } from "@/server/data/catalog";
import { listHeroChapters, listSiteStats } from "@/server/data/content";

/** Home: título por defecto sin plantilla (docs/10 §1) y descripción de docs/17 §6. */
export const metadata = buildMetadata({
  title: { absolute: SITE.defaultTitle },
  description: SITE.description,
  path: "/",
});

/**
 * Home (docs/06 §3.1), en el orden del doc: hero (BD-050), cifras (BD-052), soluciones por
 * público y catálogo destacado (BD-051) y producto estrella (BD-052). El resto de secciones llega
 * con BD-053 y BD-054; el orden final se ajusta con el hero nuevo (BD-056).
 */
export default async function HomePage() {
  const [chapters, categories, stats, featured] = await Promise.all([
    listHeroChapters(),
    listCategories(),
    listSiteStats(),
    getFeaturedProduct(),
  ]);
  // Solo cifras publicadas: sin ella, el texto no dice cuántos productos hay.
  const productCount = stats.find((stat) => stat.key === "productos")?.value ?? null;
  return (
    <>
      <VideoHero chapters={chapters} />
      <StatsBand items={stats} />
      <SolutionsSection />
      <CatalogSection categories={categories} productCount={productCount} />
      {featured && <ProductSpotlight product={featured} />}
    </>
  );
}
