import { VideoHero } from "@/components/hero/video-hero";
import { CatalogSection } from "@/components/home/catalog-section";
import { FaqSection } from "@/components/home/faq-section";
import { FinalCtaSection } from "@/components/home/final-cta-section";
import { HistorySection } from "@/components/home/history-section";
import { KitsSection } from "@/components/home/kits-section";
import { MainHero } from "@/components/home/main-hero";
import { ProductSpotlight } from "@/components/home/product-spotlight";
import { SchoolsSection } from "@/components/home/schools-section";
import { SolutionsSection } from "@/components/home/solutions-section";
import { StatsBand } from "@/components/home/stats-band";
import { WhereToBuySection } from "@/components/home/where-to-buy-section";
import { WholesaleSection } from "@/components/home/wholesale-section";
import { floatingText } from "@/content/footer";
import { SITE, buildMetadata } from "@/features/seo/metadata";
import { whatsappUrl } from "@/lib/whatsapp";
import { getFeaturedProduct, listCategories } from "@/server/data/catalog";
import {
  getSiteSettings,
  listFaqs,
  listHeroChapters,
  listKits,
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
 * Home (docs/06 §3.1), en el orden del doc: hero principal con el h1 (BD-056), cifras (BD-052),
 * video por capítulos (BD-050), soluciones por público y catálogo destacado (BD-051), producto
 * estrella (BD-052), escuelas, mayoreo y empresas, dónde comprar (BD-053), kits, historia,
 * preguntas frecuentes y el cierre (BD-054). Cada sección lee su fondo de SectionAppearance.
 */
export default async function HomePage() {
  const [
    chapters,
    categories,
    stats,
    featured,
    activities,
    departments,
    onlineStores,
    milestones,
    kits,
    faqs,
    settings,
  ] = await Promise.all([
    listHeroChapters(),
    listCategories(),
    listSiteStats(),
    getFeaturedProduct(),
    listSchoolActivities(),
    listDepartments(),
    listStores({ onlineOnly: true }),
    listMilestones(),
    listKits(),
    listFaqs({ scope: "home" }),
    getSiteSettings(),
  ]);
  // Solo cifras publicadas: sin ella, el texto no dice cuántos productos hay.
  const productCount = stats.find((stat) => stat.key === "productos")?.value ?? null;
  // Como en el layout: null (sin número válido) = sin botón de WhatsApp.
  const whatsapp = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, floatingText.whatsappMessage)
    : null;
  return (
    <>
      <MainHero colors={featured?.variants.map((variant) => variant.color) ?? []} />
      <StatsBand items={stats} />
      <VideoHero chapters={chapters} />
      <SolutionsSection />
      <CatalogSection categories={categories} productCount={productCount} />
      {featured && <ProductSpotlight product={featured} />}
      <SchoolsSection activities={activities} />
      <WholesaleSection />
      <WhereToBuySection departments={departments} onlineStores={onlineStores} />
      <KitsSection kits={kits} enabled={settings.kitsEnabled} />
      <HistorySection milestones={milestones} />
      <FaqSection faqs={faqs} />
      <FinalCtaSection whatsappUrl={whatsapp} />
    </>
  );
}
