import type { ReactNode } from "react";
import { baloo } from "@/app/fonts";

/**
 * Vitrina interna: carga también Baloo 2 para mostrar la tipografía infantil (el layout de
 * /escuelas hará lo mismo). `contents` no dibuja caja; no le pongas rol, aria-* ni tabIndex.
 */
export default function StyleguideLayout({ children }: { children: ReactNode }) {
  return <div className={`${baloo.variable} contents`}>{children}</div>;
}
