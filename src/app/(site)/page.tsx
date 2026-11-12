import { VideoHero } from "@/components/hero/video-hero";
import { CatalogSection } from "@/components/home/catalog-section";
import { HistorySection } from "@/components/home/history-section";
import { ProductSpotlight } from "@/components/home/product-spotlight";
import { SchoolsSection } from "@/components/home/schools-section";
import { SolutionsSection } from "@/components/home/solutions-section";
import { StatsBand } from "@/components/home/stats-band";
import { WhereToBuySection } from "@/components/home/where-to-buy-section";
import { WholesaleSection } from "@/components/home/wholesale-section";
import { SITE, buildMetadata } from "@/features/seo/metadata";
import { getFeaturedProduct, listCategories } from "@/server/data/catalog";
import {
  listHeroChapters,
  listMilestones,
  listSchoolActivities,
  listSiteStats,
} from "@/server/data/content";
import { listDepartments, listStores } from "@/server/data/stores";

/** Home: título por defecto sin plantilla (docs/10 §1) y descripción de docs/17 §6. */
export const metadata = buildMetadata({
  title: { absolute: SITE.defaultTitle },
  description: SITE.description,
  path: "/",
});

/**
 * Home (docs/06 §3.1), en el orden del doc: hero (BD-050), cifras (BD-052), soluciones por
 * público y catálogo destacado (BD-051), producto estrella (BD-052), escuelas, mayoreo y empresas,
 * dónde comprar e historia (BD-053). Kits, FAQ y el cierre llegan con BD-054; el orden final se
 * ajusta con el hero nuevo (BD-056).
 */
export default async function HomePage() {
  const [chapters, categories, stats, featured, activities, departments, onlineStores, milestones] =
    await Promise.all([
      listHeroChapters(),
      listCategories(),
      listSiteStats(),
      getFeaturedProduct(),
      listSchoolActivities(),
      listDepartments(),
      listStores({ onlineOnly: true }),
      listMilestones(),
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
      <SchoolsSection activities={activities} />
      <WholesaleSection />
      <WhereToBuySection departments={departments} onlineStores={onlineStores} />
      <HistorySection milestones={milestones} />
    </>
  );
}
