import { FeedbackHost } from "@/components/feedback/feedback-host";
import { MainContent } from "@/components/layout/main-content";
import { feedback } from "@/content/feedback";

/**
 * Layout del sitio público (grupo de rutas: no cambia la URL; docs/06 §2). Estructura:
 * Header (BD-041) · `<main id="contenido">` · Footer y flotantes (BD-042) · RevealObserver
 * (BD-044) · FeedbackHost (BD-024: toasts y diálogos). Las páginas no ponen su propio <main>.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MainContent>{children}</MainContent>
      <FeedbackHost
        messages={{ offline: feedback.system.offline, online: feedback.system.online }}
      />
    </>
  );
}
