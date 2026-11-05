import type { Metadata } from "next";
import { getFeaturedProduct, listCategories, listProducts } from "@/server/data/catalog";
import { listFaqs } from "@/server/data/content";
import { listDepartments, listStores } from "@/server/data/stores";
import { SgNav } from "./_components/sg-nav";
import { BackgroundsSection } from "./_sections/backgrounds-section";
import { BrandSection } from "./_sections/brand-section";
import { ButtonsSection } from "./_sections/buttons-section";
import { CardsSection } from "./_sections/cards-section";
import { ColorSection } from "./_sections/color-section";
import { DomainSection } from "./_sections/domain-section";
import { FeedbackSection } from "./_sections/feedback-section";
import { FormsSection } from "./_sections/forms-section";
import { IconsSection } from "./_sections/icons-section";
import { MotionSection } from "./_sections/motion-section";
import { NavigationSection } from "./_sections/navigation-section";
import { SpacingSection } from "./_sections/spacing-section";
import { TypographySection } from "./_sections/typography-section";

/**
 * /styleguide (BD-026, docs/08 §6): todo el sistema con los componentes reales, en 13 secciones
 * con ancla. Interna: noindex (aquí y en X-Robots-Tag de next.config.ts) y 404 en producción sin
 * sesión de admin (layout). Datos de ejemplo fijos (prisma/seed): nada aleatorio, para que las
 * capturas de la regresión visual (BD-133) no cambien.
 */
export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

export default async function StyleguidePage() {
  const [departments, products, categories, stores, featured, faqs] = await Promise.all([
    listDepartments(),
    listProducts(),
    listCategories(),
    listStores(),
    getFeaturedProduct(),
    listFaqs({ scope: "home" }),
  ]);

  return (
    <div className="container-site flex flex-col gap-8 py-16 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <header className="flex flex-col gap-2 lg:col-span-2">
        <p className="eyebrow text-blue">Bolik Digital</p>
        <h1>Styleguide</h1>
        <p className="max-w-[var(--measure)] text-muted">
          El sistema de diseño con las piezas reales del sitio, en todos sus estados. Uso interno.
        </p>
      </header>
      <SgNav />
      <div className="flex min-w-0 flex-col gap-16">
        <BrandSection />
        <ColorSection />
        <TypographySection />
        <SpacingSection />
        <BackgroundsSection />
        <ButtonsSection />
        <FormsSection departments={departments.map(({ slug, name }) => ({ slug, name }))} />
        <CardsSection products={products} categories={categories} stores={stores} />
        <NavigationSection featured={featured} faqs={faqs} />
        <FeedbackSection productName={products[0]?.name ?? ""} storeName={stores[0]?.name ?? ""} />
        <MotionSection />
        <DomainSection />
        <IconsSection />
      </div>
    </div>
  );
}
