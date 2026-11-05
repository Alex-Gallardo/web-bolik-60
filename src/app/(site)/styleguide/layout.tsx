import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { baloo } from "@/app/fonts";
import { canViewStyleguide } from "@/server/auth/styleguide-access";

/**
 * Vitrina interna (BD-026): en producción, sin sesión de admin, responde 404. Carga también
 * Baloo 2 para mostrar la tipografía infantil (el layout de /escuelas hará lo mismo). `contents`
 * no dibuja caja; no le pongas rol, aria-* ni tabIndex.
 */
export default async function StyleguideLayout({ children }: { children: ReactNode }) {
  if (!(await canViewStyleguide())) notFound();
  return <div className={`${baloo.variable} contents`}>{children}</div>;
}
