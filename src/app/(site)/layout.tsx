import { FeedbackHost } from "@/components/feedback/feedback-host";
import { feedback } from "@/content/feedback";

/**
 * Layout del sitio público (grupo de rutas: no cambia la URL). FeedbackHost (BD-024) monta los
 * avisos de toasts y diálogos; header, `<main id="contenido">`, footer y drawer de cotización
 * llegan en BD-040 a BD-042.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <FeedbackHost
        messages={{ offline: feedback.system.offline, online: feedback.system.online }}
      />
    </>
  );
}
