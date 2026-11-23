import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { baloo } from "@/app/fonts";
import { env } from "@/env";
import { isStyleguideVisible } from "@/lib/styleguide-access";
import { canViewStyleguide } from "@/server/auth/styleguide-access";

/** Sin sesión de admin en producción, 404 (la decisión lee la cookie: va dentro del Suspense). */
async function StyleguideGate({ children }: { children: ReactNode }) {
  if (!(await canViewStyleguide())) notFound();
  return children;
}

/**
 * Vitrina interna (BD-026): en desarrollo y staging se ve siempre, estática y completa sin
 * JavaScript; en producción, solo con sesión de admin (BD-114), y sin ella responde 404. Leer la
 * cookie hace dinámica la vista: solo en producción va dentro de un <Suspense> (con Suspense, el
 * contenido llega oculto hasta que corre el JS). Carga también Baloo 2 para mostrar la
 * tipografía infantil. `contents` no dibuja caja; no le pongas rol, aria-* ni tabIndex.
 */
export default function StyleguideLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${baloo.variable} contents`}>
      {isStyleguideVisible(env.APP_ENV, false) ? (
        children
      ) : (
        <Suspense>
          <StyleguideGate>{children}</StyleguideGate>
        </Suspense>
      )}
    </div>
  );
}
