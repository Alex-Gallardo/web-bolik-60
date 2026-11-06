import { FeedbackHost } from "@/components/feedback/feedback-host";
import { FloatingActions } from "@/components/layout/floating-actions";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MainContent } from "@/components/layout/main-content";
import { PAGE_ID, PageEnter } from "@/components/motion/page-enter";
import { RevealObserver } from "@/components/motion/reveal-observer";
import type { NavGroup } from "@/components/layout/products-menu";
import { feedback } from "@/content/feedback";
import { floatingText } from "@/content/footer";
import { LINE_GROUPS } from "@/lib/constants";
import { whatsappUrl } from "@/lib/whatsapp";
import { listCategories } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/content";

/**
 * Layout del sitio público (grupo de rutas: no cambia la URL; docs/06 §2). Estructura:
 * Header (BD-041) · `<main id="contenido">` (con PageEnter: entrada de página A-02) · Footer y
 * flotantes (BD-042) · RevealObserver (BD-044, reveals A-21) · FeedbackHost (BD-024: toasts y
 * diálogos). Las páginas no ponen su propio <main>.
 * Los datos del header y del pie llegan como props: components/* no llama a server/* (solo
 * importa tipos).
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [categories, settings] = await Promise.all([listCategories(), getSiteSettings()]);
  const groups: NavGroup[] = LINE_GROUPS.map((line) => ({
    line,
    categories: categories
      .filter((category) => category.lineGroup === line)
      .map(({ name, href }) => ({ name, href })),
  })).filter((group) => group.categories.length > 0);
  // Helper de lib/whatsapp: agrega el 502 y descarta números inválidos (null = sin botón). Mensaje
  // general prellenado en el menú y los flotantes; BD-067 trae las plantillas por contexto.
  const whatsapp = settings.whatsappNumber
    ? whatsappUrl(settings.whatsappNumber, floatingText.whatsappMessage)
    : null;

  return (
    <>
      <Header groups={groups} whatsappUrl={whatsapp} />
      <MainContent>
        {/* Contenedor de la página: lo anima PageEnter al cambiar de ruta (A-02). */}
        <div id={PAGE_ID} className="flex flex-1 flex-col">
          {children}
        </div>
        <PageEnter />
      </MainContent>
      <Footer
        categories={groups.flatMap((group) => group.categories)}
        legalName={settings.legalName}
        address={settings.address}
        phone={settings.phone}
        businessHours={settings.businessHours}
        facebookUrl={settings.socialFacebook}
        kitsEnabled={settings.kitsEnabled}
      />
      <FloatingActions whatsappUrl={whatsapp} />
      <RevealObserver />
      <FeedbackHost
        messages={{ offline: feedback.system.offline, online: feedback.system.online }}
      />
    </>
  );
}
