import { Suspense } from "react";
import { MainContent } from "@/components/layout/main-content";

/**
 * Layout del panel administrativo (BD-114). Cada página valida la sesión y el rol con requireRole
 * (src/server/auth/guards.ts); proxy.ts solo manda al login a quien no trae la cookie. Leer la
 * cookie hace dinámica la página: con Cache Components va dentro de un <Suspense>. Lleva su
 * `<main id="contenido">` para «Saltar al contenido» (BD-040). El menú lateral, el encabezado y
 * los avisos (toasts) llegan con BD-115; entonces el <main> envuelve solo el contenido.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <MainContent>
      <Suspense>{children}</Suspense>
    </MainContent>
  );
}
