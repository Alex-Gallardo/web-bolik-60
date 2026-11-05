import { MainContent } from "@/components/layout/main-content";

/**
 * Layout del panel administrativo. Verificación de sesión (requireRole) y menú lateral llegan con
 * los tickets de E11; mientras no exista una página, /admin responde 404. Lleva su
 * `<main id="contenido">` para el enlace «Saltar al contenido» del layout raíz (BD-040).
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <MainContent>{children}</MainContent>;
}
