import { VideoHero } from "@/components/hero/video-hero";
import { CatalogSection } from "@/components/home/catalog-section";
import { SolutionsSection } from "@/components/home/solutions-section";
import { SITE, buildMetadata } from "@/features/seo/metadata";
import { listCategories } from "@/server/data/catalog";
import { listHeroChapters, listSiteStats } from "@/server/data/content";

/** Home: título por defecto sin plantilla (docs/10 §1) y descripción de docs/17 §6. */
export const metadata = buildMetadata({
  title: { absolute: SITE.defaultTitle },
  description: SITE.description,
  path: "/",
});

/**
 * Home (docs/06 §3.1): hero (BD-050), soluciones por público y catálogo destacado (BD-051). El
 * resto de secciones llega con BD-052 a BD-054; el orden final se ajusta con el hero nuevo
 * (BD-056).
 */
export default async function HomePage() {
  const [chapters, categories, stats] = await Promise.all([
    listHeroChapters(),
    listCategories(),
    listSiteStats(),
  ]);
  // Solo cifras publicadas: sin ella, el texto no dice cuántos productos hay.
  const productCount = stats.find((stat) => stat.key === "productos")?.value ?? null;
  return (
    <>
      <VideoHero chapters={chapters} />
      <SolutionsSection />
      <CatalogSection categories={categories} productCount={productCount} />
    </>
  );
}
