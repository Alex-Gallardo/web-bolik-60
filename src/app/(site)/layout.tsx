/**
 * Layout del sitio público (grupo de rutas: no cambia la URL). Header, `<main id="contenido">`,
 * footer, toaster y drawer de cotización llegan en BD-040 a BD-042.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return children;
}
