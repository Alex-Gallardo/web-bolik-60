import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

/**
 * Estado con color y texto (docs/08 §2, BD-023): nunca solo color. Para el admin (nueva, en
 * proceso, ganada…) y avisos cortos. Fondo claro y texto oscuro de la misma familia (AA).
 * Sin tailwind-merge (ver button.tsx): cada tono fija su fondo y su texto, sin choques.
 */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-soft text-ink",
        info: "bg-blue-50 text-blue-700",
        success: "bg-green-50 text-green",
        // --warning sobre --warning-bg da 4.27:1: el texto va en tinta y el tono lo marca el borde.
        warning: "bg-warning-bg text-ink ring-1 ring-warning ring-inset",
        danger: "bg-red-50 text-red-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type BadgeProps = VariantProps<typeof badgeVariants> & {
  children: ReactNode;
  className?: string;
};

export function Badge({ tone, className, children }: BadgeProps) {
  return <span className={badgeVariants({ tone, className })}>{children}</span>;
}
