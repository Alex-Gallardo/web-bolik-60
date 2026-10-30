import type { ReactNode } from "react";
import { baloo } from "@/app/fonts";

/** Vitrina interna: carga también Baloo 2 para mostrar la tipografía infantil. */
export default function StyleguideLayout({ children }: { children: ReactNode }) {
  return <div className={`${baloo.variable} contents`}>{children}</div>;
}
