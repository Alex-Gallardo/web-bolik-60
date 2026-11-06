import { FeedbackHost } from "@/components/feedback/feedback-host";
import { Header } from "@/components/layout/header";
import { MainContent } from "@/components/layout/main-content";
import type { NavGroup } from "@/components/layout/products-menu";
import { feedback } from "@/content/feedback";
import { LINE_GROUPS } from "@/lib/constants";
import { whatsappUrl } from "@/lib/whatsapp";
import { listCategories } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/content";

/**
 * Layout del sitio público (grupo de rutas: no cambia la URL; docs/06 §2). Estructura:
 * Header (BD-041) · `<main id="contenido">` · Footer y flotantes (BD-042) · RevealObserver
 * (BD-044) · FeedbackHost (BD-024: toasts y diálogos). Las páginas no ponen su propio <main>.
 * Los datos del header llegan como props: components/* no llama a server/* (solo importa tipos).
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [categories, settings] = await Promise.all([listCategories(), getSiteSettings()]);
  const groups: NavGroup[] = LINE_GROUPS.map((line) => ({
    line,
    categories: categories
      .filter((category) => category.lineGroup === line)
      .map(({ name, href }) => ({ name, href })),
  })).filter((group) => group.categories.length > 0);
  // Helper de lib/whatsapp: agrega el 502 y descarta números inválidos (null = sin botón).
  const whatsapp = settings.whatsappNumber ? whatsappUrl(settings.whatsappNumber) : null;

  return (
    <>
      <Header groups={groups} whatsappUrl={whatsapp} />
      <MainContent>{children}</MainContent>
      <FeedbackHost
        messages={{ offline: feedback.system.offline, online: feedback.system.online }}
      />
    </>
  );
}
