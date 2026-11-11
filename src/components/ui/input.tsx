import { cx } from "class-variance-authority";
import type { ComponentProps } from "react";
import { controlClasses, singleLineClasses } from "./control-styles";

/** Campo de texto (BD-022). Úsalo dentro de Field; acepta ref (register de React Hook Form). */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cx(controlClasses, singleLineClasses, "w-full", className)}
      {...props}
    />
  );
}
