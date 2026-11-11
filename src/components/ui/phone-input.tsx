"use client";

import { cx } from "class-variance-authority";
import { useId, type ComponentProps, type FocusEvent } from "react";
import { ui } from "@/content/ui";
import { normalizeGtPhone } from "@/lib/format";
import { controlClasses, singleLineClasses } from "./control-styles";
import { joinIds } from "./field";

/**
 * Teléfono de Guatemala (BD-022): prefijo +502 fijo, teclado numérico y, al salir del campo, el
 * número válido se acomoda como "5555 1234" antes de avisar el blur. Con React Hook Form (register)
 * el valor se lee del campo en ese blur. El esquema gtPhone (lib/form-schemas) lo valida y lo guarda
 * en 8 dígitos. Úsalo dentro de Field.
 */
export function PhoneInput({
  id,
  className,
  onBlur,
  "aria-describedby": describedBy,
  ...props
}: ComponentProps<"input">) {
  // El prefijo se anuncia junto con la ayuda y el error que pone Field.
  const fallbackId = useId();
  const prefixId = `${id ?? fallbackId}-prefijo`;

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const digits = normalizeGtPhone(event.currentTarget.value);
    if (digits) event.currentTarget.value = `${digits.slice(0, 4)} ${digits.slice(4)}`;
    onBlur?.(event);
  }

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-muted"
      >
        +502
      </span>
      <span id={prefixId} className="sr-only">
        {ui.phonePrefix}
      </span>
      <input
        id={id}
        aria-describedby={joinIds(prefixId, describedBy)}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className={cx(controlClasses, singleLineClasses, "w-full pl-16", className)}
        onBlur={handleBlur}
        {...props}
      />
    </div>
  );
}
