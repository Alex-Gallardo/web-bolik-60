import { cx } from "class-variance-authority";
import type { ComponentProps } from "react";
import { controlClasses } from "./control-styles";

/** Texto largo (BD-022). Úsalo dentro de Field; crece en alto, nunca en ancho. */
export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cx(controlClasses, "min-h-28 w-full resize-y py-3", className)}
      {...props}
    />
  );
}
