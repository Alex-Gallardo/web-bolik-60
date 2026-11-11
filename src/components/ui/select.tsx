import { cx } from "class-variance-authority";
import type { ComponentProps } from "react";
import { controlClasses, singleLineClasses } from "./control-styles";

type SelectProps = ComponentProps<"select"> & {
  /** Primera opción vacía ("Elige tu departamento"…); el texto lo da quien lo usa. */
  placeholder?: string;
};

/**
 * Lista desplegable nativa (BD-022): accesible, con el selector del sistema en móvil y sin JS
 * extra. Úsalo dentro de Field: id y aria-* llegan al <select>.
 */
export function Select({ className, placeholder, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cx(controlClasses, singleLineClasses, "w-full appearance-none pr-11", className)}
        {...props}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted"
      >
        <path
          d="m5 8 5 5 5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
