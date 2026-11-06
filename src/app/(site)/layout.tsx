import { FeedbackHost } from "@/components/feedback/feedback-host";
import { Header } from "@/components/layout/header";
import { MainContent } from "@/components/layout/main-content";
import type { NavGroup } from "@/components/layout/products-menu";
import { feedback } from "@/content/feedback";
import { LINE_GROUPS } from "@/lib/constants";
import { listCategories } from "@/server/data/catalog";
import { getSiteSettings } from "@/server/data/content";

/**
 * Layout del sitio público (grupo de rutas: no cambia la URL; docs/06 §2). Estructura:
 * Header (BD-041) · `<main id="contenido">` · Footer y flotantes (BD-042) · RevealObserver
 * (BD-044) · FeedbackHost (BD-024: toasts y diálogos). Las páginas no ponen su propio <main>.
 * Los datos del header llegan como props (components/* no lee server/*).
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [categories, settings] = await Promise.all([listCategories(), getSiteSettings()]);
  const groups: NavGroup[] = LINE_GROUPS.map((line) => ({
    line,
    categories: categories
      .filter((category) => category.lineGroup === line)
      .map(({ name, href }) => ({ name, href })),
  })).filter((group) => group.categories.length > 0);
  const digits = settings.whatsappNumber?.replace(/\D/g, "");
  const whatsappUrl = digits ? `https://wa.me/${digits}` : null;

  return (
    <>
      <Header groups={groups} whatsappUrl={whatsappUrl} />
      <MainContent>{children}</MainContent>
      <FeedbackHost
        messages={{ offline: feedback.system.offline, online: feedback.system.online }}
      />
    </>
  );
}
