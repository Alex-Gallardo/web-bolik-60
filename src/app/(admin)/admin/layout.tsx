/**
 * Layout del panel administrativo. Verificación de sesión (requireRole) y menú lateral llegan con
 * los tickets de E11; mientras no exista una página, /admin responde 404.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
