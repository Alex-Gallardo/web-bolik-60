import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerProps = ComponentProps<"div"> & {
  /** Etiqueta a dibujar (div por defecto). */
  as?: "div" | "header" | "footer" | "nav" | "main" | "section";
  children: ReactNode;
};

/** Contenedor estándar (docs/08 §1): máximo 1280 px y margen lateral --gutter (mínimo 16 px). */
export function Container({ as: Tag = "div", className, children, ...props }: ContainerProps) {
  return (
    <Tag className={cn("container-site", className)} {...props}>
      {children}
    </Tag>
  );
}
